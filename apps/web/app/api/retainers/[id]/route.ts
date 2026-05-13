import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'

// ─── PATCH /api/retainers/[id] ───
// Update retainer (amount, status, billingCycle, endDate, serviceName)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.retainer.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Retainer not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    const changes: Record<string, unknown> = {}

    if (body.amount !== undefined) {
      changes.amount = { old: existing.amount, new: body.amount }
      updateData.amount = body.amount
    }
    if (body.status !== undefined) {
      changes.status = { old: existing.status, new: body.status }
      updateData.status = body.status
    }
    if (body.billingCycle !== undefined) {
      changes.billingCycle = { old: existing.billingCycle, new: body.billingCycle }
      updateData.billingCycle = body.billingCycle
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null
    }
    if (body.serviceName !== undefined) {
      changes.serviceName = { old: existing.serviceName, new: body.serviceName }
      updateData.serviceName = body.serviceName
    }
    if (body.currency !== undefined) {
      changes.currency = { old: existing.currency, new: body.currency }
      updateData.currency = body.currency
    }

    const updated = await db.retainer.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, companyName: true } },
      },
    })

    // Resolve business line
    const bl = await db.businessLine.findUnique({
      where: { id: existing.businessLineId },
      select: { id: true, slug: true, name: true },
    })

    // Log activity
    const action = body.status && body.status !== existing.status ? 'status_changed' : 'updated'
    await logActivity({
      businessLineId: existing.businessLineId,
      userId: 'system',
      userName: 'System',
      action,
      entityType: 'retainer',
      entityId: id,
      entityName: `${existing.serviceName} — ${existing.client.companyName}`,
      details: changes,
      clientId: existing.clientId,
    })

    return NextResponse.json({
      data: {
        id: updated.id,
        clientId: updated.clientId,
        clientName: updated.client.companyName,
        businessLine: bl?.slug ?? null,
        businessLineName: bl?.name ?? null,
        serviceName: updated.serviceName,
        amount: updated.amount,
        currency: updated.currency,
        billingCycle: updated.billingCycle,
        status: updated.status,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] PATCH /api/retainers/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update retainer' },
      { status: 500 }
    )
  }
}
