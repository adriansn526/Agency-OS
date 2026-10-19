/**
 * Setup of the phone-then-SMS pilot: CRM fields for the call outcome and consent, a "pilot" mark on the firms to call, and a segment of those who agreed to an SMS.
 * The list to call holds personal data (phone numbers of administrators): it is written only OUTSIDE the repository, with owner-only permissions.
 */
import path from 'node:path'
import { db, Prisma } from '@repo/db'
import { getTaxonomy } from '../glossary/live'

export interface FieldDef { key: string; type: 'text' | 'select'; label: string; options?: string[] }

export const PILOT_FIELDS: FieldDef[] = [
  { key: 'acord_sms', type: 'select', label: 'Acord SMS (la telefon)', options: ['da', 'nu'] },
  { key: 'acord_email', type: 'select', label: 'Acord email (la telefon)', options: ['da', 'nu'] },
  { key: 'rezultat_apel', type: 'select', label: 'Rezultat apel', options: ['Nu răspunde', 'Interesat', 'Revin mai târziu', 'Refuză', 'Număr greșit'] },
  { key: 'data_apel', type: 'text', label: 'Data apelului (AAAA-LL-ZZ)' },
  { key: 'alte_portaluri', type: 'select', label: 'Alte portaluri', options: ['Nu folosește', 'Folosește unul', 'Folosește mai multe'] },
  { key: 'alte_portaluri_nume', type: 'text', label: 'Care portaluri (cum le-a numit firma)' },
  { key: 'alte_portaluri_motiv', type: 'select', label: 'Principala nemulțumire față de ele', options: ['Mulți ofertanți pe aceeași cerere', 'Abonament fără lucrări', 'Cereri false sau fără buget', 'Prea scump', 'Mulțumit', 'Altul'] },
]
export const SEGMENT_NAME = 'Pilot — acord SMS'
export const SEGMENT_FILTERS = [{ field: 'cf.pilot', operator: 'equals', value: 'da' }, { field: 'cf.acord_sms', operator: 'equals', value: 'da' }]

export function csvCell(v: unknown): string {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // never let a spreadsheet run a cell as a formula
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** The call list must never land inside the repository (it would end up in git). */
export function assertOutsideRepo(file: string, repoRoot = path.resolve(process.cwd(), '..', '..')) {
  const abs = path.resolve(file), root = path.resolve(repoRoot)
  if (abs === root || abs.startsWith(root + path.sep)) throw new Error(`Lista de apelat conține date personale: nu o scriu în repo (${abs}). Alege un folder privat, ex. /home/asns/data/privat/`)
  return abs
}

export interface CallRow { firma: string; telefon: string; telefon_2: string; persoana_contact: string; email: string; judet: string; localitate: string; servicii: string; cui: string; lead_id: string; profil_id: string; acord_sms: string; acord_email: string; rezultat_apel: string; data_apel: string }
export const CALL_COLUMNS: (keyof CallRow)[] = ['firma', 'telefon', 'telefon_2', 'persoana_contact', 'email', 'judet', 'localitate', 'servicii', 'cui', 'lead_id', 'profil_id', 'acord_sms', 'acord_email', 'rezultat_apel', 'data_apel']

export function toCsv(rows: CallRow[]): string {
  return '﻿' + [CALL_COLUMNS.join(','), ...rows.map((r) => CALL_COLUMNS.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n'
}

const real = (v: string | null | undefined) => (v && v.trim() && v.trim().toUpperCase() !== 'N/A' ? v.trim() : '')

/** Firms that have a private preview and have not answered yet, ordered for calling (by county, then place). Opted-out leads are never listed. */
export async function pilotLeads(lineId: string) {
  const entries = await db.websiteEntry.findMany({
    where: { businessLineId: lineId, status: 'preview', partnerAccess: false, leadId: { not: null }, collection: { key: 'companii' } },
    select: { id: true, leadId: true, county: true, city: true, data: true },
  })
  const leadIds = entries.map((e) => e.leadId!)
  const leads = new Map((await db.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, companyName: true, phone: true, phone2: true, email: true, contactPerson: true, cui: true, city: true, county: true, customFields: true, optOut: true, deletedAt: true } })).map((l) => [l.id, l]))
  const tax = await getTaxonomy(lineId)
  const titles = new Map(tax.categories.map((c) => [c.slug, c.title]))
  const rows: CallRow[] = entries.flatMap((e) => {
    const l = leads.get(e.leadId!)
    if (!l || l.optOut || l.deletedAt) return [] // nobody who opted out is ever listed
    if (!real(l.phone)) return [] // nothing to call
    const cf = (l.customFields ?? {}) as Record<string, unknown>
    const servicii = (Array.isArray((e.data as { servicii?: unknown })?.servicii) ? (e.data as { servicii: unknown[] }).servicii : []).map((s) => titles.get(String(s)) ?? String(s)).join('; ')
    return [{ firma: l.companyName, telefon: real(l.phone), telefon_2: real(l.phone2), persoana_contact: real(l.contactPerson), email: real(l.email), judet: l.county ?? e.county ?? '', localitate: l.city ?? e.city ?? '', servicii, cui: l.cui ?? '', lead_id: l.id, profil_id: e.id,
      acord_sms: String(cf.acord_sms ?? ''), acord_email: String(cf.acord_email ?? ''), rezultat_apel: String(cf.rezultat_apel ?? ''), data_apel: String(cf.data_apel ?? '') }]
  })
  rows.sort((a, b) => a.judet.localeCompare(b.judet, 'ro') || a.localitate.localeCompare(b.localitate, 'ro') || a.firma.localeCompare(b.firma, 'ro'))
  const excluded = entries.filter((e) => { const l = leads.get(e.leadId!); return !l || l.optOut || l.deletedAt }).length
  return { rows, withoutPhone: entries.length - rows.length - excluded, leadIds: rows.map((r) => r.lead_id) }
}

