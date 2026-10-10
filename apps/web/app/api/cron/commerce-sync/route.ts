import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/commerce/pipeline'
import { runSupplierSync } from '@/lib/commerce/sync/run'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 900

/**
 * Supplier price & stock sync, for external schedulers (the shipped crontab uses scripts/commerce/sync-supplier-cron.sh instead).
 * POST /api/cron/commerce-sync?job=feed|reprice   Auth: `Authorization: Bearer $CRON_SECRET` (fails closed if unset).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const job = req.nextUrl.searchParams.get('job')
  if (job !== 'feed' && job !== 'reprice') return NextResponse.json({ error: 'job must be feed or reprice' }, { status: 400 })
  try {
    const r = await runSupplierSync({ job, triggeredBy: 'cron' })
    return NextResponse.json({ ok: r.status !== 'failed' && r.status !== 'aborted', status: r.status, mode: r.mode, runId: r.runId, stats: r.stats, warnings: r.warnings, errors: r.errors })
  } catch (e) {
    console.error('[cron/commerce-sync]', e)
    return NextResponse.json({ ok: false, error: 'Sync failed' }, { status: 500 })
  }
}
export const GET = POST
