/** The call list and the callback calendar of a business line. */
import { db, Prisma } from '@repo/db'
import { nationalPhone } from '@/lib/prospectare/import-mapping'
import { CALL_PREFIX } from './outcome'

export interface QueueItem { id: string; companyName: string; contactPerson: string | null; phone: string | null; phone2: string | null; county: string | null; city: string | null; status: string; nextAction: string | null; nextActionDate: string | null; acordSms: string | null; rezultatApel: string | null; views: number | null; lastViewAt: string | null }

const SELECT = { id: true, companyName: true, contactPerson: true, phone: true, phone2: true, county: true, city: true, status: true, nextAction: true, nextActionDate: true, customFields: true } as const
type Row = { id: string; companyName: string; contactPerson: string; phone: string | null; phone2: string | null; county: string | null; city: string | null; status: string; nextAction: string | null; nextActionDate: Date | null; customFields: unknown }
const real = (v: string | null) => (v && v.trim() && v.trim().toUpperCase() !== 'N/A' ? v.trim() : null)

const shape = (l: Row): QueueItem => {
  const cf = (l.customFields ?? {}) as Record<string, unknown>
  return { id: l.id, companyName: l.companyName, contactPerson: real(l.contactPerson), phone: real(l.phone), phone2: real(l.phone2), county: l.county, city: l.city, status: l.status, nextAction: l.nextAction, nextActionDate: l.nextActionDate?.toISOString() ?? null,
    acordSms: typeof cf.acord_sms === 'string' ? cf.acord_sms : null, rezultatApel: typeof cf.rezultat_apel === 'string' ? cf.rezultat_apel : null,
    views: typeof cf.previzualizari === 'number' ? cf.previzualizari : null, lastViewAt: typeof cf.ultima_previzualizare_la === 'string' ? cf.ultima_previzualizare_la : null }
}

const live = (lineId: string) => ({ businessLineId: lineId, optOut: false, deletedAt: null })

/** Firms that opened their preview link (real visits only), newest visit first, and have not answered or been called since. */
export async function openedLinks(lineId: string, o: { days?: number; limit?: number; now?: Date } = {}): Promise<QueueItem[]> {
  const now = o.now ?? new Date()
  const since = new Date(now.getTime() - (o.days ?? 14) * 86_400_000).toISOString()
  const ids = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM "Lead"
    WHERE "businessLineId" = ${lineId} AND "optOut" = false AND "deletedAt" IS NULL AND status NOT IN ('activ', 'refuzat')
      AND COALESCE("customFields"->>'ultima_previzualizare_la', '') > ${since}
      AND COALESCE("customFields"->>'preview_raspuns', '') = ''`)
  if (!ids.length) return []
  const rows = await db.lead.findMany({ where: { id: { in: ids.map((r) => r.id) } }, select: SELECT })
  // a call logged after the last visit means somebody already followed it up (data_apel is a Bucharest calendar date)
  const day = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' })
  return rows.filter((l) => { const cf = (l.customFields ?? {}) as Record<string, unknown>; return !(typeof cf.data_apel === 'string' && typeof cf.ultima_previzualizare_la === 'string' && cf.data_apel >= day(cf.ultima_previzualizare_la)) })
    .sort((a, b) => String((b.customFields as any)?.ultima_previzualizare_la).localeCompare(String((a.customFields as any)?.ultima_previzualizare_la))).slice(0, o.limit ?? 50).map(shape)
}

/** Callbacks that are due (or overdue), oldest first. */
export async function dueCallbacks(lineId: string, now = new Date(), limit = 100): Promise<QueueItem[]> {
  const rows = await db.lead.findMany({ where: { ...live(lineId), nextAction: { startsWith: CALL_PREFIX }, nextActionDate: { lte: now } }, orderBy: { nextActionDate: 'asc' }, take: limit, select: SELECT })
  return rows.map(shape)
}

/** Pilot firms not called yet (no call result), in calling order: county, place, name. Only firms with a usable phone. */
export async function uncalled(lineId: string, limit = 50, offset = 0): Promise<{ items: QueueItem[]; total: number }> {
  // the pilot is a few hundred firms, so the "no call result yet" test is done here (a JSON "key is missing" filter is fragile in SQL)
  const all = await db.lead.findMany({ where: { ...live(lineId), status: 'prospect', customFields: { path: ['pilot'], equals: 'da' } }, select: SELECT })
  const items = all.filter((l) => !(l.customFields as Record<string, unknown> | null)?.rezultat_apel && (nationalPhone(l.phone) || nationalPhone(l.phone2))).sort((a, b) => (a.county ?? '').localeCompare(b.county ?? '', 'ro') || (a.city ?? '').localeCompare(b.city ?? '', 'ro') || a.companyName.localeCompare(b.companyName, 'ro'))
  return { items: items.slice(offset, offset + limit).map(shape), total: items.length }
}

/** Scheduled callbacks between two dates (for the calendar), oldest first. */
export async function callbacksBetween(lineId: string, from: Date, to: Date): Promise<QueueItem[]> {
  const rows = await db.lead.findMany({ where: { ...live(lineId), nextAction: { startsWith: CALL_PREFIX }, nextActionDate: { gte: from, lt: to } }, orderBy: { nextActionDate: 'asc' }, take: 500, select: SELECT })
  return rows.map(shape)
}

export async function queueCounts(lineId: string, now = new Date()) {
  const [due, upcoming, fresh, opened] = await Promise.all([
    db.lead.count({ where: { ...live(lineId), nextAction: { startsWith: CALL_PREFIX }, nextActionDate: { lte: now } } }),
    db.lead.count({ where: { ...live(lineId), nextAction: { startsWith: CALL_PREFIX }, nextActionDate: { gt: now } } }),
    uncalled(lineId, 1).then((r) => r.total),
    openedLinks(lineId, { now, limit: 500 }).then((r) => r.length),
  ])
  return { due, upcoming, uncalled: fresh, opened }
}
