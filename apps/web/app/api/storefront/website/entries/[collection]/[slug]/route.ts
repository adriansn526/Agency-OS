import { websiteHandler } from '@/lib/website/storefront/auth'
import { getEntry } from '@/lib/website/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/website/entries/<collection>/<slug> → detail with body, contact, media and approved reviews */
export const GET = websiteHandler<{ collection: string; slug: string }>(async (_req, ctx, p) => getEntry(ctx, p.collection, p.slug))
