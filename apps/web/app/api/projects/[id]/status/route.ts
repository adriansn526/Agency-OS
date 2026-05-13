import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── PATCH /api/projects/[id]/status ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await request.json()

    const validStatuses = ['planificare', 'in_lucru', 'review', 'finalizat', 'suspendat']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const project = await db.project.update({ where: { id }, data: { status } })

    db.activity.create({
      data: {
        businessLineId: existing.businessLineId,
        userId: 'system', userName: 'System',
        action: 'status_changed',
        entityType: 'project', entityId: id, entityName: existing.name,
        details: { oldStatus: existing.status, newStatus: status },
        projectId: id,
      },
    }).catch(console.error)

    return NextResponse.json({ data: project })
  } catch (error) {
    console.error('[API] PATCH /api/projects/[id]/status error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
