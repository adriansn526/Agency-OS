import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { endOfMonth, startOfMonth, parseISO } from 'date-fns'
import { downloadFromS3 } from '@/lib/storage/s3'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export async function POST(request: NextRequest) {
  try {
    const { month } = await request.json()
    if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

    // Preluare setări
    const settings = await db.accountingSettings.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' }
    })
    
    const accountantEmail = settings?.accountantEmail || process.env.ACCOUNTANT_EMAIL_FALLBACK
    if (!accountantEmail) {
      return NextResponse.json({ error: 'Adresa de email a contabilului nu este setată' }, { status: 400 })
    }

    const startDate = startOfMonth(parseISO(`${month}-01`))
    const endDate = endOfMonth(startDate)

    // Validare stricta pending
    const pendingInvoices = await db.supplierInvoice.count({
      where: { tenantId: tenant.id, issueDate: { gte: startDate, lte: endDate }, extractionStatus: 'pending_review' }
    })
    if (pendingInvoices > 0) return NextResponse.json({ error: 'Nu se poate genera. Există facturi în pending review.' }, { status: 400 })

    // Colectare facturi
    const validInvoices = await db.supplierInvoice.findMany({
      where: { tenantId: tenant.id, issueDate: { gte: startDate, lte: endDate }, extractionStatus: 'confirmed' },
      include: { supplier: true }
    })

    // Colectare extrase unice
    const transactions = await db.bankTransaction.findMany({
      where: { tenantId: tenant.id, date: { gte: startDate, lte: endDate } },
      select: { sourcePdfUrl: true }
    })
    const uniqueStatementUrls = Array.from(new Set(transactions.map(t => t.sourcePdfUrl).filter(Boolean))) as string[]

    if (validInvoices.length === 0 && uniqueStatementUrls.length === 0) {
      return NextResponse.json({ error: 'Nimic de trimis pentru această lună.' }, { status: 400 })
    }

    // Configurare zone temp
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `accounting-${month}-`))
    const zipPath = path.join(tempDir, `Pachet-Contabilitate-${month}.zip`)
    
    // Generăm CSV
    let csvContent = 'Furnizor,Data,Numar,Suma\n'
    let total = 0
    
    const output = fs.createWriteStream(zipPath)
    const archiver = eval("require('archiver')")
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    const zipPromise = new Promise((resolve, reject) => {
      output.on('close', () => resolve(true))
      archive.on('error', reject)
    })
    
    archive.pipe(output)

    try {
      // 1. Download & add invoices
      for (const inv of validInvoices) {
        const supName = inv.supplier?.name || inv.extractedSupplierName || 'Necunoscut'
        csvContent += `"${supName}","${inv.issueDate.toISOString().split('T')[0]}","${inv.invoiceNumber}","${inv.amount}"\n`
        total += Number(inv.amount)
        
        if (inv.pdfUrl) {
          const localPdf = path.join(tempDir, `inv_${inv.id}.pdf`)
          // Daca pdfUrl nu este o cheie valida pt aws-sdk (ex. mock v2), downloadFromS3 va crapa, asa ca folosim try/catch local
          try {
             await downloadFromS3(inv.pdfUrl, localPdf)
             archive.file(localPdf, { name: `Facturi/${supName.replace(/[^a-z0-9]/gi, '_')}_${inv.invoiceNumber}.pdf` })
          } catch(err) {
             console.error(`S3 Download failed pt factura ${inv.id} key: ${inv.pdfUrl}`, err)
          }
        }
      }
      csvContent += `\nTOTAL,,,${total}\n`
      archive.append(csvContent, { name: 'index.csv' })

      // 2. Download & add statements
      for (let i = 0; i < uniqueStatementUrls.length; i++) {
        const localStmt = path.join(tempDir, `stmt_${i}.pdf`)
         try {
           const stmtUrl = uniqueStatementUrls[i]
           if (stmtUrl) {
             await downloadFromS3(stmtUrl, localStmt)
             archive.file(localStmt, { name: `Extras-Cont/extras_${i+1}.pdf` })
           }
        } catch(err) {
           console.error(`S3 Download failed pt extras ${uniqueStatementUrls[i]}`, err)
        }
      }

      await archive.finalize()
      await zipPromise

      // TRIMITERE EMAIL (SMTP)
      const nodemailer = eval("require('nodemailer')")
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
        },
      })

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: accountantEmail,
        subject: `Pachet Contabilitate - ${month}`,
        text: `Salut,\n\nAtașat găsești pachetul contabil pentru luna ${month}.\nAcesta conține ${validInvoices.length} facturi și ${uniqueStatementUrls.length} extrase de cont.\n\nGenerat automat.`,
        attachments: [
          {
            filename: `Pachet-Contabilitate-${month}.zip`,
            path: zipPath,
            contentType: 'application/zip'
          }
        ]
      }

      await transporter.sendMail(mailOptions)

      // Salvam log
      await db.accountingPackage.create({
        data: {
          tenantId: tenant.id,
          month,
          sentBy: 'user-session-id', // ideal din context (clerk/next-auth)
          invoiceCount: validInvoices.length,
          totalAmount: total,
          status: 'sent'
        }
      })

      return NextResponse.json({ success: true })
    } finally {
      // CURĂȚARE GARANTATĂ - ștergem folderul temporar
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  } catch (error) {
    console.error('[AccountingSend]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
