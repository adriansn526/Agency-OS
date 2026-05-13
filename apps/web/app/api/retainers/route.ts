import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'
import type { Prisma } from '@repo/db'

// ─── GET /api/retainers ───
// Lista retainere cu filtre: businessLine, status, clientId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const businessLine = searchParams.get('businessLine')
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    // Build where clause
    const where: Prisma.RetainerWhereInput = {}

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
    if (clientId) where.clientId = clientId

    const [total, retainers] = await Promise.all([
      db.retainer.count({ where }),
      db.retainer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { id: true, companyName: true } },
        },
      }),
    ])

    // Resolve business line names
    const blIds = [...new Set(retainers.map((r) => r.businessLineId))]
    const businessLines = blIds.length > 0
      ? await db.businessLine.findMany({
          where: { id: { in: blIds } },
          select: { id: true, slug: true, name: true },
        })
      : []
    const blMap = new Map(businessLines.map((bl) => [bl.id, bl]))

    const data = retainers.map((ret) => {
      const bl = blMap.get(ret.businessLineId)
      return {
        id: ret.id,
        clientId: ret.clientId,
        clientName: ret.client.companyName,
        businessLine: bl?.slug ?? null,
        businessLineName: bl?.name ?? null,
        serviceName: ret.serviceName,
        amount: ret.amount,
        currency: ret.currency,
        billingCycle: ret.billingCycle,
        status: ret.status,
        startDate: ret.startDate.toISOString(),
        endDate: ret.endDate?.toISOString() ?? null,
        createdAt: ret.createdAt.toISOString(),
        updatedAt: ret.updatedAt.toISOString(),
      }
    })

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
    console.error('[API] GET /api/retainers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch retainers' },
      { status: 500 }
    )
  }
}

// ─── POST /api/retainers ───
// Creare retainer nou
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      businessLine,
      clientId,
      serviceName,
      amount,
      currency = 'EUR',
      billingCycle = 'lunar',
      startDate,
      endDate,
    } = body

    // Validate required fields
    if (!businessLine || !clientId || !serviceName || !amount || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: businessLine, clientId, serviceName, amount, startDate' },
        { status: 400 }
      )
    }

    // Resolve businessLine slug → id
    const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
    if (!bl) {
      return NextResponse.json(
        { error: `Business line "${businessLine}" not found` },
        { status: 404 }
      )
    }

    // Validate client
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true, companyName: true },
    })
    if (!client) {
      return NextResponse.json(
        { error: `Client "${clientId}" not found` },
        { status: 404 }
      )
    }

    const retainer = await db.retainer.create({
      data: {
        clientId,
        businessLineId: bl.id,
        serviceName,
        amount,
        currency,
        billingCycle,
        status: 'activ',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        client: { select: { id: true, companyName: true } },
      },
    })

    // Log activity
    await logActivity({
      businessLineId: bl.id,
      userId: 'system',
      userName: 'System',
      action: 'created',
      entityType: 'retainer',
      entityId: retainer.id,
      entityName: `${serviceName} — ${client.companyName}`,
      details: { amount, currency, billingCycle },
      clientId,
    })

    return NextResponse.json({
      data: {
        id: retainer.id,
        clientId: retainer.clientId,
        clientName: retainer.client.companyName,
        businessLine: bl.slug,
        businessLineName: bl.name,
        serviceName: retainer.serviceName,
        amount: retainer.amount,
        currency: retainer.currency,
        billingCycle: retainer.billingCycle,
        status: retainer.status,
        startDate: retainer.startDate.toISOString(),
        endDate: retainer.endDate?.toISOString() ?? null,
        createdAt: retainer.createdAt.toISOString(),
        updatedAt: retainer.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/retainers error:', error)
    return NextResponse.json(
      { error: 'Failed to create retainer' },
      { status: 500 }
    )
  }
}
