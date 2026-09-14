import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updated = await db.supplierInvoice.update({
      where: { id: params.id },
      data: {
        extractionStatus: 'rejected',
      }
    })

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('[API] Failed to reject invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
