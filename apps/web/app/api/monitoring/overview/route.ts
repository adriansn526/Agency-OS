/**
 * Monitoring Aggregation API
 * Fetches data from all monitoring sources in parallel
 * 
 * GET /api/monitoring/overview
 */

import { NextResponse } from 'next/server'
import { getUptimeStatus, getMonitoredDomains } from '@/lib/uptime/checker'
import { checkDisk, checkRam, checkSSL, checkDocker, checkPM2, checkEmail } from '@/lib/monitoring/system-health'
import { db } from '@repo/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const domains = await getMonitoredDomains()
    const clientMap = new Map(domains.map(d => [d.clientId, d.clientName]))

    // Collect SSL domains
    const infraDomains = ['asns.ro', 'admin.asns.ro', 'mail.asns.ro']
    const sslDomains = [...new Set([...infraDomains, ...domains.map(d => d.domain)])]

    const [uptimeStatus, recentIncidents, disk, ram, ssl, docker, pm2, email] = await Promise.all([
      getUptimeStatus(),
      db.uptimeIncident.findMany({ orderBy: { startedAt: 'desc' }, take: 20 }),
      checkDisk(),
      checkRam(),
      checkSSL(sslDomains),
      checkDocker(),
      checkPM2(),
      checkEmail(),
    ])

    // Enrich uptime with client names
    const enrichedUptime = uptimeStatus.map(s => ({
      ...s,
      clientName: s.clientId ? clientMap.get(s.clientId) || 'Unknown' : 'Unknown',
    }))

    const upCount = enrichedUptime.filter(d => d.isUp).length
    const downCount = enrichedUptime.filter(d => !d.isUp).length
    const slowCount = enrichedUptime.filter(d => d.isUp && d.responseMs > 3000).length

    return NextResponse.json({
      uptime: {
        domains: enrichedUptime,
        total: enrichedUptime.length,
        up: upCount,
        down: downCount,
        slow: slowCount,
        uptimePercent: enrichedUptime.length > 0 
          ? Math.round((upCount / enrichedUptime.length) * 100 * 10) / 10 
          : 100,
      },
      incidents: recentIncidents.map(i => ({
        domain: i.domain,
        startedAt: i.startedAt,
        resolvedAt: i.resolvedAt,
        durationMin: i.durationMin,
        cause: i.cause,
        clientName: clientMap.get(i.clientId || '') || 'Unknown',
      })),
      system: { disk, ram, ssl, docker, pm2, email },
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Monitoring Overview] Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
