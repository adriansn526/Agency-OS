import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/offers/next-number ───
// Returnează următorul număr disponibil (OF-{YEAR}-{SEQ})
export async function GET(_request: NextRequest) {
  try {
    const year = new Date().getFullYear()
    const prefix = `OF-${year}`
    const last = await db.offer.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
    })
    const seq = last ? parseInt(last.number.split('-')[2]!) + 1 : 1
    const nextNumber = `${prefix}-${String(seq).padStart(3, '0')}`

    return NextResponse.json({ nextNumber, year, sequence: seq })
  } catch (error) {
    console.error('[API] GET /api/offers/next-number error:', error)
    return NextResponse.json(
      { error: 'Failed to generate next offer number' },
      { status: 500 }
    )
  }
}
