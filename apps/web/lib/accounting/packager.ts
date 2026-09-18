import { db } from '@repo/db'
import { endOfMonth, startOfMonth, parseISO } from 'date-fns'
import { downloadFromS3 } from '@/lib/storage/s3'
import { ZipArchive } from 'archiver'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import nodemailer from 'nodemailer'

export async function generateAndSendAccountingPackage({
  tenantId,
  month,
  skipValidation = false,
  sentBy = 'system'
}: {
  tenantId: string
  month: string
  skipValidation?: boolean
  sentBy?: string
}) {
  const settings = await db.accountingSettings.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  })
  
  const accountantEmail = settings?.accountantEmail || process.env.ACCOUNTANT_EMAIL_FALLBACK
  if (!accountantEmail) {
    throw new Error('Adresa de email a contabilului nu este setată')
  }

  const startDate = startOfMonth(parseISO(`${month}-01`))
  const endDate = endOfMonth(startDate)

  // Validare stricta pending (dacă nu e ignorată de cron)
  if (!skipValidation) {
    const pendingInvoices = await db.supplierInvoice.count({
      where: { tenantId, issueDate: { gte: startDate, lte: endDate }, extractionStatus: 'pending_review' }
    })
    if (pendingInvoices > 0) {
      throw new Error('Nu se poate genera. Există facturi în pending review.')
    }
  }

  // Colectare facturi
  const validInvoices = await db.supplierInvoice.findMany({
    where: { tenantId, issueDate: { gte: startDate, lte: endDate }, extractionStatus: 'confirmed' },
    include: { supplier: true }
  })

  // Colectare extrase unice si parole
  const transactions = await db.bankTransaction.findMany({
    where: { tenantId, date: { gte: startDate, lte: endDate } },
    select: { sourcePdfUrl: true, bankConnectionId: true }
  })
  
  const bankConns = await db.bankConnection.findMany({ where: { tenantId } })
  const bankPasswords = new Map()
  for (const bc of bankConns) {
    if (bc.statementPasswordEnvKey) {
       bankPasswords.set(bc.id, process.env[bc.statementPasswordEnvKey] || '')
    }
  }

  const statementMap = new Map<string, string>()
  for (const t of transactions) {
    if (t.sourcePdfUrl) {
       const pwd = t.bankConnectionId ? (bankPasswords.get(t.bankConnectionId) || '') : ''
       statementMap.set(t.sourcePdfUrl, pwd)
    }
  }
  const uniqueStatements = Array.from(statementMap.entries())

  if (validInvoices.length === 0 && uniqueStatements.length === 0) {
    throw new Error('Nimic de trimis pentru această lună.')
  }

  // Configurare zone temp
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `accounting-${month}-`))
  const zipPath = path.join(tempDir, `Documente-Financiare-${month}.zip`)
  
  let csvContent = 'Furnizor,Data,Numar,Suma\n'
  let total = 0
  
  const output = fs.createWriteStream(zipPath)
  const archive = new ZipArchive({ zlib: { level: 9 } })
  
  const zipPromise = new Promise((resolve, reject) => {
    output.on('close', () => resolve(true))
    archive.on('error', reject)
  })
  
  archive.pipe(output)

  try {
    for (const inv of validInvoices) {
      const supName = inv.supplier?.name || inv.extractedSupplierName || 'Necunoscut'
      csvContent += `"${supName}","${inv.issueDate.toISOString().split('T')[0]}","${inv.invoiceNumber}","${inv.amount}"\n`
      total += Number(inv.amount)
      
      if (inv.pdfUrl) {
        const localPdf = path.join(tempDir, `inv_${inv.id}.pdf`)
        try {
           await downloadFromS3(inv.pdfUrl, localPdf)
           archive.file(localPdf, { name: `Facturi/${supName.replace(/[^a-z0-9]/gi, '_')}_${inv.invoiceNumber}.pdf` })
        } catch(err) {
           console.error(`S3 Download failed pt factura ${inv.id} key: ${inv.pdfUrl}`, err)
        }
      }

      if (inv.xmlData) {
         const supNameClean = supName.replace(/[^a-z0-9]/gi, '_');
         const invNameClean = inv.invoiceNumber ? inv.invoiceNumber.replace(/[^a-z0-9]/gi, '_') : inv.id;
         archive.append(inv.xmlData, { name: `e-Factura-XML/${supNameClean}_${invNameClean}.xml` });
      }
    }
    csvContent += `\nTOTAL,,,${total}\n`
    archive.append(csvContent, { name: 'index.csv' })

    const exec = require('util').promisify(require('child_process').exec)
    for (let i = 0; i < uniqueStatements.length; i++) {
      const stmtInfo = uniqueStatements[i]
      if (!stmtInfo) continue
      const [stmtUrl, pwd] = stmtInfo
      const localStmt = path.join(tempDir, `stmt_${i}.pdf`)
      const decryptedStmt = path.join(tempDir, `decrypted_${i}.pdf`)
       try {
         if (stmtUrl) {
           await downloadFromS3(stmtUrl, localStmt)
           if (pwd) {
             try {
               await exec(`qpdf --password="${pwd}" --decrypt "${localStmt}" "${decryptedStmt}"`)
               archive.file(decryptedStmt, { name: `Extras-Cont/extras_${i+1}.pdf` })
             } catch(e) {
               console.error(`Eroare decriptare qpdf pentru ${stmtUrl}`, e)
               archive.file(localStmt, { name: `Extras-Cont/extras_${i+1}.pdf` })
             }
           } else {
             archive.file(localStmt, { name: `Extras-Cont/extras_${i+1}.pdf` })
           }
         }
      } catch(err) {
         console.error(`S3 Download failed pt extras ${stmtUrl}`, err)
      }
    }

    await archive.finalize()
    await zipPromise

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const statementText = uniqueStatements.length === 1 ? '1 extras de cont' : `${uniqueStatements.length} extrase de cont`

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: accountantEmail,
      subject: `Documente Financiare - ${month}${skipValidation ? ' (Auto-Trimis)' : ''}`,
      text: `Salut,\n\nAtașat găsești documentele financiare pentru luna ${month}.\nAcestea conțin ${validInvoices.length} facturi (dintre care cele e-Factura sunt incluse în format XML) și ${statementText}.\n\nGenerat automat.`,
      attachments: [
        {
          filename: `Documente-Financiare-${month}.zip`,
          path: zipPath,
          contentType: 'application/zip'
        }
      ]
    }

    await transporter.sendMail(mailOptions)

    await db.accountingPackage.create({
      data: {
        tenantId,
        month,
        sentBy,
        invoiceCount: validInvoices.length,
        totalAmount: total,
        status: 'sent'
      }
    })

    return { success: true, validInvoices: validInvoices.length, statements: uniqueStatements.length }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}
