import { storefrontHandler } from '@/lib/commerce/storefront/auth'
import { getStorefrontMeta } from '@/lib/commerce/sync/meta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/meta → { currency, vatIncluded, priceUpdatedAt, fxRate, fxRateDate } */
export const GET = storefrontHandler(async (_req, ctx) => getStorefrontMeta(ctx.businessLineId))
