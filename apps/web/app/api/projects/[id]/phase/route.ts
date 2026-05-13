import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── PATCH /api/projects/[id]/phase ───
// Advance to next phase
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { nextPhase } = await request.json()

    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const metadata = (project.metadata as any) || { phases: [] }
    const phases = metadata.phases || []

    // Mark current phase as completed
    const updatedPhases = phases.map((p: any) => {
      if (p.name === project.currentPhase) {
        return { ...p, status: 'completed', completedAt: new Date().toISOString() }
      }
      if (p.name === nextPhase) {
        return { ...p, status: 'in_progress' }
      }
      return p
    })

    const completedCount = updatedPhases.filter((p: any) => p.status === 'completed').length
    const progress = Math.round((completedCount / updatedPhases.length) * 100)

    const updated = await db.project.update({
      where: { id },
      data: {
        currentPhase: nextPhase,
        progress,
        status: progress === 100 ? 'finalizat' : 'in_lucru',
        metadata: { ...metadata, phases: updatedPhases },
      },
    })

    db.activity.create({
      data: {
        businessLineId: project.businessLineId,
        userId: 'system', userName: 'System',
        action: 'status_changed',
        entityType: 'project', entityId: id, entityName: project.name,
        details: { oldPhase: project.currentPhase, newPhase: nextPhase, progress },
        projectId: id,
      },
    }).catch(console.error)

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[API] PATCH /api/projects/[id]/phase error:', error)
    return NextResponse.json({ error: 'Failed to advance phase' }, { status: 500 })
  }
}
