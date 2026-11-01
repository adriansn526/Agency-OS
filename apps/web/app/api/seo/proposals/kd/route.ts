import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { readProposals } from '@/lib/seo/proposals'
import { withProject } from '@/lib/seo/proposals-store'
import { applyKd, clearKd, estimateKd, termsNeedingKd } from '@/lib/seo/proposals-kd'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Terms estimated per call; the UI calls again while `remaining` > 0. About 0.002 USD per term (one SERP request). */
const BATCH = 60

/** POST { projectId, reset? } computes the estimated KD of the terms that have none; `reset` first clears every KD (recalculate all). */
export async function POST(req: NextRequest) {
  try {
    const { projectId, reset } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'projectId lipsă' }, { status: 400 })
    if (reset === true) await withProject(projectId, async list => ({ list: clearKd(list), result: null }))
    const project = await db.project.findUnique({ where: { id: projectId }, select: { metadata: true } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const todo = termsNeedingKd(readProposals(project.metadata))
    const batch = todo.slice(0, BATCH)
    if (!batch.length) return NextResponse.json({ data: { computed: 0, failed: 0, remaining: 0 } })
    const kd = await estimateKd(batch)
    // applied inside the lock on the current list: proposals may have been edited while DataForSEO was working
    await withProject(projectId, async list => ({ list: applyKd(list, kd), result: null }))
    const failed = batch.length - kd.size
    // terms whose SERP failed stay without KD, so only count remaining when progress was made
    return NextResponse.json({ data: { computed: kd.size, failed, remaining: kd.size ? todo.length - kd.size : 0 } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: e?.status || 500 })
  }
}
