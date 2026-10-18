/** Small pure helpers of the call workspace (tested). */
export const OUTCOMES = [
  { value: 'nu_raspunde', label: 'Nu răspunde', hint: 'Rămâne în coadă; poți programa o nouă încercare' },
  { value: 'interesat', label: 'Interesat', hint: 'Trece în „În discuții”' },
  { value: 'revin', label: 'Revin mai târziu', hint: 'Trece în „Contactat”; alege data' },
  { value: 'refuza', label: 'Refuză', hint: 'Închide contactul: „Refuzat” și nu mai primește mesaje' },
  { value: 'numar_gresit', label: 'Număr greșit', hint: 'Nu schimbă etapa' },
] as const
export type OutcomeValue = (typeof OUTCOMES)[number]['value']

/** Romanian national number → dial string for the phone or Phone Link on a PC (international format). */
export function telHref(phone: string | null | undefined): string | null {
  const d = String(phone ?? '').replace(/\D/g, '')
  const n = d.startsWith('0040') ? d.slice(2) : d.startsWith('40') && d.length === 11 ? d : d.startsWith('0') && d.length === 10 ? '4' + d : ''
  return n ? `tel:+${n}` : null
}

export const fmtTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/** Quick callback choices, in local time: tomorrow 10:00, in 3 days 10:00, next Monday 10:00. Weekends are skipped (calls go out on weekdays). */
export function quickCallbacks(now = new Date()): { label: string; at: Date }[] {
  const at = (days: number) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(10, 0, 0, 0); while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1); return d }
  const monday = new Date(now); monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7)); monday.setHours(10, 0, 0, 0)
  return [{ label: 'Mâine 10:00', at: at(1) }, { label: 'Peste 3 zile', at: at(3) }, { label: 'Luni 10:00', at: monday }]
}

/** `<input type="datetime-local">` value (local time, no zone) ↔ Date. */
export const toLocalInput = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }

/** Month grid for the calendar: weeks start on Monday; cells outside the month are marked. */
export function monthGrid(year: number, month: number): { date: Date; inMonth: boolean }[][] {
  const first = new Date(year, month, 1)
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7))
  const weeks: { date: Date; inMonth: boolean }[][] = []
  for (let w = 0; w < 6; w++) {
    const row = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + w * 7 + i); return { date: d, inMonth: d.getMonth() === month } })
    if (w >= 4 && !row.some((c) => c.inMonth)) break
    weeks.push(row)
  }
  return weeks
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
