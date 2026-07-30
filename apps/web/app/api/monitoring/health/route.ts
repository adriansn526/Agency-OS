/**
 * System Health API — Cron endpoint
 * Checks system resources + email + SSL and sends Telegram alerts
 *
 * GET /api/monitoring/health?secret=xxx
 */

import { NextResponse } from 'next/server'
import { getFullHealthReport } from '@/lib/monitoring/system-health'
import { getMonitoredDomains } from '@/lib/uptime/checker'
import { sendTelegramAlert } from '@/lib/notifications/telegram'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Thresholds
const DISK_WARNING = 85
const DISK_CRITICAL = 95
const RAM_WARNING = 90
const SSL_WARN_DAYS = 14
const QUEUE_WARN = 50

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const alertOnly = searchParams.get('alert') === '1' // If true, only check & alert, no full response

  if (secret !== (process.env.UPTIME_CRON_SECRET || 'asns-uptime-2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Collect SSL domains from monitored sites + known infrastructure
    const monitoredDomains = await getMonitoredDomains()
    const infraDomains = ['asns.ro', 'admin.asns.ro', 'mail.asns.ro']
    const allDomains = [
      ...new Set([
        ...infraDomains,
        ...monitoredDomains.map(d => d.domain),
      ]),
    ]

    const report = await getFullHealthReport(allDomains)
    const alerts: string[] = []

    // ── Disk alerts ──
    if (report.disk.usedPercent >= DISK_CRITICAL) {
      alerts.push(
        `🔴 *DISK CRITICAL* — ${report.disk.usedPercent}% folosit!\n` +
        `📦 Disponibil: ${report.disk.available}\n` +
        `⚠️ Serverul poate deveni instabil!`
      )
    } else if (report.disk.usedPercent >= DISK_WARNING) {
      alerts.push(
        `🟡 *DISK WARNING* — ${report.disk.usedPercent}% folosit\n` +
        `📦 Disponibil: ${report.disk.available}`
      )
    }

    // ── RAM alerts ──
    if (report.ram.usedPercent >= RAM_WARNING) {
      alerts.push(
        `🟡 *RAM* ${report.ram.usedPercent}% — ${report.ram.availableGb}Gi disponibil\n` +
        `📊 Swap: ${report.ram.swapUsedPercent}%`
      )
    }

    // ── SSL alerts ──
    for (const cert of report.ssl) {
      if (cert.isExpired) {
        alerts.push(`🔴 *SSL EXPIRAT* — ${cert.domain}\n⚠️ Certificatul a expirat!`)
      } else if (cert.isExpiring) {
        alerts.push(`🟡 *SSL EXPIRING* — ${cert.domain}\n📅 Expiră în ${cert.daysRemaining} zile (${cert.validUntil})`)
      }
    }

    // ── Docker alerts ──
    if (report.docker.unhealthy.length > 0) {
      const names = report.docker.unhealthy.slice(0, 5).map(c => `  • ${c.name}: ${c.status}`).join('\n')
      alerts.push(
        `🟡 *DOCKER* — ${report.docker.unhealthy.length} containere down\n${names}`
      )
    }

    // ── Email alerts ──
    const emailIssues: string[] = []
    if (!report.email.smtpResponsive) emailIssues.push('SMTP')
    if (!report.email.imapResponsive) emailIssues.push('IMAP')
    if (!report.email.webmailResponsive) emailIssues.push('Webmail')
    if (report.email.queueSize > QUEUE_WARN) emailIssues.push(`Queue: ${report.email.queueSize}`)

    if (emailIssues.length > 0) {
      alerts.push(
        `🔴 *EMAIL DOWN* — ${emailIssues.join(', ')}\n` +
        `📧 mail.asns.ro — servicii indisponibile`
      )
    }

    // ── PM2 crash detection + auto-restart ──
    const crashedPm2 = report.pm2.filter(p => p.status !== 'online' && p.status !== 'stopped')
    if (crashedPm2.length > 0) {
      const restartResults: string[] = []
      for (const proc of crashedPm2) {
        try {
          const { exec } = require('child_process')
          const { promisify } = require('util')
          const execAsync = promisify(exec)
          await execAsync(`pm2 restart ${proc.id}`, { timeout: 10000 })
          restartResults.push(`  ✅ ${proc.name} — restartat automat`)
        } catch {
          restartResults.push(`  ❌ ${proc.name} — restart eșuat!`)
        }
      }
      alerts.push(
        `🔄 *PM2 AUTO-RESTART* — ${crashedPm2.length} procese crashed\n` +
        restartResults.join('\n') + '\n' +
        `\n🔁 Restartate automat de monitorizare`
      )
    }

    // Send alerts
    for (const alert of alerts) {
      const fullMsg = `🔭 *Agency-OS Monitoring*\n🕐 ${new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' })}\n\n${alert}`
      await sendTelegramAlert(fullMsg)
      await new Promise(r => setTimeout(r, 300))
    }

    return NextResponse.json({
      ok: true,
      alerts: alerts.length,
      report: alertOnly ? undefined : report,
      timestamp: report.timestamp,
    })
  } catch (err: any) {
    console.error('[System Health] Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
