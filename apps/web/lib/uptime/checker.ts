/**
 * Uptime Monitoring — Core checker
 * Extracts monitored domains from CRM clients, checks HTTP status,
 * stores results, manages incidents, and sends Telegram alerts.
 */

import { db } from '@repo/db'

// ─── Types ───

export interface MonitoredDomain {
  domain: string     // e.g. "swissamanet.ro"
  url: string        // e.g. "https://swissamanet.ro"
  clientId: string
  clientName: string
}

export interface CheckResult {
  domain: string
  url: string
  statusCode: number
  responseMs: number
  isUp: boolean
  error?: string
}

// ─── Domain Discovery ───

/**
 * Extracts all unique domains to monitor from active CRM clients.
 * Sources: client.website, client.gscSiteUrl, project metadata gscSiteUrl
 */
export async function getMonitoredDomains(): Promise<MonitoredDomain[]> {
  const clients = await db.client.findMany({
    where: { status: 'activ', deletedAt: null },
    select: {
      id: true,
      companyName: true,
      website: true,
      websites: true,
      gscSiteUrl: true,
      projects: {
        where: { status: { not: 'suspendat' } },
        select: { metadata: true },
      },
    },
  })

  const seen = new Set<string>()
  const domains: MonitoredDomain[] = []

  function addDomain(raw: string | null | undefined, clientId: string, clientName: string) {
    if (!raw) return
    // Normalize: remove protocol, sc-domain:, trailing slash
    let domain = raw
      .replace(/^https?:\/\//, '')
      .replace(/^sc-domain:/, '')
      .replace(/\/$/, '')
      .trim()
    if (!domain || domain.length < 4 || !domain.includes('.')) return

    const key = `${domain}__${clientId}`
    if (seen.has(key)) return
    seen.add(key)
    
    domains.push({
      domain,
      url: `https://${domain}`,
      clientId,
      clientName,
    })
  }

  for (const client of clients) {
    // Priority 1: websites[] array (multi-domain chip input)
    if (client.websites && client.websites.length > 0) {
      for (const w of client.websites) {
        addDomain(w, client.id, client.companyName)
      }
    } else {
      // Fallback: legacy single website field
      addDomain(client.website, client.id, client.companyName)
    }
    
    // Always check GSC and project metadata
    addDomain(client.gscSiteUrl, client.id, client.companyName)

    for (const proj of client.projects) {
      const meta = (proj.metadata || {}) as any
      addDomain(meta.gscSiteUrl, client.id, client.companyName)
    }
  }

  return domains
}

// ─── HTTP Check ───

/**
 * Check a single domain's HTTP status with timeout
 */
export async function checkDomain(domain: MonitoredDomain): Promise<CheckResult> {
  const start = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const res = await fetch(domain.url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'ASNS-UptimeMonitor/1.0' },
    })
    clearTimeout(timeout)
    const responseMs = Date.now() - start
    const isUp = res.status >= 200 && res.status < 400

    return {
      domain: domain.domain,
      url: domain.url,
      statusCode: res.status,
      responseMs,
      isUp,
      error: isUp ? undefined : `HTTP ${res.status} ${res.statusText}`,
    }
  } catch (err: any) {
    clearTimeout(timeout)
    const responseMs = Date.now() - start
    const isTimeout = err.name === 'AbortError'

    return {
      domain: domain.domain,
      url: domain.url,
      statusCode: 0,
      responseMs,
      isUp: false,
      error: isTimeout ? 'Timeout (10s)' : (err.message || 'Unknown error'),
    }
  }
}

// ─── Store Results & Manage Incidents ───

/**
 * Run a full uptime check cycle:
 * 1. Discover domains
 * 2. Check each
 * 3. Store results
 * 4. Open/close incidents
 * 5. Send Telegram alerts
 */
