import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/leads/[id] ───
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        businessLine: { select: { slug: true, name: true, icon: true, color: true } },
        convertedTo: { select: { id: true, companyName: true, status: true } },
      },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json({ data: lead })
  } catch (error) {
    console.error('[API] GET /api/leads/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
  }
}

// ─── PATCH /api/leads/[id] ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const lead = await db.lead.update({ where: { id }, data: body })

    // Log pipeline status change
    if (body.status && body.status !== existing.status) {
      db.activity.create({
        data: {
          businessLineId: existing.businessLineId,
          userId: 'system', userName: 'System',
          action: 'status_changed',
          entityType: 'lead', entityId: id, entityName: existing.companyName,
          details: { oldStatus: existing.status, newStatus: body.status },
          leadId: id,
        },
      }).catch(console.error)
    }

    return NextResponse.json({ data: lead })
  } catch (error) {
    console.error('[API] PATCH /api/leads/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

// ─── DELETE /api/leads/[id] ───
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    await db.lead.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/leads/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
