import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'
import type { Prisma } from '@repo/db'

// ─── Helper: Generate invoice number ───
async function generateInvoiceNumber(direction: string): Promise<string> {
  const prefix = direction === 'emisa' ? 'FA' : 'FP'
  const year = new Date().getFullYear()
  const pattern = `${prefix}-${year}`

  const last = await db.invoice.findFirst({
    where: { number: { startsWith: pattern } },
    orderBy: { number: 'desc' },
  })

  const seq = last ? parseInt(last.number.split('-')[2]!) + 1 : 1
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`
}

// ─── GET /api/invoices ───
// Lista facturi paginată cu filtre: businessLine, status, direction, clientId, type, dateRange
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const businessLine = searchParams.get('businessLine')
    const status = searchParams.get('status')
    const direction = searchParams.get('direction')
    const clientId = searchParams.get('clientId')
    const type = searchParams.get('type')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Build where clause
    const where: Prisma.InvoiceWhereInput = {}

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
    if (direction) where.direction = direction
    if (clientId) where.clientId = clientId
    if (type) where.type = type

    // Date range filter (on issuedAt)
    if (from || to) {
      where.issuedAt = {}
      if (from) where.issuedAt.gte = new Date(from)
      if (to) where.issuedAt.lte = new Date(to + 'T23:59:59.999Z')
    }

    // Execute count + query in parallel
    const [total, invoices] = await Promise.all([
      db.invoice.count({ where }),
      db.invoice.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { id: true, companyName: true } },
          businessLine: { select: { id: true, slug: true, name: true } },
        },
      }),
    ])

    const data = invoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      businessLine: inv.businessLine.slug,
      businessLineName: inv.businessLine.name,
      clientId: inv.clientId,
      clientName: inv.client.companyName,
      contractId: inv.contractId,
      type: inv.type,
      direction: inv.direction,
      status: inv.status,
      amount: inv.amount,
      currency: inv.currency,
      issuedAt: inv.issuedAt.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() ?? null,
      items: inv.items,
      notes: inv.notes,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
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
    console.error('[API] GET /api/invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// ─── POST /api/invoices ───
// Creare factură nouă cu numerotare automată
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      businessLine,
      clientId,
      contractId,
      type,
      direction,
      amount,
      currency = 'EUR',
      dueDate,
      items,
      notes,
    } = body

    // Validate required fields
    if (!businessLine || !clientId || !type || !direction || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields: businessLine, clientId, type, direction, amount, dueDate' },
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

    // Validate client exists
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

    // Generate invoice number
    const number = await generateInvoiceNumber(direction)

    // Compute line item totals
    const processedItems = (items || []).map((item: { description: string; quantity: number; unitPrice: number }) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }))

    const invoice = await db.invoice.create({
      data: {
        number,
        businessLineId: bl.id,
        clientId,
        contractId: contractId || null,
        type,
        direction,
        status: 'emisa',
        amount,
        currency,
        issuedAt: new Date(),
        dueDate: new Date(dueDate),
        items: processedItems,
        notes: notes || null,
      },
      include: {
        client: { select: { id: true, companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })

    // Log activity
    await logActivity({
      businessLineId: bl.id,
      userId: 'system',
      userName: 'System',
      action: 'created',
      entityType: 'invoice',
      entityId: invoice.id,
      entityName: `${invoice.number} — ${client.companyName}`,
      details: { amount, currency, type, direction },
      clientId,
    })

    return NextResponse.json({
      data: {
        id: invoice.id,
        number: invoice.number,
        businessLine: invoice.businessLine.slug,
        businessLineName: invoice.businessLine.name,
        clientId: invoice.clientId,
        clientName: invoice.client.companyName,
        contractId: invoice.contractId,
        type: invoice.type,
        direction: invoice.direction,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        issuedAt: invoice.issuedAt.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        paidAt: null,
        items: invoice.items,
        notes: invoice.notes,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
