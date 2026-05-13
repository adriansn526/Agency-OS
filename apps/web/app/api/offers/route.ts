import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'
import type { Prisma } from '@repo/db'

// ─── Helper: generate next offer number ───
async function generateOfferNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `OF-${year}`
  const last = await db.offer.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
  })
  const seq = last ? parseInt(last.number.split('-')[2]!) + 1 : 1
  return `${prefix}-${String(seq).padStart(3, '0')}`
}

// ─── GET /api/offers ───
// Lista oferte paginată cu filtre: businessLine, status, entityType, search, clientId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const businessLine = searchParams.get('businessLine')
    const status = searchParams.get('status')
    const entityType = searchParams.get('entityType')
    const clientId = searchParams.get('clientId')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Build where clause
    const where: Prisma.OfferWhereInput = {}

    // Filter by businessLine slug → resolve to businessLineId
    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) {
        where.businessLineId = bl.id
      } else {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        })
      }
    }

    if (status) where.status = status
    if (entityType) where.entityType = entityType
    if (clientId) where.clientId = clientId

    // Search across number, entityName, templateName
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { entityName: { contains: search, mode: 'insensitive' } },
        { templateName: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Execute count + query in parallel
    const [total, offers] = await Promise.all([
      db.offer.count({ where }),
      db.offer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          businessLine: { select: { id: true, slug: true, name: true } },
          client: { select: { id: true, companyName: true, contactPerson: true, email: true } },
          _count: { select: { contracts: true } },
        },
      }),
    ])

    const data = offers.map((offer) => ({
      id: offer.id,
      number: offer.number,
      businessLine: offer.businessLine.slug,
      businessLineName: offer.businessLine.name,
      entityType: offer.entityType,
      clientId: offer.clientId,
      entityName: offer.entityName,
      client: offer.client,
      templateId: offer.templateId,
      templateName: offer.templateName,
      status: offer.status,
      value: offer.value,
      currency: offer.currency,
      validUntil: offer.validUntil?.toISOString() ?? null,
      blocks: offer.blocks,
      modules: offer.modules,
      customFields: offer.customFields,
      createdBy: offer.createdBy,
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt.toISOString(),
      contractsCount: offer._count.contracts,
    }))

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[API] GET /api/offers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    )
  }
}

// ─── POST /api/offers ───
// Creare ofertă nouă cu generare automată număr
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      businessLineId,
      entityType,
      clientId,
      entityName,
      templateId,
      templateName,
      value,
      currency = 'EUR',
      validUntil,
      blocks = [],
      modules,
      customFieldValues,
      createdBy = 'usr-001',
    } = body

    // Validate required fields
    if (!businessLineId || !entityType || !entityName || !templateId || !templateName || value == null) {
      return NextResponse.json(
        { error: 'Missing required fields: businessLineId, entityType, entityName, templateId, templateName, value' },
        { status: 400 }
      )
    }

    // Verify businessLine exists
    const bl = await db.businessLine.findUnique({ where: { id: businessLineId } })
    if (!bl) {
      return NextResponse.json(
        { error: `BusinessLine not found: ${businessLineId}` },
        { status: 404 }
      )
    }

    // If clientId provided, verify client exists
    if (clientId) {
      const client = await db.client.findUnique({ where: { id: clientId } })
      if (!client) {
        return NextResponse.json(
          { error: `Client not found: ${clientId}` },
          { status: 404 }
        )
      }
    }

    // Generate offer number
    const number = await generateOfferNumber()

    // Create offer
    const offer = await db.offer.create({
      data: {
        number,
        businessLineId,
        entityType,
        clientId: clientId || null,
        entityName,
        templateId,
        templateName,
        status: 'draft',
        value,
        currency,
        validUntil: validUntil ? new Date(validUntil) : null,
        blocks: blocks as Prisma.InputJsonValue,
        modules: modules ? (modules as Prisma.InputJsonValue) : undefined,
        customFields: customFieldValues ? (customFieldValues as Prisma.InputJsonValue) : undefined,
        createdBy,
      },
      include: {
        businessLine: { select: { id: true, slug: true, name: true } },
        client: { select: { id: true, companyName: true, contactPerson: true, email: true } },
      },
    })

    // Log activity
    await logActivity({
      businessLineId,
      userId: createdBy,
      userName: 'System',
      action: 'created',
      entityType: 'offer',
      entityId: offer.id,
      entityName: `${offer.number} - ${offer.templateName}`,
      details: { status: 'draft', value, currency },
      offerId: offer.id,
      clientId: clientId || undefined,
    })

    return NextResponse.json(
      {
        id: offer.id,
        number: offer.number,
        businessLine: offer.businessLine.slug,
        businessLineName: offer.businessLine.name,
        entityType: offer.entityType,
        clientId: offer.clientId,
        entityName: offer.entityName,
        client: offer.client,
        templateId: offer.templateId,
        templateName: offer.templateName,
        status: offer.status,
        value: offer.value,
        currency: offer.currency,
        validUntil: offer.validUntil?.toISOString() ?? null,
        blocks: offer.blocks,
        modules: offer.modules,
        customFields: offer.customFields,
        createdBy: offer.createdBy,
        createdAt: offer.createdAt.toISOString(),
        updatedAt: offer.updatedAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API] POST /api/offers error:', error)
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500 }
    )
  }
}
