import { NextResponse } from 'next/server'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { respond } from '@/lib/commerce/partners/http'
import { importPartners } from '@/lib/commerce/partners/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/commerce/partners/import { csv, dryRun } — CSV (e.g. Google Maps export) → prospects. dryRun defaults to true. */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  return respond(() => importPartners(body))
}
