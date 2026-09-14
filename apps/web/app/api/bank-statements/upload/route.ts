import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { decryptPdf } from '@/lib/bank/decrypt'
import { parsePdfForAccount } from '@/lib/bank/parser'
import { extractTransactionsFromText } from '@/lib/bank/llm-extractor'
import { Decimal } from 'decimal.js'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Fisierul este necesar' }, { status: 400 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Fără tenant valid' }, { status: 400 })

    // Găsim conexiunea bancară configurată pentru parolă și IBAN (simulată/presupusă aici cu primul găsit)
    const bankConnection = await db.bankConnection.findFirst({ where: { tenantId: tenant.id } })
    
    if (!bankConnection || !bankConnection.statementPasswordEnvKey || !bankConnection.accountIban) {
      return NextResponse.json({ error: 'Configurație bancară lipsă pentru tenant' }, { status: 400 })
    }

    const password = process.env[bankConnection.statementPasswordEnvKey]
    if (!password) {
       return NextResponse.json({ error: 'Parola nu este setată în environment' }, { status: 500 })
    }

    // 1. Decriptare
    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)
    let decryptedBuffer: Buffer
    
    try {
      decryptedBuffer = await decryptPdf(inputBuffer, password)
    } catch (e) {
      return NextResponse.json({ error: 'Eroare decriptare (parolă invalidă sau PDF corupt)' }, { status: 400 })
    }

    // 2. Parsare și partiționare IBAN
    let textChunk = ''
    try {
      textChunk = await parsePdfForAccount(decryptedBuffer, bankConnection.accountIban)
    } catch (e: any) {
      // Regex failed to find the configured IBAN section
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    // 3. Extracție LLM
    const transactions = await extractTransactionsFromText(textChunk)
    if (!transactions.length) {
      return NextResponse.json({ error: 'Nu s-au putut extrage tranzacții din textul contului' }, { status: 400 })
    }

    let savedCount = 0
    let autoMatchedCount = 0

    // 4. Inserție și Auto-Matching
    for (const trx of transactions) {
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

             return diffAmount.lessThanOrEqualTo(1) && diffDays <= 30
           })

           if (candidates.length === 1) {
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
          sourcePdfUrl: 'upload-mock-url.pdf' // în prod: upload S3 URL real
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
