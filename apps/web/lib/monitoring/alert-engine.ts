/**
 * Monitoring Alert Engine
 * Checks thresholds and dispatches Telegram notifications
 */

import { sendTelegramAlert, sendTelegramNotification } from '@/lib/notifications/telegram'

// ─── Types ───

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface Alert {
  id: string
  type: string
  severity: AlertSeverity
  title: string
  message: string
  domain?: string
  clientName?: string
  value?: number
  threshold?: number
  timestamp: Date
}

// ─── Thresholds ───

export const THRESHOLDS = {
  // Uptime
  RESPONSE_SLOW_MS: 3000,
  RESPONSE_SLOW_COUNT: 3,    // consecutive

  // PageSpeed
  PAGESPEED_DROP_POINTS: 20, // score dropped by this much
  PAGESPEED_CRITICAL: 40,    // absolute score

  // GSC
  GSC_TRAFFIC_DROP_PCT: 30,  // clicks dropped vs previous period

  // Google Ads
  ADS_OVERSPEND_PCT: 150,    // % of daily budget

  // PostHog
  POSTHOG_ERROR_RATE_PCT: 5, // error rate threshold
} as const

// ─── Alert Formatters ───

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
}

function formatAlert(alert: Alert): string {
  const emoji = SEVERITY_EMOJI[alert.severity]
  const time = alert.timestamp.toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' })
  const lines = [
    `${emoji} *${alert.title}*`,
    '',
    alert.message,
    '',
  ]

  if (alert.domain) lines.push(`🌐 ${alert.domain}`)
  if (alert.clientName) lines.push(`🏢 ${alert.clientName}`)
  if (alert.value !== undefined && alert.threshold !== undefined) {
    lines.push(`📊 Valoare: ${alert.value} (prag: ${alert.threshold})`)
  }
  lines.push(`🕐 ${time}`)

  return lines.join('\n')
}

// ─── Alert Dispatchers ───

export async function sendAlert(alert: Alert): Promise<boolean> {
  const message = formatAlert(alert)
  return sendTelegramAlert(message)
}

export async function sendAlerts(alerts: Alert[]): Promise<number> {
  let sent = 0
  for (const alert of alerts) {
    // Group critical alerts immediately, batch warnings
    const success = await sendAlert(alert)
    if (success) sent++
    // Small delay to avoid Telegram rate limits
    await new Promise(r => setTimeout(r, 300))
  }
  return sent
}

// ─── Check Functions ───

/**
 * Check PageSpeed scores for anomalies
 */
export function checkPageSpeedAlerts(
  results: Array<{
    domain: string
    performanceScore: number
    previousScore?: number
    clientName?: string
  }>
): Alert[] {
  const alerts: Alert[] = []

  for (const r of results) {
    // Critical: score below absolute threshold
    if (r.performanceScore > 0 && r.performanceScore < THRESHOLDS.PAGESPEED_CRITICAL) {
      alerts.push({
        id: `psi-critical-${r.domain}`,
        type: 'pagespeed_critical',
        severity: 'critical',
        title: 'PageSpeed CRITIC',
        message: `Scorul PageSpeed pentru ${r.domain} este foarte scăzut: ${r.performanceScore}/100`,
        domain: r.domain,
        clientName: r.clientName,
        value: r.performanceScore,
        threshold: THRESHOLDS.PAGESPEED_CRITICAL,
        timestamp: new Date(),
      })
    }
    // Warning: score dropped significantly
    else if (r.previousScore && (r.previousScore - r.performanceScore) >= THRESHOLDS.PAGESPEED_DROP_POINTS) {
      alerts.push({
        id: `psi-drop-${r.domain}`,
        type: 'pagespeed_drop',
        severity: 'warning',
        title: 'PageSpeed Scădere',
        message: `Scorul PageSpeed pentru ${r.domain} a scăzut de la ${r.previousScore} la ${r.performanceScore}`,
        domain: r.domain,
        clientName: r.clientName,
        value: r.performanceScore,
        threshold: r.previousScore,
        timestamp: new Date(),
      })
    }
  }

  return alerts
}

