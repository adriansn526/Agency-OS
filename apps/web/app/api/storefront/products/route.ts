import { storefrontHandler } from '@/lib/commerce/storefront/auth'
import { listProducts } from '@/lib/commerce/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/products?make=&model=&gen=&category=&side=&quality=&q=&sort=&page=&pageSize= */
export const GET = storefrontHandler(async (req, ctx) => listProducts(ctx, new URL(req.url).searchParams))
