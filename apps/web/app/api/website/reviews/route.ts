import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { respond } from '@/lib/website/admin/errors'
import { listReviews } from '@/lib/website/admin/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/website/reviews?lineId=&status=pending|approved|rejected&page= */
export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const sp = new URL(req.url).searchParams
  return respond(() => listReviews(sp.get('lineId') ?? '', { status: sp.get('status') ?? undefined, page: Number(sp.get('page')) || 1 }))
}
