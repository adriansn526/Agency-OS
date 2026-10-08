import { storefrontHandler } from '@/lib/commerce/storefront/auth'
import { searchSuggest } from '@/lib/commerce/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/search?q= → autocomplete (products by name/OE + vehicles) */
export const GET = storefrontHandler(async (req, ctx) => searchSuggest(ctx, new URL(req.url).searchParams.get('q') ?? ''))
