import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'
import type { Prisma } from '@repo/db'

// ─── GET /api/contracts/[id] ───
// Detalii contract complet (cu secțiuni, anexa 2, snapshot-uri)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true, email: true, phone: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
        offer: { select: { id: true, number: true, value: true, status: true, templateName: true, currency: true, modules: true, blocks: true, entityName: true } },
        invoices: {
          select: { id: true, number: true, status: true, amount: true },
          orderBy: { issuedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Fetch all offers for this client (each offer is an annex to the framework contract)
    const linkedOffers = await db.offer.findMany({
      where: { clientId: contract.clientId },
      select: { id: true, number: true, value: true, currency: true, status: true, templateName: true, entityName: true, modules: true, blocks: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      data: {
        id: contract.id,
        number: contract.number,
        businessLine: contract.businessLine,
        client: contract.client,
        offer: contract.offer,
        linkedOffers,
        templateId: contract.templateId,
        sections: contract.sections,
        anexa2: contract.anexa2,
        companyDetails: contract.companyDetails,
        clientDetails: contract.clientDetails,
        status: contract.status,
        value: contract.value,
        currency: contract.currency,
        duration: contract.duration,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate.toISOString(),
        signedAt: contract.signedAt?.toISOString() ?? null,
        createdBy: contract.createdBy,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
        invoices: contract.invoices,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/contracts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/contracts/[id] ───
// Update contract (secțiuni, anexa 2, companyDetails, clientDetails, value, duration)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.contract.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { id: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    const changes: Record<string, unknown> = {}

    if (body.sections !== undefined) {
      updateData.sections = body.sections as Prisma.InputJsonValue
    }
    if (body.sectionOverrides !== undefined && body.sections) {
      // Merge overrides into sections
      const merged = (body.sections as Array<{ id: string; content: string }>).map(
        (s: { id: string; content: string }) => {
          if (body.sectionOverrides[s.id]) {
            return { ...s, content: body.sectionOverrides[s.id] }
          }
          return s
        }
      )
      updateData.sections = merged as unknown as Prisma.InputJsonValue
    }
    if (body.anexa2 !== undefined) {
      updateData.anexa2 = body.anexa2 as Prisma.InputJsonValue
    }
    if (body.companyDetails !== undefined) {
      updateData.companyDetails = body.companyDetails as Prisma.InputJsonValue
    }
    if (body.clientDetails !== undefined) {
      updateData.clientDetails = body.clientDetails as Prisma.InputJsonValue
    }
    if (body.value !== undefined) {
      changes.value = { old: existing.value, new: body.value }
      updateData.value = body.value
    }
    if (body.currency !== undefined) {
      updateData.currency = body.currency
    }
    if (body.duration !== undefined) {
      changes.duration = { old: existing.duration, new: body.duration }
      updateData.duration = body.duration
    }
    if (body.startDate !== undefined) {
      updateData.startDate = new Date(body.startDate)
    }
    if (body.endDate !== undefined) {
      updateData.endDate = new Date(body.endDate)
    }

    const updated = await db.contract.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
        offer: { select: { id: true, number: true, templateName: true, value: true, currency: true, status: true } },
      },
    })

    // Log activity
    await logActivity({
      businessLineId: existing.businessLine.id,
      userId: 'system',
      userName: 'System',
      action: 'updated',
      entityType: 'contract',
      entityId: id,
      entityName: `${existing.number} — ${existing.client.companyName}`,
      details: changes,
      clientId: existing.clientId,
      contractId: id,
    })

    return NextResponse.json({
      data: {
        id: updated.id,
        number: updated.number,
        businessLine: updated.businessLine.slug,
        businessLineName: updated.businessLine.name,
        offerId: updated.offerId,
        offerNumber: updated.offer?.number ?? null,
        clientId: updated.clientId,
        clientName: updated.client.companyName,
        templateId: updated.templateId,
        sections: updated.sections,
        anexa2: updated.anexa2,
        companyDetails: updated.companyDetails,
        clientDetails: updated.clientDetails,
        status: updated.status,
        value: updated.value,
        currency: updated.currency,
        duration: updated.duration,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
        signedAt: updated.signedAt?.toISOString() ?? null,
        createdBy: updated.createdBy,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] PATCH /api/contracts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/contracts/[id] ───
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { id: true } },
      },
    })
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    await db.activity.deleteMany({ where: { contractId: id } })
    await db.contract.delete({ where: { id } })
    await logActivity({
      businessLineId: contract.businessLine?.id || '',
      userId: 'system',
      userName: 'System',
      action: 'deleted',
      entityType: 'contract',
      entityId: id,
      entityName: `${contract.number} — ${contract.client?.companyName || ''}`,
      details: { status: contract.status },
      clientId: contract.clientId,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/contracts/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 })
  }
}
