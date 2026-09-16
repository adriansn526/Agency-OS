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
    const { messageId, sender, pdfBase64, receiptPdfBase64, isOnlyReceipt, overrideText } = await request.json()
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

    let receiptS3Key = null
    if (receiptPdfBase64) {
      const receiptBuffer = Buffer.from(receiptPdfBase64, 'base64')
      receiptS3Key = `invoices/${tenant.id}/receipt-${Date.now()}-${messageId.replace(/[^a-z0-9]/gi, '_')}.pdf`
      await uploadToS3(receiptS3Key, receiptBuffer)
    }

    const finalStatus = isOnlyReceipt ? 'missing_invoice' : 'pending_review'

    if (!data || error === 'OCR_FALLBACK_REQUIRED') {
      const saved = await db.supplierInvoice.create({
        data: {
          tenantId: tenant.id,
          amount: 0,
          currency: 'RON',
          issueDate: new Date(),
          pdfUrl: s3Key, 
          receiptUrl: receiptS3Key,
          source: 'email',
          sourceRef: messageId,
          extractionStatus: finalStatus,
          extractedBy: 'human' 
        }
      })
      return NextResponse.json({ success: true, saved, status: 'OCR_FALLBACK' })
    }

    // 6. Determinist Matching by Sender Email, then Fuzzy Matching by Name
    let matchedSupplier = null;
    
    if (sender) {
      matchedSupplier = await db.supplier.findFirst({
        where: {
          tenantId: tenant.id,
          invoiceSenderEmails: { has: sender }
        }
      });
    }

    if (!matchedSupplier && data.supplierName) {
      matchedSupplier = await db.supplier.findFirst({
        where: { 
          tenantId: tenant.id,
          name: { contains: data.supplierName.substring(0, 5), mode: 'insensitive' }
        }
      });
    }

    // 7. Dedup inteligent: Dacă intră factură nouă și există deja o chitanță orfană
    if (!isOnlyReceipt && data.amount > 0) {
      const issueDate = new Date(data.issueDate)
      const startDate = new Date(issueDate)
      startDate.setDate(startDate.getDate() - 14)
      const endDate = new Date(issueDate)
      endDate.setDate(endDate.getDate() + 14)

      const orphanReceipt = await db.supplierInvoice.findFirst({
        where: {
          tenantId: tenant.id,
          extractionStatus: 'missing_invoice',
          supplierId: matchedSupplier?.id || undefined,
          amount: data.amount,
          issueDate: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { issueDate: 'desc' }
      })

      if (orphanReceipt) {
        // Am găsit chitanța! O completăm cu factura nouă
        const updated = await db.supplierInvoice.update({
          where: { id: orphanReceipt.id },
          data: {
            pdfUrl: s3Key, // suprascriem pdfUrl (care era chitanța provizoriu) cu factura reală
            receiptUrl: orphanReceipt.pdfUrl, // mutăm vechiul PDF la receiptUrl
            extractionStatus: 'pending_review', // O trimitem la validare
            invoiceNumber: data.invoiceNumber || orphanReceipt.invoiceNumber,
            sourceRef: messageId // Actualizăm cu noul messageId
          }
        })
        return NextResponse.json({ success: true, saved: updated, matchedSupplier: !!matchedSupplier, status: 'MERGED_WITH_RECEIPT' })
      }
    }

    // 8. Salvăm factura/chitanța nouă
    const saved = await db.supplierInvoice.create({
      data: {
        tenantId: tenant.id,
        supplierId: matchedSupplier?.id || null, 
        extractedSupplierName: matchedSupplier ? null : data.supplierName,
        amount: data.amount,
        currency: data.currency,
        issueDate: new Date(data.issueDate),
        invoiceNumber: data.invoiceNumber,
        pdfUrl: s3Key, 
        receiptUrl: receiptS3Key,
        source: 'email',
        sourceRef: messageId,
        extractionStatus: finalStatus,
        extractedBy: 'llm'
      }
    })

    return NextResponse.json({ success: true, saved, matchedSupplier: !!matchedSupplier })

  } catch (error) {
    console.error('[Ingest] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
