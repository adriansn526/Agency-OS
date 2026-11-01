import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { buildProposal, readProposals, totals, type ArticleProposal } from '@/lib/seo/proposals'
import { withProject } from '@/lib/seo/proposals-store'

export const dynamic = 'force-dynamic'

const fail = (e: any) => NextResponse.json({ error: e?.message || 'Error' }, { status: e?.status || 500 })

/** GET /api/seo/proposals?projectId= */
export async function GET(req: NextRequest) {
  const projectId = new URL(req.url).searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId lipsă' }, { status: 400 })
  const project = await db.project.findUnique({ where: { id: projectId }, select: { metadata: true } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  const list = readProposals(project.metadata)
  return NextResponse.json({ data: list.map(p => ({ ...p, ...totals(p) })) })
}

/** POST { projectId, proposals: [..] | proposal } adds one or more proposals (skips main terms that already exist). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const incoming: any[] = Array.isArray(body.proposals) ? body.proposals : [body.proposal ?? body]
    if (!body.projectId) return NextResponse.json({ error: 'projectId lipsă' }, { status: 400 })
    const out = await withProject(body.projectId, async list => {
      const have = new Set(list.map(p => p.mainTerm.toLowerCase()))
      const added: ArticleProposal[] = []
      for (const raw of incoming) {
        const p = buildProposal(raw)
        if ('error' in p) throw Object.assign(new Error(p.error), { status: 400 })
        if (have.has(p.mainTerm.toLowerCase())) continue
        have.add(p.mainTerm.toLowerCase()); added.push(p)
      }
      return { list: [...list, ...added], result: { added: added.length, skipped: incoming.length - added.length } }
    })
    return NextResponse.json({ data: out })
  } catch (e) { return fail(e) }
}

/** PATCH { projectId, id, ...fields } */
export async function PATCH(req: NextRequest) {
  try {
    const { projectId, id, ...fields } = await req.json()
    const out = await withProject(projectId, async list => {
      const i = list.findIndex(p => p.id === id)
      if (i < 0) throw Object.assign(new Error('Propunerea nu există'), { status: 404 })
      const p = buildProposal(fields, list[i])
      if ('error' in p) throw Object.assign(new Error(p.error), { status: 400 })
      const next = [...list]; next[i] = p
      return { list: next, result: p }
    })
    return NextResponse.json({ data: out })
  } catch (e) { return fail(e) }
}

/** DELETE ?projectId=&id= */
export async function DELETE(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams
    const projectId = sp.get('projectId'), id = sp.get('id')
    if (!projectId || !id) return NextResponse.json({ error: 'projectId și id sunt obligatorii' }, { status: 400 })
    await withProject(projectId, async list => ({ list: list.filter(p => p.id !== id), result: null }))
    return NextResponse.json({ data: { ok: true } })
  } catch (e) { return fail(e) }
}
