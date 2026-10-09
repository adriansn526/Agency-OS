import { storefrontHandler } from '@/lib/commerce/storefront/auth'
import { listProducts } from '@/lib/commerce/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/storefront/products?make=&model=&gen=&category=&side=&quality=&q=&sort=&page=&pageSize=
 * Vehicle filters: make | make+model | make+model+gen (model needs make; gen needs make+model, else 400).
 * page is capped at 500 (>500 → 400); to list the whole catalog use /api/storefront/sitemap.
 */
export const GET = storefrontHandler(async (req, ctx) => listProducts(ctx, new URL(req.url).searchParams))
