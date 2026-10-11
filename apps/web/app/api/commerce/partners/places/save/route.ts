import { NextResponse } from 'next/server'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { saveAsLeads } from '@/lib/commerce/partners/leads'
import { respondPlaces } from '@/lib/commerce/partners/places-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/commerce/partners/places/save { searchId, placeIds } — save selected search results as CRM leads (internal only). */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  return respondPlaces(() => saveAsLeads(body), 201)
}
