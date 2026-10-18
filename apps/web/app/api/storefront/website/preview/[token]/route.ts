import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { websiteHandler } from '@/lib/website/storefront/auth'
import { lookupPreview, respondPreview, serializePreview } from '@/lib/website/preview/service'
import { AdminError } from '@/lib/website/admin/errors'
import { onPreviewViewed } from '@/lib/crm/pipeline-events'
import { getTaxonomy } from '@/lib/website/glossary/live'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const gone = (state: 'invalid' | 'expired') => NextResponse.json({ error: state === 'expired' ? 'expired' : 'not_found' }, { status: state === 'expired' ? 410 : 404, headers: { 'Cache-Control': 'no-store' } })

/** GET /api/storefront/website/preview/{token} → the private profile preview (404 unknown, 410 expired). Server-to-server only (ws_ key). */
export const GET = websiteHandler<{ token: string }>(async (_req, ctx, { token }) => {
  const r = await lookupPreview(ctx.businessLineId, token)
  if (r.state === 'ok') await onPreviewViewed(r.entry.leadId)
  return r.state === 'ok' ? serializePreview(r.entry, await getTaxonomy(ctx.businessLineId)) : gone(r.state)
})

/** POST { action: 'accept' | 'changes' | 'decline', … } */
export const POST = websiteHandler<{ token: string }>(async (req, ctx, { token }) => {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON invalid' }, { status: 400 }) }
  try {
    const r = await respondPreview(ctx.businessLineId, token, body)
    return r.state === 'ok' ? { ok: true, action: r.action, ...(r.founder ? { founder: r.founder } : {}) } : gone(r.state)
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: 'invalid', issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, { status: 422 })
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
})
