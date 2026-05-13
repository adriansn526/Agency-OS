import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/clients/[id] ───
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await db.client.findUnique({
      where: { id },
      include: {
        businessLine: { select: { slug: true, name: true, icon: true, color: true } },
        projects: { select: { id: true, name: true, status: true, progress: true }, orderBy: { updatedAt: 'desc' }, take: 5 },
        offers: { select: { id: true, number: true, status: true, value: true, currency: true }, orderBy: { createdAt: 'desc' }, take: 5 },
        contracts: { select: { id: true, number: true, status: true, value: true }, orderBy: { createdAt: 'desc' }, take: 5 },
        invoices: { select: { id: true, number: true, status: true, amount: true, direction: true }, orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { projects: true, offers: true, invoices: true, contracts: true, activities: true } },
      },
    })

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    return NextResponse.json({ data: client })
  } catch (error) {
    console.error('[API] GET /api/clients/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}

// ─── PATCH /api/clients/[id] ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.client.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const client = await db.client.update({ where: { id }, data: body })

    // Log status change if applicable
    if (body.status && body.status !== existing.status) {
      db.activity.create({
        data: {
          businessLineId: existing.businessLineId,
          userId: 'system', userName: 'System',
          action: 'status_changed',
          entityType: 'client', entityId: id, entityName: existing.companyName,
          details: { oldStatus: existing.status, newStatus: body.status },
          clientId: id,
        },
      }).catch(console.error)
    }

    return NextResponse.json({ data: client })
  } catch (error) {
    console.error('[API] PATCH /api/clients/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

// ─── DELETE /api/clients/[id] ───
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.client.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // Soft delete — set status to 'inactiv'
    await db.client.update({ where: { id }, data: { status: 'inactiv' } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/clients/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}
