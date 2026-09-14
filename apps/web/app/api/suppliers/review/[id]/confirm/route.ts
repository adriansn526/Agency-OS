import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    
    // Asociază cu supplierId dat și mută în confirmed
    const updated = await db.supplierInvoice.update({
      where: { id: params.id },
      data: {
        supplierId: data.supplierId, // Aici se asociază factura "orfană" cu furnizorul
        extractionStatus: 'confirmed',
      }
    })

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('[API] Failed to confirm invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
