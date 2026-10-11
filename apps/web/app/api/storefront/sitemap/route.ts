import { storefrontHandler } from '@/lib/commerce/storefront/auth'
import { listSitemap } from '@/lib/commerce/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/storefront/sitemap[?cursor=&limit=] → { items: [{ slug, updatedAt, hasImage, hasSeoTitle, indexable }], nextCursor }
 * hasImage = same condition as `image != null`; hasSeoTitle = non-blank seoTitle; indexable = both. updatedAt also moves when a product gains/loses its last image or its seoTitle becomes blank/non-blank.
 * Keyset-paginated list of every sellable product (no 500-page limit). Loop until nextCursor is null.
 * limit: 1..5000 (default 1000). Sorted by slug ascending.
 */
export const GET = storefrontHandler(async (req, ctx) => listSitemap(ctx, new URL(req.url).searchParams))
