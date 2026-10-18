import { NextResponse } from 'next/server'
import { websiteHandler } from '@/lib/website/storefront/auth'
import { recordPreviewView } from '@/lib/website/preview/views'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { userAgent } → { counted, first?, returning? }. Reported by the visitor's browser through the frontend (ws_ key, server-to-server). Never reveals why a view was not counted beyond the reason code. */
export const POST = websiteHandler<{ token: string }>(async (req, ctx, { token }) => {
  const body = (await req.json().catch(() => null)) as { userAgent?: unknown } | null
  const r = await recordPreviewView(ctx.businessLineId, token, { userAgent: typeof body?.userAgent === 'string' ? body.userAgent.slice(0, 400) : null })
  return NextResponse.json({ counted: r.counted }, { headers: { 'Cache-Control': 'no-store' } })
})
