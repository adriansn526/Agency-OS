import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { settlementReport } from '@/lib/commerce/orders/admin'
import { respond } from '@/lib/commerce/partners/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/commerce/settlements?partnerId=&from=&to= — what is owed to / paid to each partner service. */
export async function GET(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const sp = new URL(req.url).searchParams
  const date = (v: string | null) => (v && !Number.isNaN(Date.parse(v)) ? v : undefined)
  return respond(() => settlementReport({ partnerId: sp.get('partnerId') ?? undefined, from: date(sp.get('from')), to: date(sp.get('to')) }))
}
