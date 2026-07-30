/**
 * PageSpeed Monitoring — Cron endpoint
 * Runs PageSpeed Insights on all monitored domains
 * 
 * GET /api/monitoring/pagespeed?secret=xxx
 */

import { NextResponse } from 'next/server'
import { getMonitoredDomains } from '@/lib/uptime/checker'
import { runPageSpeed, type PageSpeedResult } from '@/lib/integrations/pagespeed'
import { checkPageSpeedAlerts, sendAlerts } from '@/lib/monitoring/alert-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // PageSpeed can be slow

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const strategy = (searchParams.get('strategy') || 'mobile') as 'mobile' | 'desktop'

  if (secret !== (process.env.UPTIME_CRON_SECRET || 'asns-uptime-2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const domains = await getMonitoredDomains()
    // Deduplicate by domain (a client might have same domain in multiple fields)
    const uniqueUrls = [...new Set(domains.map(d => d.url))]

    const results: PageSpeedResult[] = []
    for (const url of uniqueUrls) {
      console.log(`[PageSpeed] Checking ${url}...`)
      const result = await runPageSpeed(url, strategy)
      results.push(result)
      // PageSpeed API has rate limits — add delay
      await new Promise(r => setTimeout(r, 2000))
    }

    // Check for alerts
    const alertData = results.map(r => ({
      domain: r.domain,
      performanceScore: r.performanceScore,
      clientName: domains.find(d => d.url === r.url)?.clientName,
    }))

    const alerts = checkPageSpeedAlerts(alertData)
    const alertsSent = alerts.length > 0 ? await sendAlerts(alerts) : 0

    return NextResponse.json({
      ok: true,
      strategy,
      checked: results.length,
      results: results.map(r => ({
        domain: r.domain,
        performance: r.performanceScore,
        accessibility: r.accessibilityScore,
        seo: r.seoScore,
        bestPractices: r.bestPracticesScore,
        lcp: Math.round(r.vitals.lcp),
        cls: r.vitals.cls.toFixed(3),
        tbt: Math.round(r.vitals.tbt),
        error: r.error,
      })),
      alertsSent,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[PageSpeed Cron] Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