export async function runUptimeCheck(): Promise<{
  checked: number
  up: number
  down: number
  alerts: string[]
}> {
  const domains = await getMonitoredDomains()
  const results: CheckResult[] = []
  const alerts: string[] = []

  // Check all domains in parallel (batches of 5)
  for (let i = 0; i < domains.length; i += 5) {
    const batch = domains.slice(i, i + 5)
    const batchResults = await Promise.all(batch.map(d => checkDomain(d)))
    results.push(...batchResults)
  }

  // Store results & manage incidents
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const domain = domains[i]

    // Store check
    await db.uptimeCheck.create({
      data: {
        domain: result.domain,
        clientId: domain.clientId,
        statusCode: result.statusCode,
        responseMs: result.responseMs,
        isUp: result.isUp,
        error: result.error,
      },
    })

    if (!result.isUp) {
      // Check if this is a CONFIRMED down (retry once after 5s)
      await new Promise(r => setTimeout(r, 5000))
      const retry = await checkDomain(domain)

      if (!retry.isUp) {
        // Check for existing open incident
        const existing = await db.uptimeIncident.findFirst({
          where: { domain: result.domain, resolvedAt: null },
        })

        if (!existing) {
          // NEW incident — create & alert
          await db.uptimeIncident.create({
            data: {
              domain: result.domain,
              clientId: domain.clientId,
              cause: result.error || `HTTP ${result.statusCode}`,
              notified: true,
            },
          })

          const msg = `⚠️ *SITE DOWN*: ${result.domain}\n` +
            `📊 Status: ${result.error || result.statusCode}\n` +
            `🏢 Client: ${domain.clientName}\n` +
            `⏱ Response: ${result.responseMs}ms\n` +
            `🕐 Detectat: ${new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' })}`
          
          alerts.push(msg)
          await sendTelegramAlert(msg)
        }
      }
    } else {
      // Site is UP — check if there's an open incident to resolve
      const openIncident = await db.uptimeIncident.findFirst({
        where: { domain: result.domain, resolvedAt: null },
      })

      if (openIncident) {
        const now = new Date()
        const durationMin = Math.round((now.getTime() - openIncident.startedAt.getTime()) / 60000)
        
        await db.uptimeIncident.update({
          where: { id: openIncident.id },
          data: { resolvedAt: now, durationMin },
        })

        const msg = `✅ *SITE UP*: ${result.domain}\n` +
          `⏱ Downtime: ${durationMin} minute\n` +
          `📊 Response: ${result.responseMs}ms\n` +
          `🏢 Client: ${domain.clientName}`
        
        alerts.push(msg)
        await sendTelegramAlert(msg)
      }
    }
  }

  const up = results.filter(r => r.isUp).length
  return { checked: results.length, up, down: results.length - up, alerts }
}

// ─── Telegram ───

async function sendTelegramAlert(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('[Uptime] Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing)')
    return
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    })
  } catch (err) {
    console.error('[Uptime] Telegram send failed:', err)
  }
}

// ─── Query Helpers ───

/**
 * Get current status for all monitored domains (latest check per domain)
 */
export async function getUptimeStatus() {
  // Get all unique domains from recent checks
  const recentChecks = await db.uptimeCheck.findMany({
    orderBy: { checkedAt: 'desc' },
    take: 500,
  })

  // Group by domain, take latest
  const domainMap = new Map<string, typeof recentChecks[0]>()
  for (const check of recentChecks) {
    if (!domainMap.has(check.domain)) {
      domainMap.set(check.domain, check)
    }
  }

  // Get open incidents
  const openIncidents = await db.uptimeIncident.findMany({
    where: { resolvedAt: null },
  })
  const incidentMap = new Map(openIncidents.map(i => [i.domain, i]))

  // Get uptime % (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const last24h = await db.uptimeCheck.groupBy({
    by: ['domain'],
    where: { checkedAt: { gte: since } },
    _count: { id: true },
    _avg: { responseMs: true },
  })

  const uptimeCounts = await db.uptimeCheck.groupBy({
    by: ['domain'],
    where: { checkedAt: { gte: since }, isUp: true },
    _count: { id: true },
  })

  const totalMap = new Map(last24h.map(r => [r.domain, { total: r._count.id, avgMs: Math.round(r._avg.responseMs || 0) }]))
  const upMap = new Map(uptimeCounts.map(r => [r.domain, r._count.id]))

  return Array.from(domainMap.entries()).map(([domain, check]) => {
    const total = totalMap.get(domain)
    const upCount = upMap.get(domain) || 0
    const uptimePercent = total ? Math.round((upCount / total.total) * 100 * 10) / 10 : null
    const incident = incidentMap.get(domain)

    return {
      domain,
      clientId: check.clientId,
      isUp: check.isUp,
      statusCode: check.statusCode,
      responseMs: check.responseMs,
      error: check.error,
      lastCheck: check.checkedAt,
      uptimePercent24h: uptimePercent,
      avgResponseMs: total?.avgMs || check.responseMs,
      activeIncident: incident ? {
        since: incident.startedAt,
        cause: incident.cause,
      } : null,
    }
  })
}
