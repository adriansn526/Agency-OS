import { websiteHandler } from '@/lib/website/storefront/auth'
import { sitemap } from '@/lib/website/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/website/sitemap → { items: [{ collection, slug, updatedAt }] }; custom pages (collection "pagini") also carry `firm`. */
export const GET = websiteHandler(async (_req, ctx) => sitemap(ctx))
