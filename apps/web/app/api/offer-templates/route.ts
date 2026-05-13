import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// GET /api/offer-templates — list, optionally filtered by businessLineId
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

    const templates = await db.offerTemplate.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { businessLine: { select: { slug: true, name: true, color: true } } },
    })

    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error('GET /api/offer-templates error:', error)
    return NextResponse.json({ error: 'Failed to fetch offer templates' }, { status: 500 })
  }
}

// POST /api/offer-templates — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessLineSlug, ...data } = body

    if (businessLineSlug && !data.businessLineId) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
      if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })
      data.businessLineId = bl.id
    }

    if (!data.businessLineId || !data.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const template = await db.offerTemplate.create({ data })
    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error('POST /api/offer-templates error:', error)
    return NextResponse.json({ error: 'Failed to create offer template' }, { status: 500 })
  }
}