/**
 * Check GSC traffic for anomalies (week-over-week)
 */
export function checkGSCAlerts(
  results: Array<{
    siteUrl: string
    currentClicks: number
    previousClicks: number
    clientName?: string
  }>
): Alert[] {
  const alerts: Alert[] = []

  for (const r of results) {
    if (r.previousClicks > 10) { // minimum traffic to compare
      const dropPct = ((r.previousClicks - r.currentClicks) / r.previousClicks) * 100
      if (dropPct >= THRESHOLDS.GSC_TRAFFIC_DROP_PCT) {
        alerts.push({
          id: `gsc-drop-${r.siteUrl}`,
          type: 'gsc_traffic_drop',
          severity: 'warning',
          title: 'Trafic organic în scădere',
          message: `Clicks pe ${r.siteUrl} au scăzut cu ${Math.round(dropPct)}% (${r.previousClicks} → ${r.currentClicks})`,
          domain: r.siteUrl,
          clientName: r.clientName,
          value: r.currentClicks,
          threshold: r.previousClicks,
          timestamp: new Date(),
        })
      }
    }
  }

  return alerts
}

/**
 * Check Ads spend anomalies
 */
export function checkAdsAlerts(
  results: Array<{
    accountName: string
    currentSpend: number
    dailyBudget: number
    clientName?: string
  }>
): Alert[] {
  const alerts: Alert[] = []

  for (const r of results) {
    if (r.dailyBudget > 0) {
      const spendPct = (r.currentSpend / r.dailyBudget) * 100
      if (spendPct >= THRESHOLDS.ADS_OVERSPEND_PCT) {
        alerts.push({
          id: `ads-overspend-${r.accountName}`,
          type: 'ads_overspend',
          severity: 'warning',
          title: 'Google Ads Overspend',
          message: `Contul ${r.accountName} a cheltuit ${spendPct.toFixed(0)}% din bugetul zilnic (${r.currentSpend.toFixed(2)}€ / ${r.dailyBudget.toFixed(2)}€)`,
          clientName: r.clientName,
          value: r.currentSpend,
          threshold: r.dailyBudget,
          timestamp: new Date(),
        })
      }
    }
  }

  return alerts
}

// ─── Daily Digest ───

export async function sendDailyDigest(data: {
  uptime: { total: number; up: number; down: number; incidents: string[] }
  pagespeed: Array<{ domain: string; score: number }>
  gsc?: { totalClicks: number; changePct: number }
  ads?: { totalSpend: number; totalConversions: number }
}): Promise<boolean> {
  const now = new Date().toLocaleDateString('ro-RO', { 
    timeZone: 'Europe/Bucharest',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const lines = [
    `📊 *Daily Digest — ${now}*`,
    '',
    `📡 *Uptime*: ${data.uptime.up}/${data.uptime.total} site-uri online`,
  ]

  if (data.uptime.down > 0) {
    lines.push(`⚠️ ${data.uptime.down} site-uri DOWN!`)
    for (const inc of data.uptime.incidents) {
      lines.push(`   • ${inc}`)
    }
  }

  lines.push('')
  lines.push('🚀 *PageSpeed (mobile)*:')
  const sorted = [...data.pagespeed].sort((a, b) => a.score - b.score)
  for (const ps of sorted.slice(0, 5)) {
    const indicator = ps.score >= 90 ? '🟢' : ps.score >= 50 ? '🟡' : '🔴'
    lines.push(`   ${indicator} ${ps.domain}: ${ps.score}/100`)
  }

  if (data.gsc) {
    const arrow = data.gsc.changePct >= 0 ? '📈' : '📉'
    lines.push('')
    lines.push(`🔍 *Search Console*: ${data.gsc.totalClicks} clicks (${arrow} ${data.gsc.changePct > 0 ? '+' : ''}${data.gsc.changePct.toFixed(1)}%)`)
  }

  if (data.ads) {
    lines.push(`💰 *Google Ads*: ${data.ads.totalSpend.toFixed(2)}€ spend, ${data.ads.totalConversions} conversii`)
  }

  return sendTelegramAlert(lines.join('\n'))
}
