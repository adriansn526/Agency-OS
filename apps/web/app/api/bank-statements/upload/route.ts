import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { parsePdfForAccount } from '@/lib/bank/parser'
import { extractTransactionsFromText } from '@/lib/bank/llm-extractor'
import { uploadToS3 } from '@/lib/storage/s3'
import { Decimal } from 'decimal.js'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Fisierul este necesar' }, { status: 400 })
    }

    let tenant;
    try {
      tenant = await db.tenantInstance.findFirst()
    } catch (e: any) {
      return NextResponse.json({ error: 'Eroare Prisma query: ' + e.message }, { status: 400 })
    }

    if (!tenant) {
      const count = await db.tenantInstance.count().catch(e => -1)
      return NextResponse.json({ 
        error: `Fără tenant valid. DB Count: ${count}` 
      }, { status: 400 })
    }

    // Găsim conexiunea bancară configurată pentru parolă și IBAN (simulată/presupusă aici cu primul găsit)
    const bankConnection = await db.bankConnection.findFirst({ where: { tenantId: tenant.id } })
    
    if (!bankConnection || !bankConnection.statementPasswordEnvKey || !bankConnection.accountIban) {
      return NextResponse.json({ error: 'Configurație bancară lipsă pentru tenant' }, { status: 400 })
    }

    let password = '';
    if (bankConnection.statementPasswordEnvKey) {
      password = process.env[bankConnection.statementPasswordEnvKey] || '';
    }

    // 1. Decriptare (doar dacă avem o parolă configurată în sistem)
    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // 2. Parsare și partiționare IBAN
    let textChunk = ''
    try {
      // Pass original encrypted buffer and password to pdftotext
      textChunk = await parsePdfForAccount(inputBuffer, bankConnection.accountIban, password)
    } catch (e: any) {
      // Regex failed or pdftotext failed (incorrect password)
      console.error('[UploadBankStatement] Eroare la parsare:', e);
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    // 3. Extracție LLM
    const transactions = await extractTransactionsFromText(textChunk)
    if (!transactions.length) {
      return NextResponse.json({ error: 'Nu s-au putut extrage tranzacții din textul contului' }, { status: 400 })
    }

    let savedCount = 0
    let autoMatchedCount = 0

    // 4. Încarcă pe S3 PDF-ul original O SINGURĂ DATĂ
    const s3Key = `bank-statements/${tenant.id}/${Date.now()}-statement.pdf`
    await uploadToS3(s3Key, inputBuffer)

    // 5. Inserție și Auto-Matching
    for (const trx of transactions) {
      // Verificare duplicat exact
      const debitValue = trx.type === 'debit' ? trx.amount : 0
      const creditValue = trx.type === 'credit' ? trx.amount : 0
      
      const existing = await db.bankTransaction.findFirst({
        where: {
          tenantId: tenant.id,
          bankConnectionId: bankConnection.id,
          date: new Date(trx.date),
          description: trx.description,
          debit: debitValue,
          credit: creditValue
        }
      })

      if (existing) {
        continue // Sărim peste tranzacția dublată
      }

      // Logică de încredere / Categorie
      const isSupplierPayment = trx.category === 'supplier_payment'
      let extractionStatus = 'confirmed'
      let matchedSupplierId = null
      let matchedInvoiceId = null
      let matchStatus = 'unmatched'

      // Găsire furnizor prin Fuzzy Match simplu (dacă scorul LLM e decent)
      if (isSupplierPayment && trx.confidence > 80 && trx.merchantName) {
         const supplier = await db.supplier.findFirst({
           where: {
             tenantId: tenant.id,
             name: { contains: trx.merchantName.substring(0, 5), mode: 'insensitive' }
           }
         })

         if (supplier) {
           matchedSupplierId = supplier.id

           // Auto-Matching Criteriu Dublu: Diferența Sumă <= 1 & Diferența Dată <= 30 zile
           // Factura trebuie să fie unpaid
           const unpaidInvoices = await db.supplierInvoice.findMany({
             where: {
               tenantId: tenant.id,
               supplierId: supplier.id,
               status: { in: ['unpaid', 'overdue'] }
             }
           })

           // Filtrăm facturile candidat
           const trxAmount = new Decimal(trx.amount)
           const trxDate = new Date(trx.date)

           const candidates = unpaidInvoices.filter(inv => {
             const invAmount = new Decimal(inv.amount)
             const diffAmount = invAmount.minus(trxAmount).abs()
             
             // Diferență zile
             const invDate = new Date(inv.issueDate)
             const diffTime = Math.abs(trxDate.getTime() - invDate.getTime())
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

              // Auto-match DOAR la potrivire exactă de sumă + proximitate dată (max 60 zile)
              return diffAmount.equals(0) && diffDays <= 60
           })

            if (candidates.length === 1 && candidates[0]) {
              // Match perfect unic
              matchedInvoiceId = candidates[0].id
             matchStatus = 'auto_matched'
             
             // Update Invoice -> paid
             await db.supplierInvoice.update({
               where: { id: matchedInvoiceId },
               data: { status: 'paid' }
             })
           } else if (candidates.length > 1) {
             // Match multiplu -> Conflict! Trimite la manual review
             extractionStatus = 'pending_review'
           }
         } else {
           // Categorie supplier_payment dar furnizor negăsit -> pending_review
           extractionStatus = 'pending_review'
         }
      } else if (isSupplierPayment) {
         // Confidence mic
         extractionStatus = 'pending_review'
      }

      // Salvare în baza de date
      await db.bankTransaction.create({
        data: {
          tenantId: tenant.id,
          bankConnectionId: bankConnection.id,
          date: new Date(trx.date),
          description: trx.description,
          debit: trx.type === 'debit' ? trx.amount : 0,
          credit: trx.type === 'credit' ? trx.amount : 0,
          category: trx.category,
          extractedMerchant: trx.merchantName || null,
          matchedSupplierId,
          matchedInvoiceId,
          matchStatus,
          extractionStatus,
          sourcePdfUrl: s3Key // upload real S3
        }
      })
      
      savedCount++
      if (matchStatus === 'auto_matched') autoMatchedCount++
    }

    return NextResponse.json({ success: true, savedCount, autoMatchedCount })

  } catch (error) {
    console.error('[UploadBankStatement] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
