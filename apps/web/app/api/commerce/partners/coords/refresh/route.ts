import { NextResponse } from 'next/server'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { refreshPartnerCoords } from '@/lib/commerce/partners/coords'
import { respondPlaces } from '@/lib/commerce/partners/places-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

let running = false

/** POST /api/commerce/partners/coords/refresh { dryRun? } — refresh/geocode partner coordinates now (admin only). */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean }
  if (running) return NextResponse.json({ error: 'O reîmprospătare rulează deja' }, { status: 409 })
  running = true
  try {
    return await respondPlaces(() => refreshPartnerCoords({ dryRun: body.dryRun === true }))
  } finally { running = false }
}
