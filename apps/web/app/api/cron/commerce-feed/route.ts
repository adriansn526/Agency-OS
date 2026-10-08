import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron, runCommercePipeline } from '@/lib/commerce/pipeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 900

/**
 * Daily commerce feed pipeline (schedule: 05:00).
 * Auth: `Authorization: Bearer $CRON_SECRET` — fails closed when the secret is not configured.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runCommercePipeline({ triggeredBy: 'cron' })
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    console.error('[cron/commerce-feed]', e)
    return NextResponse.json({ ok: false, error: 'Pipeline failed' }, { status: 500 })
  }
}

export const GET = POST
