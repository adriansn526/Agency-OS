import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { generatePdfFromUblXml } from '@/lib/accounting/pdf-generator'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await db.supplierInvoice.findUnique({
      where: { id: params.id },
      select: { xmlData: true, invoiceNumber: true, spvId: true }
    })

    if (!invoice || !invoice.xmlData) {
      return NextResponse.json({ error: 'XML nu a fost găsit pentru această factură' }, { status: 404 })
    }

    const pdfBuffer = await generatePdfFromUblXml(invoice.xmlData, invoice.invoiceNumber || invoice.spvId || params.id)
    const filename = `factura_${invoice.invoiceNumber || invoice.spvId || params.id}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error: any) {
    console.error('[API] Gen PDF XML error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate PDF from XML' }, { status: 500 })
  }
}
