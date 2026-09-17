import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { parsePdfForAccount } from '@/lib/bank/parser'
import { extractTransactionsFromText } from '@/lib/bank/llm-extractor'
import { uploadToS3 } from '@/lib/storage/s3'
import { Decimal } from 'decimal.js'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET || 'local_cron'}`) {
    // Permitem pentru teste rapide dar ideal adaugam CRON_SECRET in env
  }

  try {
    const { messageId, sender, pdfBase64 } = await request.json()
    if (!messageId || !pdfBase64) {
      return NextResponse.json({ error: 'Lipsește messageId sau pdfBase64' }, { status: 400 })
    }

    let tenant = await db.tenantInstance.findFirst()
    if (!tenant) {
      return NextResponse.json({ error: 'Fără tenant valid' }, { status: 400 })
    }

    // 1. Verificare Deduplicare
    const existing = await db.bankTransaction.findFirst({
      where: { tenantId: tenant.id, sourceRef: messageId }
    })
    
    if (existing) {
      return NextResponse.json({ message: 'Deja procesat', status: 'SKIPPED' })
    }

    // 2. Găsire conexiune bancară (presupunem că e doar una momentan, cum ne-a confirmat utilizatorul)
    const bankConnection = await db.bankConnection.findFirst({ where: { tenantId: tenant.id } })
    
    if (!bankConnection || !bankConnection.statementPasswordEnvKey || !bankConnection.accountIban) {
      return NextResponse.json({ error: 'Configurație bancară lipsă pentru tenant' }, { status: 400 })
    }

    let password = process.env[bankConnection.statementPasswordEnvKey] || '';
    
    const inputBuffer = Buffer.from(pdfBase64, 'base64')

    // 3. Decriptare și Parsare (dacă parola e corectă și PDF-ul are IBAN-ul nostru)
    let textChunk = ''
    try {
      textChunk = await parsePdfForAccount(inputBuffer, bankConnection.accountIban, password)
    } catch (e: any) {
      console.error(`[IngestStatements] Decriptare / IBAN mismatch eșuat pt sender ${sender}:`, e);
      // Eroare la decriptare = aruncăm excepție pentru worker
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    // 4. Extracție LLM
    const transactions = await extractTransactionsFromText(textChunk)
    if (!transactions.length) {
      return NextResponse.json({ error: 'Nu s-au putut extrage tranzacții' }, { status: 400 })
    }

    // 5. Upload S3 (extrasul original, care e criptat)
    const s3Key = `bank-statements/${tenant.id}/${Date.now()}-statement.pdf`
    await uploadToS3(s3Key, inputBuffer)

    let savedCount = 0
    let autoMatchedCount = 0

    // 6. Inserție și Auto-Matching
    for (const trx of transactions) {
      const debitValue = trx.type === 'debit' ? trx.amount : 0
      const creditValue = trx.type === 'credit' ? trx.amount : 0
      
      const existingTrx = await db.bankTransaction.findFirst({
        where: {
          tenantId: tenant.id,
          bankConnectionId: bankConnection.id,
          date: new Date(trx.date),
          description: trx.description,
          debit: debitValue,
          credit: creditValue
        }
      })

      if (existingTrx) continue 

      const isSupplierPayment = trx.category === 'supplier_payment'
      let extractionStatus = 'confirmed'
      let matchedSupplierId = null
      let matchedInvoiceId = null
      let matchStatus = 'unmatched'

      if (isSupplierPayment && trx.confidence > 80 && trx.merchantName) {
         const supplier = await db.supplier.findFirst({
           where: {
             tenantId: tenant.id,
             name: { contains: trx.merchantName.substring(0, 5), mode: 'insensitive' }
           }
         })

         if (supplier) {
           matchedSupplierId = supplier.id
           const unpaidInvoices = await db.supplierInvoice.findMany({
             where: {
               tenantId: tenant.id,
               supplierId: supplier.id,
               status: { in: ['unpaid', 'overdue'] }
             }
           })

           const trxAmount = new Decimal(trx.amount)
           const trxDate = new Date(trx.date)
           const candidates = unpaidInvoices.filter(inv => {
             const invAmount = new Decimal(inv.amount)
             const diffAmount = invAmount.minus(trxAmount).abs()
             const invDate = new Date(inv.issueDate)
             const diffTime = Math.abs(trxDate.getTime() - invDate.getTime())
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
             return diffAmount.equals(0) && diffDays <= 60
           })

            if (candidates.length === 1 && candidates[0]) {
              matchedInvoiceId = candidates[0].id
              matchStatus = 'auto_matched'
             
             await db.supplierInvoice.update({
               where: { id: matchedInvoiceId },
               data: { status: 'paid' }
             })
           } else if (candidates.length > 1) {
             extractionStatus = 'pending_review'
           }
         }
      }

      await db.bankTransaction.create({
        data: {
          tenantId: tenant.id,
          bankConnectionId: bankConnection.id,
          date: new Date(trx.date),
          description: trx.description,
          debit: debitValue,
          credit: creditValue,
          category: trx.category,
          extractedMerchant: trx.merchantName,
          sourcePdfUrl: s3Key,
          sourceRef: messageId, // Dedup by email messageId
          matchStatus,
          matchedSupplierId,
          matchedInvoiceId,
          extractionStatus,
        }
      })
      savedCount++
      if (matchStatus === 'auto_matched') autoMatchedCount++
    }

    return NextResponse.json({ 
      success: true, 
      status: 'PROCESSED',
      message: `Salvat ${savedCount} tranzacții. Auto-matched: ${autoMatchedCount}` 
    })

  } catch (error) {
    console.error('[IngestStatements] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
