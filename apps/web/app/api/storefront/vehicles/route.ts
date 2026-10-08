import { storefrontHandler, StorefrontInputError } from '@/lib/commerce/storefront/auth'
import { listMakes, listModels } from '@/lib/commerce/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/vehicles            → makes
 *  GET /api/storefront/vehicles?make=dacia → models + generations */
export const GET = storefrontHandler(async (req, ctx) => {
  const make = new URL(req.url).searchParams.get('make')
  if (!make) return listMakes(ctx)
  if (!/^[a-z0-9-]{1,60}$/.test(make)) throw new StorefrontInputError('Invalid make')
  return listModels(ctx, make)
})
