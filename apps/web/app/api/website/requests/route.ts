import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { respond } from '@/lib/website/admin/errors'
import { assertLine } from '@/lib/website/admin/service'
import { adminOverview } from '@/lib/website/requests/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/website/requests?lineId=&month=YYYY-MM&page= → { month, owed: [{ title, accepted, totalRon }], items: [requests with deliveries] }. Admin only. */
export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const sp = new URL(req.url).searchParams
  return respond(async () => { await assertLine(sp.get('lineId') ?? ''); return adminOverview(sp.get('lineId')!, { month: sp.get('month') ?? undefined, page: Number(sp.get('page')) || 1 }) })
}
