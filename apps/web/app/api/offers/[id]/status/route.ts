import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'

type RouteContext = { params: Promise<{ id: string }> }

// Allowed status transitions
const allowedTransitions: Record<string, string[]> = {
  draft: ['trimisa'],
  trimisa: ['vizualizata', 'expirata'],
  vizualizata: ['acceptata', 'respinsa', 'expirata'],
  acceptata: ['contract_generat'],
  respinsa: [], // terminal
  expirata: ['draft'], // reactivare
  contract_generat: [], // terminal
}

// ─── PATCH /api/offers/[id]/status ───
// Schimbare status pipeline cu validare tranziții
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { status: newStatus, updatedBy = 'usr-001' } = body

    if (!newStatus) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      )
    }

    // Find existing offer
    const existing = await db.offer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    // Validate transition
    const allowed = allowedTransitions[existing.status]
    if (!allowed) {
      return NextResponse.json(
        { error: `Unknown current status: ${existing.status}` },
        { status: 400 }
      )
    }

    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${existing.status} → ${newStatus}`,
          allowedTransitions: allowed,
        },
        { status: 400 }
      )
    }

    // Update status
    const offer = await db.offer.update({
      where: { id },
      data: { status: newStatus },
      include: {
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })

    // Log activity
    await logActivity({
      businessLineId: offer.businessLineId,
      userId: updatedBy,
      userName: 'System',
      action: 'status_changed',
      entityType: 'offer',
      entityId: offer.id,
      entityName: `${offer.number} - ${offer.templateName}`,
      details: { oldStatus: existing.status, newStatus },
      offerId: offer.id,
      clientId: offer.clientId || undefined,
    })

    return NextResponse.json({
      id: offer.id,
      number: offer.number,
      status: offer.status,
      previousStatus: existing.status,
      businessLine: offer.businessLine.slug,
    })
  } catch (error) {
    console.error('[API] PATCH /api/offers/[id]/status error:', error)
    return NextResponse.json(
      { error: 'Failed to update offer status' },
      { status: 500 }
    )
  }
}
