import { storefrontHandler } from '@/lib/commerce/storefront/auth'
import { listCategories, resolveGeneration } from '@/lib/commerce/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/categories[?make=&model=&gen=] → category tree with product counts */
export const GET = storefrontHandler(async (req, ctx) => {
  const sp = new URL(req.url).searchParams
  const [make, model, gen] = [sp.get('make'), sp.get('model'), sp.get('gen')]
  const re = /^[a-z0-9-]{1,140}$/
  if (make && model && gen && re.test(make) && re.test(model) && re.test(gen)) {
    const g = await resolveGeneration(make, model, gen)
    if (!g) return null
    return listCategories(ctx, g.id)
  }
  return listCategories(ctx, null)
})
