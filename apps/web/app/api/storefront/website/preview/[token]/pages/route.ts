import { NextResponse } from 'next/server'
import { websiteHandler } from '@/lib/website/storefront/auth'
import { listPreviewPages } from '@/lib/website/pages/public'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/website/preview/{token}/pages → { items: [{ title, slug, menu, published }] } for the private preview, drafts included (404 unknown, 410 expired). Server-to-server only (ws_ key). */
export const GET = websiteHandler<{ token: string }>(async (_req, ctx, { token }) => {
  const r = await listPreviewPages(ctx, token)
  if (r.ok) return { items: r.items }
  return NextResponse.json({ error: r.state === 'expired' ? 'expired' : 'not_found' }, { status: r.state === 'expired' ? 410 : 404, headers: { 'Cache-Control': 'no-store' } })
})
