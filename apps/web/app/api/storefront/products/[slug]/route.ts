import { storefrontHandler } from '@/lib/commerce/storefront/auth'
import { getProduct } from '@/lib/commerce/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/products/:slug → product detail (fitments, OE codes, equivalents) */
export const GET = storefrontHandler<{ slug: string }>(async (_req, ctx, params) => getProduct(ctx, params.slug))
