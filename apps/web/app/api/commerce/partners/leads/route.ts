import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { listGoogleLeads } from '@/lib/commerce/partners/leads'
import { respond } from '@/lib/commerce/partners/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/commerce/partners/leads — leads found through Google Places, waiting to be confirmed. */
export async function GET() {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  return respond(() => listGoogleLeads())
}
