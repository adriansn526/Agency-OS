import { NextResponse } from 'next/server'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { getSyncOverview } from '@/lib/commerce/sync/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/commerce/sync — runs, files, settings, review queue (admin only). */
export async function GET() {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  return NextResponse.json(await getSyncOverview())
}
