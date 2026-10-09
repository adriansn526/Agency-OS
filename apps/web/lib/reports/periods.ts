/**
 * Date-range presets and comparison periods for the reports dashboard.
 * All dates are plain YYYY-MM-DD strings handled in local calendar terms,
 * so there are no timezone shifts around midnight.
 */

export type PresetKey =
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'last3Months'
  | 'last6Months'
  | 'thisYear'

export type CompareMode = 'none' | 'previous' | 'lastYear'

export interface DateRange {
  from: string
  to: string
}

export const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: 'last7', label: 'Ultimele 7 zile' },
  { key: 'last30', label: 'Ultimele 30 zile' },
  { key: 'thisMonth', label: 'Luna aceasta' },
  { key: 'lastMonth', label: 'Luna trecută' },
  { key: 'last3Months', label: 'Ultimele 3 luni' },
  { key: 'last6Months', label: 'Ultimele 6 luni' },
  { key: 'thisYear', label: 'Anul acesta' },
]

export const COMPARE_OPTIONS: Array<{ key: CompareMode; label: string }> = [
  { key: 'none', label: 'Fără comparație' },
  { key: 'previous', label: 'Perioada anterioară' },
  { key: 'lastYear', label: 'Același interval, anul trecut' },
]

// ─── Date helpers ───

function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)

// ─── Presets ───

/** "Last N months" means the N most recent *complete* calendar months. */
export function getPresetRange(key: PresetKey, today = new Date()): DateRange {
  const y = today.getFullYear()
  const m = today.getMonth()
  const t = new Date(y, m, today.getDate())

  switch (key) {
    case 'last7':
      return { from: fmt(addDays(t, -6)), to: fmt(t) }
    case 'last30':
      return { from: fmt(addDays(t, -29)), to: fmt(t) }
    case 'thisMonth':
      return { from: fmt(new Date(y, m, 1)), to: fmt(t) }
    case 'lastMonth':
      return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) }
    case 'last3Months':
      return { from: fmt(new Date(y, m - 3, 1)), to: fmt(new Date(y, m, 0)) }
    case 'last6Months':
      return { from: fmt(new Date(y, m - 6, 1)), to: fmt(new Date(y, m, 0)) }
    case 'thisYear':
      return { from: fmt(new Date(y, 0, 1)), to: fmt(t) }
  }
}

/** Which preset (if any) the given range currently matches. */
export function matchPreset(range: DateRange, today = new Date()): PresetKey | null {
  for (const p of PRESETS) {
    const r = getPresetRange(p.key, today)
    if (r.from === range.from && r.to === range.to) return p.key
  }
  return null
}

// ─── Comparison ───

function isWholeMonths(from: Date, to: Date): boolean {
  const lastOfMonth = new Date(to.getFullYear(), to.getMonth() + 1, 0)
  return from.getDate() === 1 && to.getDate() === lastOfMonth.getDate()
}

export function getComparisonRange(range: DateRange, mode: CompareMode): DateRange | null {
  if (mode === 'none') return null
  const from = parse(range.from)
  const to = parse(range.to)

  if (mode === 'lastYear') {
    return {
      from: fmt(new Date(from.getFullYear() - 1, from.getMonth(), from.getDate())),
      to: fmt(new Date(to.getFullYear() - 1, to.getMonth(), to.getDate())),
    }
  }

  // previous period
  const monthSpan = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1

  // Year to date → same stretch of the previous year
  if (from.getMonth() === 0 && from.getDate() === 1 && monthSpan > 1 && !isWholeMonths(from, to)) {
    return getComparisonRange(range, 'lastYear')
  }

  // Month-aligned ranges (whole months, or the current month so far):
  // shift back by the same number of months, keeping the day within month bounds.
  if (from.getDate() === 1) {
    const prevFrom = new Date(from.getFullYear(), from.getMonth() - monthSpan, 1)
    const prevMonthEnd = new Date(to.getFullYear(), to.getMonth() - monthSpan + 1, 0)
    const prevTo = isWholeMonths(from, to)
      ? prevMonthEnd
      : new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), Math.min(to.getDate(), prevMonthEnd.getDate()))
    return { from: fmt(prevFrom), to: fmt(prevTo) }
  }

  const length = daysBetween(from, to) + 1
  return { from: fmt(addDays(from, -length)), to: fmt(addDays(from, -1)) }
}

export function formatRangeLabel(range: DateRange): string {
  const f = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${f.format(parse(range.from))} - ${f.format(parse(range.to))}`
}
