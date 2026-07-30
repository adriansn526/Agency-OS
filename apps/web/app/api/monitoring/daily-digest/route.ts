/**
 * Daily Digest — Telegram summary endpoint
 * Aggregates all monitoring data and sends a daily summary
 * 
 * GET /api/monitoring/daily-digest?secret=xxx
 */

import { NextResponse } from 'next/server'
import { getUptimeStatus, getMonitoredDomains } from '@/lib/uptime/checker'
import { runPageSpeed } from '@/lib/integrations/pagespeed'
import { sendDailyDigest } from '@/lib/monitoring/alert-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== (process.env.UPTIME_CRON_SECRET || 'asns-uptime-2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Uptime status
    const uptimeStatus = await getUptimeStatus()
    const upCount = uptimeStatus.filter(s => s.isUp).length
    const downCount = uptimeStatus.filter(s => !s.isUp).length
    const incidents = uptimeStatus
      .filter(s => s.activeIncident)
      .map(s => `${s.domain}: ${s.activeIncident?.cause}`)

    // 2. PageSpeed — quick check top domains (limit to 5 to keep fast)
    const domains = await getMonitoredDomains()
    const uniqueUrls = [...new Set(domains.map(d => d.url))].slice(0, 5)
    const pagespeedResults: Array<{ domain: string; score: number }> = []
    
    for (const url of uniqueUrls) {
      try {
        const result = await runPageSpeed(url, 'mobile')
        pagespeedResults.push({ 
          domain: result.domain, 
          score: result.performanceScore 
        })
        await new Promise(r => setTimeout(r, 1500))
      } catch {
        // Skip failed checks in digest
      }
    }

    // 3. Send digest
    const sent = await sendDailyDigest({
      uptime: {
        total: uptimeStatus.length,
        up: upCount,
        down: downCount,
        incidents,
      },
      pagespeed: pagespeedResults,
    })

    return NextResponse.json({
      ok: true,
      sent,
      uptime: { total: uptimeStatus.length, up: upCount, down: downCount },
      pagespeed: pagespeedResults,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Daily Digest] Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
