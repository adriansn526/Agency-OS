import { NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/settings/business-lines ───
// Returns all active business lines
export async function GET() {
  try {
    const businessLines = await db.businessLine.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })

    return NextResponse.json({ data: businessLines })
  } catch (error) {
    console.error('[API] GET /api/settings/business-lines error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business lines' },
      { status: 500 }
    )
  }
}
