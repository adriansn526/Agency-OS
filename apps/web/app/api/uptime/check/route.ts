/**
 * Uptime Monitoring — Cron endpoint
 * Called every 5 minutes by external cron or internal scheduler
 * 
 * GET /api/uptime/check?secret=xxx
 */

import { NextResponse } from 'next/server'
import { runUptimeCheck } from '@/lib/uptime/checker'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // allow up to 60s for all checks

export async function GET(req: Request) {
  // Simple auth — verify cron secret
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  
  if (secret !== (process.env.UPTIME_CRON_SECRET || 'asns-uptime-2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runUptimeCheck()
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Uptime Cron] Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
