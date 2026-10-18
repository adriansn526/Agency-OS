/**
 * When outreach (SMS from the call modal, scheduled email campaigns) may go out: allowed weekdays and hours, Europe/Bucharest.
 * Editable per business line (Marketing → Website → Prezentare, stored in WebsiteChannel.config.sendingWindow); lines without a website channel
 * and lines that never set it use the default: Monday–Friday, 9:00–18:00.
 */
import { z } from 'zod'

export interface SendingWindow { /** 1 = Monday … 7 = Sunday */ days: number[]; /** first allowed hour (0–23) */ from: number; /** first hour NOT allowed (1–24) */ to: number }
export const DEFAULT_WINDOW: SendingWindow = { days: [1, 2, 3, 4, 5], from: 9, to: 18 }

export const sendingWindowSchema = z.object({
  days: z.array(z.number().int().min(1).max(7)).min(1, 'Alege cel puțin o zi').max(7),
  from: z.number().int().min(0).max(23),
  to: z.number().int().min(1).max(24),
}).refine((w) => w.to > w.from, { message: 'Ora de sfârșit trebuie să fie după ora de început' })
  .transform((w): SendingWindow => ({ ...w, days: [...new Set(w.days)].sort((a, b) => a - b) }))

/** A stored value, or the default when it is missing or invalid (a broken setting must never block or open everything). */
export function parseSendingWindow(raw: unknown): SendingWindow {
  const r = sendingWindowSchema.safeParse(raw)
  return r.success ? r.data : { ...DEFAULT_WINDOW, days: [...DEFAULT_WINDOW.days] }
}

const ISO_DAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

export function withinWindow(now: Date, w: SendingWindow = DEFAULT_WINDOW): boolean {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bucharest', weekday: 'short', hour: '2-digit', hour12: false }).formatToParts(now)
  const day = ISO_DAY[p.find((x) => x.type === 'weekday')!.value]!
  const hour = Number(p.find((x) => x.type === 'hour')!.value) % 24
  return w.days.includes(day) && hour >= w.from && hour < w.to
}

const NAMES = ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică']
/** "luni–vineri, între 9:00 și 18:00" */
export function describeWindow(w: SendingWindow): string {
  const runs: number[][] = []
  for (const d of w.days) { const last = runs[runs.length - 1]; if (last && last[last.length - 1] === d - 1) last.push(d); else runs.push([d]) }
  const part = (r: number[]) => (r.length === 1 ? NAMES[r[0]! - 1]! : r.length === 2 ? `${NAMES[r[0]! - 1]} și ${NAMES[r[1]! - 1]}` : `${NAMES[r[0]! - 1]}–${NAMES[r[r.length - 1]! - 1]}`)
  const days = runs.length === 1 && runs[0]!.length === 7 ? 'în fiecare zi' : runs.map(part).join(', ')
  return `${days}, între ${w.from}:00 și ${w.to}:00`
}

/** The window of one business line. */
export async function loadSendingWindow(lineId: string): Promise<SendingWindow> {
  const { db } = await import('@repo/db')
  const ch = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { config: true } })
  return parseSendingWindow((ch?.config as { sendingWindow?: unknown } | null)?.sendingWindow)
}
