import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { readSettings } from '../../settings/_store'

// ─── GET /api/contracts/next-number ───
// Returnează următorul număr de contract per business line
// Query: ?businessLine=agency
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const businessLine = searchParams.get('businessLine')

    if (!businessLine) {
      return NextResponse.json(
        { error: 'Query parameter "businessLine" is required' },
        { status: 400 }
      )
    }

    // Verify BL exists
    const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
    if (!bl) {
      return NextResponse.json(
        { error: `Business line "${businessLine}" not found` },
        { status: 404 }
      )
    }

    // Read settings
    const settings = readSettings()
    const numbering = settings.contracts.numbering[businessLine]

    let nextNumber: string

    if (numbering) {
      nextNumber = `${numbering.prefix}-${numbering.year}-${String(numbering.nextNumber).padStart(3, '0')}`
    } else {
      // Fallback: generate from DB
      const year = new Date().getFullYear()
      const last = await db.contract.findFirst({
        where: { number: { startsWith: `ASNS-${year}` } },
        orderBy: { number: 'desc' },
      })
      const seq = last ? parseInt(last.number.split('-')[2]!) + 1 : 1
      nextNumber = `ASNS-${year}-${String(seq).padStart(3, '0')}`
    }

    return NextResponse.json({
      data: {
        businessLine,
        nextNumber,
        prefix: numbering?.prefix ?? 'ASNS',
        year: numbering?.year ?? new Date().getFullYear(),
      },
    })
  } catch (error) {
    console.error('[API] GET /api/contracts/next-number error:', error)
    return NextResponse.json(
      { error: 'Failed to get next contract number' },
      { status: 500 }
    )
  }
}
