import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'

// ─── PATCH /api/invoices/[id]/status ───
// Marcare plătită/restantă/trimisă
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { status } = body

    // Validate status
    const validStatuses = ['emisa', 'trimisa', 'platita', 'restanta']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const oldStatus = existing.status

    // Build update data
    const updateData: Record<string, unknown> = { status }

    // If marking as paid, set paidAt
    if (status === 'platita' && !existing.paidAt) {
      updateData.paidAt = new Date()
    }

    // If unmarking paid, clear paidAt
    if (status !== 'platita' && existing.paidAt) {
      updateData.paidAt = null
    }

    const updated = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })

    // Log activity
    await logActivity({
      businessLineId: existing.businessLine.id,
      userId: 'system',
      userName: 'System',
      action: 'status_changed',
      entityType: 'invoice',
      entityId: id,
      entityName: `${existing.number} — ${existing.client.companyName}`,
      details: { oldStatus, newStatus: status },
      clientId: existing.clientId,
    })

    return NextResponse.json({
      data: {
        id: updated.id,
        number: updated.number,
        businessLine: updated.businessLine.slug,
        businessLineName: updated.businessLine.name,
        clientId: updated.clientId,
        clientName: updated.client.companyName,
        status: updated.status,
        amount: updated.amount,
        currency: updated.currency,
        paidAt: updated.paidAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] PATCH /api/invoices/[id]/status error:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice status' },
      { status: 500 }
    )
  }
}
