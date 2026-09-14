import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { extractInvoiceData, parsePdfToText } from '@/lib/invoices/parser'
import { uploadToS3 } from '@/lib/storage/s3'

// Pentru a rula mock-ul (PDF fake buffer)
const mockPdfBuffer = Buffer.from('PDF_FAKE_CONTENT_MOCK_123')

export async function POST(request: NextRequest) {
  // Securitate absolută pentru endpoint de mock
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint not available in production' }, { status: 403 })
  }

  try {
    // 1. Preluăm datele de test
    const { messageId, sender, pdfBase64, overrideText } = await request.json()
    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })
    }

    // 2. Deduplicare pe sourceRef
    const existing = await db.supplierInvoice.findFirst({
      where: { sourceRef: messageId }
    })
    
    if (existing) {
      return NextResponse.json({ message: 'Already ingested', skipped: true })
    }

    // 3. Extragere text (mocked text or via pdfParse)
    let textToParse = overrideText
    if (!textToParse) {
       textToParse = await parsePdfToText(pdfBase64 ? Buffer.from(pdfBase64, 'base64') : mockPdfBuffer)
    }

    // 4. Parcurgem prin Zod/LLM
    const { data, error } = await extractInvoiceData(textToParse)

    // Setăm tenant-ul de test pt inserție
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'No tenant available for mock' }, { status: 500 })

    // 5. Salvare în baza de date
    // Dacă LLM failed (sau OCR fallback a dat return), invoice intră orfan
    
    // Încărcăm pe S3 (storage privat real)
    const pdfBufferToUpload = pdfBase64 ? Buffer.from(pdfBase64, 'base64') : mockPdfBuffer
    const s3Key = `invoices/${tenant.id}/${Date.now()}-${messageId.replace(/[^a-z0-9]/gi, '_')}.pdf`
    await uploadToS3(s3Key, pdfBufferToUpload)

    if (!data || error === 'OCR_FALLBACK_REQUIRED') {
      const saved = await db.supplierInvoice.create({
        data: {
          tenantId: tenant.id,
          amount: 0,
          currency: 'RON',
          issueDate: new Date(),
          pdfUrl: s3Key, // Stocare R2/S3
          source: 'email',
          sourceRef: messageId,
          extractionStatus: 'pending_review',
          extractedBy: 'human' // necesită verificare umană
        }
      })
      return NextResponse.json({ success: true, saved, status: 'OCR_FALLBACK' })
    }

    // 6. Fuzzy Matching pentru a găsi Furnizorul (Supplier)
    const matchedSupplier = await db.supplier.findFirst({
      where: { 
        tenantId: tenant.id,
        name: { contains: data.supplierName.substring(0, 5), mode: 'insensitive' }
      }
    })

    // 7. Salvăm factura "pending_review" cu sau fără supplier găsit
    const saved = await db.supplierInvoice.create({
      data: {
        tenantId: tenant.id,
        supplierId: matchedSupplier?.id || null, // Poate fi null (orfană)
        extractedSupplierName: matchedSupplier ? null : data.supplierName,
        amount: data.amount,
        currency: data.currency,
        issueDate: new Date(data.issueDate),
        invoiceNumber: data.invoiceNumber,
        pdfUrl: s3Key, // R2/S3
        source: 'email',
        sourceRef: messageId,
        extractionStatus: 'pending_review',
        extractedBy: 'llm'
      }
    })

    return NextResponse.json({ success: true, saved, matchedSupplier: !!matchedSupplier })

  } catch (error) {
    console.error('[Ingest] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
