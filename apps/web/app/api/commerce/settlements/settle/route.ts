import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { settleJobs } from '@/lib/commerce/orders/admin'
import { respond } from '@/lib/commerce/partners/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/commerce/settlements/settle { partnerId, jobIds, ref } — mark finished jobs as paid to the partner. */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  const session = await auth()
  return respond(() => settleJobs(body, session?.user?.id ?? 'unknown'))
}
