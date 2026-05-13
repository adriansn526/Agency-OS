import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── PATCH /api/projects/[id]/checklist ───
// Toggle a checklist item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { itemIndex, done } = await request.json()

    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const metadata = (project.metadata as any) || { checklist: [] }
    const checklist = [...(metadata.checklist || [])]

    if (itemIndex < 0 || itemIndex >= checklist.length) {
      return NextResponse.json({ error: 'Invalid checklist item index' }, { status: 400 })
    }

    checklist[itemIndex] = { ...checklist[itemIndex], done }

    const doneCount = checklist.filter((c: any) => c.done).length
    const progress = Math.round((doneCount / checklist.length) * 100)
    const allDone = doneCount === checklist.length

    const updated = await db.project.update({
      where: { id },
      data: {
        progress,
        status: allDone ? 'finalizat' : project.status === 'planificare' ? 'in_lucru' : project.status,
        metadata: { ...metadata, checklist },
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[API] PATCH /api/projects/[id]/checklist error:', error)
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
  }
}
