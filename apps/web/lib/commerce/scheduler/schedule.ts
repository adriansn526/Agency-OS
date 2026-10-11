/**
 * Schedules for the commerce jobs and the "next run" computation, always in Romanian local time (DST-aware).
 *
 *   times     fixed times of day            { mode: "times", days: [1..7], times: ["05:00", "13:30"] }
 *   interval  every N hours inside a window { mode: "interval", days: [1..7], everyHours: 2, from: "05:00", to: "13:00" }
 *
 * days are ISO weekdays (1 = Monday … 7 = Sunday). A local time that does not exist (spring-forward gap) is skipped for that day;
 * an ambiguous one (autumn fall-back) runs once.
 */
import { z } from 'zod'

export const TZ = 'Europe/Bucharest'
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const Days = z.array(z.number().int().min(1).max(7)).min(1, 'Alege cel puțin o zi').max(7).transform((d) => [...new Set(d)].sort((a, b) => a - b))

export const ScheduleSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('times'), days: Days, times: z.array(z.string().regex(HHMM, 'Oră invalidă (HH:MM)')).min(1, 'Adaugă cel puțin o oră').max(12).transform((t) => [...new Set(t)].sort()) }),
  z.object({
    mode: z.literal('interval'), days: Days, everyHours: z.number().int().min(1).max(12),
    from: z.string().regex(HHMM, 'Oră invalidă (HH:MM)'), to: z.string().regex(HHMM, 'Oră invalidă (HH:MM)'),
  }).refine((s) => toMin(s.from) < toMin(s.to), { message: 'Ora de început trebuie să fie înaintea celei de sfârșit', path: ['to'] }),
])
export type Schedule = z.infer<typeof ScheduleSchema>

export function timesOfDay(s: Schedule): string[] {
  if (s.mode === 'times') return s.times
  const out: string[] = []
  for (let m = toMin(s.from); m <= toMin(s.to); m += s.everyHours * 60) out.push(fromMin(m))
  return out
}

// ─── time zone arithmetic (no dependencies: Intl only) ───
const fmtCache = new Map<string, Intl.DateTimeFormat>()
function parts(tz: string, utcMs: number) {
  let f = fmtCache.get(tz)
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); fmtCache.set(tz, f) }
  const o: Record<string, number> = {}
  for (const p of f.formatToParts(new Date(utcMs))) if (p.type !== 'literal') o[p.type] = Number(p.value)
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number }
}
const offsetMin = (tz: string, utcMs: number) => {
  const p = parts(tz, utcMs)
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000) / 60_000
}

/** UTC instant for a wall-clock time in `tz`, or null if that wall-clock time does not exist (DST gap). */
export function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number, tz = TZ): number | null {
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  let t = guess - offsetMin(tz, guess) * 60_000
  t = guess - offsetMin(tz, t) * 60_000
  const p = parts(tz, t)
  return p.year === y && p.month === m && p.day === d && p.hour === hh && p.minute === mm ? t : null
}

const isoWeekday = (y: number, m: number, d: number) => { const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return w === 0 ? 7 : w }

/** First run strictly after `after`, or null if the schedule has no valid run in the next ~2 weeks. */
export function nextRun(s: Schedule, after: Date, tz = TZ): Date | null {
  const base = parts(tz, after.getTime())
  const times = timesOfDay(s)
  for (let i = 0; i < 15; i++) {
    const day = new Date(Date.UTC(base.year, base.month - 1, base.day + i))
    const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate()
    if (!s.days.includes(isoWeekday(y, m, d))) continue
    for (const t of times) {
      const at = zonedToUtc(y, m, d, Number(t.slice(0, 2)), Number(t.slice(3)), tz)
      if (at != null && at > after.getTime()) return new Date(at)
    }
  }
  return null
}

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum']
export function describeSchedule(s: Schedule): string {
  const d = s.days.length === 7 ? 'zilnic' : s.days.join() === '1,2,3,4,5' ? 'Luni–Vineri' : s.days.map((x) => DAY_NAMES[x]).join(', ')
  const t = s.mode === 'times' ? `la ${s.times.join(', ')}` : `la fiecare ${s.everyHours} ${s.everyHours === 1 ? 'oră' : 'ore'}, ${s.from}–${s.to}`
  return `${d}, ${t} (ora României)`
}
