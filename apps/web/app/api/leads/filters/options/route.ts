import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const businessLineId = searchParams.get('businessLineId')

    if (!businessLineId) {
      return NextResponse.json({ error: 'Missing businessLineId' }, { status: 400 })
    }

    // Get unique status values
    const statuses = await db.lead.findMany({
      where: { businessLineId },
      select: { status: true },
      distinct: ['status']
    })

    // Get unique source values
    const sources = await db.lead.findMany({
      where: { businessLineId, source: { not: null } },
      select: { source: true },
      distinct: ['source']
    })

    // Get unique industry values
    const industries = await db.lead.findMany({
      where: { businessLineId, industry: { not: null } },
      select: { industry: true },
      distinct: ['industry']
    })

    return NextResponse.json({
      status: statuses.map(s => s.status).filter(Boolean),
      source: sources.map(s => s.source).filter(Boolean),
      industry: industries.map(s => s.industry).filter(Boolean)
    })
  } catch (error) {
    console.error('Error fetching filter options:', error)
    return NextResponse.json({ error: 'Failed to fetch filter options' }, { status: 500 })
  }
}
