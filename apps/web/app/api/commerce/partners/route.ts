import { NextResponse } from 'next/server'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { respond } from '@/lib/commerce/partners/http'
import { createPartner, listPartners } from '@/lib/commerce/partners/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/commerce/partners?status=&q=&county= — partner service registry (admin only). */
export async function GET(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const sp = new URL(req.url).searchParams
  return respond(() => listPartners({ status: sp.get('status') ?? undefined, q: sp.get('q')?.slice(0, 100) ?? undefined, county: sp.get('county')?.slice(0, 100) ?? undefined }))
}

/** POST /api/commerce/partners — create one partner (starts as prospect). */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  return respond(() => createPartner(body), 201)
}
