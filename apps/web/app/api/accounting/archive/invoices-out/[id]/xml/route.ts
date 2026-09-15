import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: params.id },
      select: { xmlData: true, number: true }
    })

    if (!invoice || !invoice.xmlData) {
      return NextResponse.json({ error: 'XML not found for this invoice' }, { status: 404 })
    }

    const filename = `factura_${invoice.number || params.id}.xml`

    return new NextResponse(invoice.xmlData, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('[API] Download XML error:', error)
    return NextResponse.json({ error: 'Failed to download XML' }, { status: 500 })
  }
}
