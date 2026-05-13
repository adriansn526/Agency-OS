import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/clients ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessLine = searchParams.get('businessLine')
    const entityType = searchParams.get('entityType')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') || 'desc'

    const where: Record<string, unknown> = {}
    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) where.businessLineId = bl.id
    }
    if (entityType) where.entityType = entityType
    if (status) where.status = status
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      db.client.findMany({
        where: where as any,
        include: {
          businessLine: { select: { slug: true, name: true, icon: true, color: true } },
          _count: { select: { projects: true, offers: true, invoices: true, contracts: true } },
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.client.count({ where: where as any }),
    ])

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[API] GET /api/clients error:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

// ─── POST /api/clients ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessLineSlug, entityType, companyName, contactPerson, email, ...rest } = body

    if (!businessLineSlug || !companyName || !contactPerson || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
    if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })

    const client = await db.client.create({
      data: {
        businessLineId: bl.id,
        entityType: entityType || 'clients',
        companyName,
        contactPerson,
        email,
        ...rest,
      },
      include: { businessLine: { select: { slug: true, name: true } } },
    })

    // Fire-and-forget activity log
    db.activity.create({
      data: {
        businessLineId: bl.id,
        userId: 'system',
        userName: 'System',
        action: 'created',
        entityType: 'client',
        entityId: client.id,
        entityName: companyName,
        clientId: client.id,
      },
    }).catch(console.error)

    return NextResponse.json({ data: client }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/clients error:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