export interface PilotPlan { fieldsToAdd: string[]; leadsToMark: number; segmentExists: boolean; callable: number; withoutPhone: number }

export async function planPilot(lineId: string): Promise<PilotPlan & { leadIds: string[]; rows: CallRow[] }> {
  const line = await db.businessLine.findUniqueOrThrow({ where: { id: lineId }, select: { config: true } })
  const type = ((line.config as { entityTypes?: { id: string; customFields?: FieldDef[] }[] } | null)?.entityTypes ?? []).find((t) => t.id === 'parteneri')
  if (!type) throw new Error('Linia nu are tipul „parteneri”')
  const have = new Set((type.customFields ?? []).map((f) => f.key))
  const { rows, withoutPhone, leadIds } = await pilotLeads(lineId)
  const marked = leadIds.length ? await db.lead.count({ where: { id: { in: leadIds }, customFields: { path: ['pilot'], equals: 'da' } } }) : 0
  const seg = await db.marketingSegment.findFirst({ where: { businessLineId: lineId, name: SEGMENT_NAME }, select: { id: true } })
  return { fieldsToAdd: PILOT_FIELDS.filter((f) => !have.has(f.key)).map((f) => f.key), leadsToMark: leadIds.length - marked, segmentExists: !!seg, callable: rows.length, withoutPhone, leadIds, rows }
}

/** Adds the pilot's custom fields to the "parteneri" type of the line when they are missing (idempotent). Returns how many were added. */
export async function ensurePilotFields(lineId: string): Promise<number> {
  const line = await db.businessLine.findUniqueOrThrow({ where: { id: lineId }, select: { config: true } })
  const cfg = JSON.parse(JSON.stringify(line.config ?? {})) as { entityTypes?: { id: string; customFields?: FieldDef[] }[] }
  const type = cfg.entityTypes?.find((t) => t.id === 'parteneri')
  if (!type) return 0
  const have = new Set((type.customFields ?? []).map((f) => f.key))
  const add = PILOT_FIELDS.filter((f) => !have.has(f.key))
  if (!add.length) return 0
  type.customFields = [...(type.customFields ?? []), ...add]
  await db.businessLine.update({ where: { id: lineId }, data: { config: cfg as unknown as Prisma.InputJsonValue } })
  return add.length
}

export async function applyPilot(lineId: string, plan: Awaited<ReturnType<typeof planPilot>>) {
  const line = await db.businessLine.findUniqueOrThrow({ where: { id: lineId }, select: { config: true } })
  const cfg = JSON.parse(JSON.stringify(line.config ?? {})) as { entityTypes?: { id: string; customFields?: FieldDef[] }[] }
  const type = cfg.entityTypes!.find((t) => t.id === 'parteneri')!
  const have = new Set((type.customFields ?? []).map((f) => f.key))
  type.customFields = [...(type.customFields ?? []), ...PILOT_FIELDS.filter((f) => !have.has(f.key))]
  await db.businessLine.update({ where: { id: lineId }, data: { config: cfg as unknown as Prisma.InputJsonValue } })
  let marked = 0
  for (let i = 0; i < plan.leadIds.length; i += 500) {
    const part = plan.leadIds.slice(i, i + 500)
    marked += await db.$executeRaw`UPDATE "Lead" SET "customFields" = coalesce("customFields", '{}'::jsonb) || '{"pilot":"da"}'::jsonb WHERE "id" = ANY(${part}) AND coalesce("customFields"->>'pilot', '') <> 'da'`
  }
  let segmentId: string | null = null
  if (!plan.segmentExists) {
    const contactCount = await db.lead.count({ where: { businessLineId: lineId, optOut: false, deletedAt: null, AND: SEGMENT_FILTERS.map((f) => ({ customFields: { path: [f.field.slice(3)], equals: f.value } })) } })
    segmentId = (await db.marketingSegment.create({ data: { businessLineId: lineId, name: SEGMENT_NAME, description: 'Firmele din pilot care au acceptat un SMS la telefon (acord_sms = da). Pentru campania SMS cu link de previzualizare.', filters: SEGMENT_FILTERS as unknown as Prisma.InputJsonValue, contactCount } })).id
  }
  return { fieldsAdded: plan.fieldsToAdd.length, marked, segmentId }
}
