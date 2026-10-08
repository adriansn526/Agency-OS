import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { runCommercePipeline } from '@/lib/commerce/pipeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let inFlight = false

/** POST /api/commerce/run — start the feed pipeline in the background (admin only). */
export async function POST() {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const running = await db.commerceFeedRun.findFirst({ where: { status: 'running', startedAt: { gt: new Date(Date.now() - 60 * 60_000) } } })
  if (inFlight || running) return NextResponse.json({ error: 'Un import rulează deja' }, { status: 409 })
  inFlight = true
  runCommercePipeline({ triggeredBy: 'admin', translateLimit: 600 })
    .catch((e) => console.error('[commerce/run]', e))
    .finally(() => { inFlight = false })
  return NextResponse.json({ ok: true, started: true }, { status: 202 })
}
