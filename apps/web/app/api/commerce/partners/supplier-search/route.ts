import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { respond } from '@/lib/commerce/partners/http'
import { searchLinkableSuppliers } from '@/lib/commerce/partners/supplier-link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/commerce/partners/supplier-search?q= — existing suppliers a partner can be linked to (admin only). */
export async function GET(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  return respond(() => searchLinkableSuppliers(new URL(req.url).searchParams.get('q') ?? ''))
}
