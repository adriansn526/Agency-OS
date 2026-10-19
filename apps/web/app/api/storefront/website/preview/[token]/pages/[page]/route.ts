import { NextResponse } from 'next/server'
import { websiteHandler } from '@/lib/website/storefront/auth'
import { getPreviewPage } from '@/lib/website/pages/public'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/website/preview/{token}/pages/{page} → { firm, page, layout (v2), media } for a draft or published page of the previewed firm (404 unknown, 410 expired). */
export const GET = websiteHandler<{ token: string; page: string }>(async (_req, ctx, { token, page }) => {
  const r = await getPreviewPage(ctx, token, page)
  if (r.ok) return r.page
  return NextResponse.json({ error: r.state === 'expired' ? 'expired' : 'not_found' }, { status: r.state === 'expired' ? 410 : 404, headers: { 'Cache-Control': 'no-store' } })
})
