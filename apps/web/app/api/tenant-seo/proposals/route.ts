import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { authTenant, TenantAiError } from '@/lib/tenant-ai/service'
import { readProposals, totals, type ArticleProposal } from '@/lib/seo/proposals'
import { buildProposal, withProject } from '@/lib/seo/proposals-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The SEO project of a tenant is the one whose metadata.tenantSlug matches. */
async function tenantProject(licenseKey: string | null) {
  const t = await authTenant(licenseKey)
  const project = await db.project.findFirst({ where: { metadata: { path: ['tenantSlug'], equals: t.tenantSlug } }, select: { id: true, metadata: true } })
  if (!project) throw new TenantAiError(404, 'No SEO project linked to this tenant')
  return project
}
const view = (p: ArticleProposal) => ({
  id: p.id, mainTerm: p.mainTerm, mainVolume: p.mainVolume, mainKd: p.mainKd, longTails: p.longTails, status: p.status,
  note: p.note, claimedBy: p.claimedBy, articleUrl: p.articleUrl, ...totals(p),
})
const fail = (e: any) => e instanceof TenantAiError
  ? NextResponse.json({ error: e.message }, { status: e.status })
  : NextResponse.json({ error: e?.message || 'Internal error' }, { status: e?.status || 500 })

/** GET: the proposals the lawyers should work on (rejected ones are hidden). Auth: X-License-Key. */
export async function GET(req: NextRequest) {
  try {
    const project = await tenantProject(req.headers.get('x-license-key'))
    const list = readProposals(project.metadata).filter(p => p.status !== 'respins')
    return NextResponse.json({ data: list.map(view) })
  } catch (e) { return fail(e) }
}

/** PATCH { id, status: 'in_lucru' | 'propus' | 'publicat', claimedBy?, articleUrl? }: the portal marks an article as taken or published. */
export async function PATCH(req: NextRequest) {
  try {
    const project = await tenantProject(req.headers.get('x-license-key'))
    const b = await req.json()
    if (!['in_lucru', 'propus', 'publicat'].includes(b?.status)) return NextResponse.json({ error: 'Status invalid' }, { status: 400 })
    const out = await withProject(project.id, async list => {
      const i = list.findIndex(p => p.id === b.id)
      if (i < 0) throw Object.assign(new Error('Propunerea nu există'), { status: 404 })
      const patch: any = { status: b.status }
      if ('claimedBy' in b) patch.claimedBy = b.claimedBy
      if ('articleUrl' in b) patch.articleUrl = b.articleUrl
      if (b.status === 'propus') patch.claimedBy = ''
      const p = buildProposal(patch, list[i])
      if ('error' in p) throw Object.assign(new Error(p.error), { status: 400 })
      const next = [...list]; next[i] = p
      return { list: next, result: p }
    })
    return NextResponse.json({ data: view(out) })
  } catch (e) { return fail(e) }
}
