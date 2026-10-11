import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { listOrders } from '@/lib/commerce/orders/admin'
import { respond } from '@/lib/commerce/partners/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/commerce/orders?status=&q=&service=1 — storefront orders (admin only). */
export async function GET(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const sp = new URL(req.url).searchParams
  return respond(() => listOrders({ status: sp.get('status') ?? undefined, q: sp.get('q') ?? undefined, service: sp.get('service') === '1' }))
}
