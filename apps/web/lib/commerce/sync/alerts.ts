/**
 * Alerts for the supplier sync: an ERP notification (SystemAlert, shown in the admin) plus Telegram when configured.
 * The same title is not re-sent within 12 hours (the job retries every 2 hours; one failure should not page 6 times).
 */
import { db } from '@repo/db'
import { sendTelegramAlert } from '../../notifications/telegram'

export interface AlertMsg {
  severity: 'high' | 'medium' | 'low'
  title: string
  lines: string[]
  runId?: string | null
}

const DEDUPE_MS = 12 * 3_600_000
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Returns true if an alert was actually raised (false = suppressed duplicate or delivery failed). */
export async function sendSyncAlert(a: AlertMsg): Promise<boolean> {
  const title = `Commerce sync: ${a.title}`.slice(0, 200)
  try {
    const dup = await db.systemAlert.findFirst({
      where: { source: 'commerce-sync', title, createdAt: { gt: new Date(Date.now() - DEDUPE_MS) } },
      select: { id: true },
    })
    if (dup) return false
    await db.systemAlert.create({
      data: { source: 'commerce-sync', title, description: a.lines.join('\n').slice(0, 4000), severity: a.severity, metadata: { runId: a.runId ?? null } },
    })
  } catch (e) {
    console.error('[commerce-sync] could not store ERP alert:', e instanceof Error ? e.message : e)
  }
  await sendTelegramAlert(`⚠️ <b>${esc(title)}</b>\n${esc(a.lines.join('\n').slice(0, 3000))}`, 'HTML').catch(() => false)
  return true
}
