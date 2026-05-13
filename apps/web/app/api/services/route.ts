import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// GET /api/services — list service templates, optionally filtered by businessLineId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessLineId = searchParams.get('businessLineId')
    const businessLineSlug = searchParams.get('businessLine')
    const activeOnly = searchParams.get('active') !== 'false'

    const where: any = {}
    if (activeOnly) where.isActive = true

    if (businessLineId) {
      where.businessLineId = businessLineId
    } else if (businessLineSlug) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
      if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })
      where.businessLineId = bl.id
    }

    const services = await db.serviceTemplate.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { businessLine: { select: { slug: true, name: true, color: true } } },
    })

    return NextResponse.json({ data: services })
  } catch (error) {
    console.error('GET /api/services error:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

// POST /api/services — create a new service template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessLineSlug, ...data } = body

    // Resolve business line
    if (businessLineSlug && !data.businessLineId) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
      if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })
      data.businessLineId = bl.id
    }

    if (!data.businessLineId || !data.name || !data.shortName || !data.category || data.defaultPrice == null || !data.pricingUnit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const service = await db.serviceTemplate.create({ data })
    return NextResponse.json({ data: service }, { status: 201 })
  } catch (error) {
    console.error('POST /api/services error:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
