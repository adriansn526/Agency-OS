/**
 * Uptime Status API — returns current status for all monitored domains
 * Used by the dashboard widget
 * 
 * GET /api/uptime/status
 */

import { NextResponse } from 'next/server'
import { getUptimeStatus, getMonitoredDomains } from '@/lib/uptime/checker'
import { db } from '@repo/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [status, domains, recentIncidents] = await Promise.all([
      getUptimeStatus(),
      getMonitoredDomains(),
      db.uptimeIncident.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
    ])

    // Enrich status with client names from domains list
    const clientMap = new Map(domains.map(d => [d.clientId, d.clientName]))
    const enriched = status.map(s => ({
      ...s,
      clientName: s.clientId ? clientMap.get(s.clientId) || 'Unknown' : 'Unknown',
    }))

    return NextResponse.json({
      domains: enriched,
      monitoredCount: domains.length,
      allUp: enriched.every(d => d.isUp),
      recentIncidents: recentIncidents.map(i => ({
        domain: i.domain,
        startedAt: i.startedAt,
        resolvedAt: i.resolvedAt,
        durationMin: i.durationMin,
        cause: i.cause,
      })),
    })
  } catch (err: any) {
    console.error('[Uptime Status] Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
