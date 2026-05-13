import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'
import type { Prisma } from '@repo/db'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET /api/offers/[id] ───
// Detalii ofertă cu client, contract, businessLine
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const offer = await db.offer.findUnique({
      where: { id },
      include: {
        businessLine: { select: { id: true, slug: true, name: true } },
        client: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            email: true,
            phone: true,
            address: true,
            cui: true,
            regCom: true,
          },
        },
        contracts: {
          select: { id: true, number: true, status: true, value: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        deliveries: {
          select: {
            id: true, token: true, sentAt: true, sentTo: true, sentBy: true,
            firstOpenedAt: true, lastOpenedAt: true, totalViews: true,
            clientResponse: true, clientResponseAt: true, clientMessage: true,
            trackingEnabled: true,
            events: {
              select: { id: true, type: true, metadata: true, device: true, timestamp: true },
              orderBy: { timestamp: 'asc' },
            },
          },
          orderBy: { sentAt: 'desc' },
        },
        _count: { select: { contracts: true, activities: true, deliveries: true } },
      },
    })

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: offer.id,
      number: offer.number,
      businessLine: offer.businessLine.slug,
      businessLineName: offer.businessLine.name,
      businessLineId: offer.businessLineId,
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
      sentAt: offer.sentAt?.toISOString() ?? null,
      viewedAt: offer.viewedAt?.toISOString() ?? null,
      acceptedAt: offer.acceptedAt?.toISOString() ?? null,
      contracts: offer.contracts.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      deliveries: offer.deliveries.map((d) => ({
        ...d,
        sentAt: d.sentAt.toISOString(),
        firstOpenedAt: d.firstOpenedAt?.toISOString() ?? null,
        lastOpenedAt: d.lastOpenedAt?.toISOString() ?? null,
        clientResponseAt: d.clientResponseAt?.toISOString() ?? null,
        events: d.events.map((e) => ({ ...e, timestamp: e.timestamp.toISOString() })),
      })),
      contractsCount: offer._count.contracts,
      deliveriesCount: offer._count.deliveries,
      activitiesCount: offer._count.activities,
    })
  } catch (error) {
    console.error('[API] GET /api/offers/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch offer' },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/offers/[id] ───
// Update ofertă (conținut, blocks, value, validUntil, etc.)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Find existing offer
    const existing = await db.offer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    // Build update data – only allow updating specific fields
    const updateData: Prisma.OfferUpdateInput = {}

    if (body.entityName !== undefined) updateData.entityName = body.entityName
    if (body.templateName !== undefined) updateData.templateName = body.templateName
    if (body.status !== undefined) updateData.status = body.status
    if (body.value !== undefined) updateData.value = body.value
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null
    if (body.blocks !== undefined) updateData.blocks = body.blocks as Prisma.InputJsonValue
    if (body.modules !== undefined) updateData.modules = body.modules as Prisma.InputJsonValue
    if (body.customFieldValues !== undefined) updateData.customFields = body.customFieldValues as Prisma.InputJsonValue
    // Allow detaching from client (clientId: null)
    if ('clientId' in body) {
      updateData.client = body.clientId ? { connect: { id: body.clientId } } : { disconnect: true }
    }

    const offer = await db.offer.update({
      where: { id },
      data: updateData,
      include: {
        businessLine: { select: { id: true, slug: true, name: true } },
        client: { select: { id: true, companyName: true, contactPerson: true, email: true } },
      },
    })

    // Log activity
    await logActivity({
      businessLineId: offer.businessLineId,
      userId: body.updatedBy || 'usr-001',
      userName: 'System',
      action: 'updated',
      entityType: 'offer',
      entityId: offer.id,
      entityName: `${offer.number} - ${offer.templateName}`,
      details: { updatedFields: Object.keys(body) },
      offerId: offer.id,
      clientId: offer.clientId || undefined,
    })

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('[API] PATCH /api/offers/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update offer' },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/offers/[id] ───
// Ștergere permanentă ofertă
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const existing = await db.offer.findUnique({
      where: { id },
      include: { businessLine: { select: { id: true } } },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    // Delete related deliveries first
    await db.offerDelivery.deleteMany({ where: { offerId: id } })

    // Delete the offer
    await db.offer.delete({ where: { id } })

    // Log activity
    await logActivity({
      businessLineId: existing.businessLineId,
      userId: 'usr-001',
      userName: 'System',
      action: 'deleted',
      entityType: 'offer',
      entityId: id,
      entityName: `${existing.number} - ${existing.templateName}`,
      details: { deletedStatus: existing.status },
      clientId: existing.clientId || undefined,
    })

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[API] DELETE /api/offers/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete offer' },
      { status: 500 }
    )
  }
}
