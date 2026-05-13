import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'

// ─── PATCH /api/contracts/[id]/status ───
// Status pipeline: draft → sent → signed → active → expired
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { status } = body

    // Validate status
    const validStatuses = ['draft', 'sent', 'signed', 'active', 'expired']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.contract.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    const oldStatus = existing.status

    // Build update data
    const updateData: Record<string, unknown> = { status }

    // If marking as signed, set signedAt
    if (status === 'signed' && !existing.signedAt) {
      updateData.signedAt = new Date()
    }

    const updated = await db.contract.update({
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
      entityType: 'contract',
      entityId: id,
      entityName: `${existing.number} — ${existing.client.companyName}`,
      details: { oldStatus, newStatus: status },
      clientId: existing.clientId,
      contractId: id,
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
        signedAt: updated.signedAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] PATCH /api/contracts/[id]/status error:', error)
    return NextResponse.json(
      { error: 'Failed to update contract status' },
      { status: 500 }
    )
  }
}
