import { NextResponse } from 'next/server'
import { websiteHandler } from '@/lib/website/storefront/auth'
import { lookupPreview } from '@/lib/website/preview/service'
import { isContentCollection } from '@/lib/website/content/blocks'
import { serializeDetail } from '@/lib/website/storefront/serialize'
import { getTaxonomy } from '@/lib/website/glossary/live'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const gone = (state: 'invalid' | 'expired') => NextResponse.json({ error: state === 'expired' ? 'expired' : 'not_found' }, { status: state === 'expired' ? 410 : 404, headers: { 'Cache-Control': 'no-store' } })

/** GET /api/storefront/website/content-preview/{token} → a private (not yet published) service or price page as the public detail (404 unknown / not a content page, 410 expired). Server-to-server only (ws_ key). */
export const GET = websiteHandler<{ token: string }>(async (_req, ctx, { token }) => {
  const r = await lookupPreview(ctx.businessLineId, token)
  if (r.state !== 'ok') return gone(r.state)
  if (!isContentCollection(r.entry.collection.key)) return gone('invalid')
  return serializeDetail(r.entry, r.entry.collection.key, r.entry.media, [], (await getTaxonomy(ctx.businessLineId)).categories)
})
