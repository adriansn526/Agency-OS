/**
 * Editing a lead's custom fields (customFields.<key>, top-level strings and numbers) and the pilot flag.
 *
 * Only keys defined on the lead's entity type (plus "pilot") can be written; select values must be one of the options; an empty value removes the key.
 * Writes are merged in SQL, so other keys (detalii, call results, tracking counters…) are never overwritten by a form that did not load them.
 */
import { db, Prisma } from '@repo/db'

export const PILOT_KEY = 'pilot'
export class CustomFieldError extends Error { constructor(message: string, readonly status = 422) { super(message) } }

export interface FieldDef { key: string; label: string; type: 'text' | 'number' | 'select' | 'date' | 'rating'; options?: string[] }
export const PILOT_DEF: FieldDef = { key: PILOT_KEY, label: 'În pilot', type: 'select', options: ['da'] }

/** Cleans and checks a patch against the field definitions. Returns what to write and what to remove. */
export function validateSet(defs: FieldDef[], set: Record<string, unknown>): { write: Record<string, string | number>; remove: string[] } {
  const byKey = new Map([...defs, PILOT_DEF].map((d) => [d.key, d]))
  const write: Record<string, string | number> = {}, remove: string[] = []
  const entries = Object.entries(set)
  if (!entries.length) throw new CustomFieldError('Nicio modificare')
  if (entries.length > 40) throw new CustomFieldError('Prea multe câmpuri')
  for (const [key, raw] of entries) {
    const d = byKey.get(key)
    if (!d) throw new CustomFieldError(`Câmpul „${key}” nu există pe acest tip`)
    if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) { remove.push(key); continue }
    if (typeof raw !== 'string' && typeof raw !== 'number') throw new CustomFieldError(`Valoare invalidă pentru „${d.label}”`)
    const v = typeof raw === 'string' ? raw.trim() : raw
    if (d.type === 'select') { if (!d.options?.includes(String(v))) throw new CustomFieldError(`„${v}” nu e o opțiune pentru „${d.label}”`); write[key] = String(v) }
    else if (d.type === 'number' || d.type === 'rating') {
      const n = Number(v); if (!Number.isFinite(n)) throw new CustomFieldError(`„${d.label}” trebuie să fie un număr`)
      if (d.type === 'rating' && (n < 0 || n > 5)) throw new CustomFieldError(`„${d.label}” trebuie să fie între 0 și 5`)
      write[key] = n
    } else if (d.type === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v)) || Number.isNaN(Date.parse(String(v)))) throw new CustomFieldError(`„${d.label}” trebuie să fie o dată (AAAA-LL-ZZ)`); write[key] = String(v) }
    else { if (String(v).length > 300) throw new CustomFieldError(`„${d.label}” e prea lung`); write[key] = String(v) }
  }
  return { write, remove }
}

const merge = (id: string, write: Record<string, unknown>, remove: string[]) =>
  Prisma.sql`UPDATE "Lead" SET "customFields" = (COALESCE("customFields", '{}'::jsonb) - ${remove}::text[]) || ${JSON.stringify(write)}::jsonb, "updatedAt" = now() WHERE id = ${id}`

async function defsOf(lead: { businessLineId: string; entityType: string }): Promise<FieldDef[]> {
  const line = await db.businessLine.findUnique({ where: { id: lead.businessLineId }, select: { config: true } })
  const types = ((line?.config as { entityTypes?: { id: string; customFields?: FieldDef[] }[] } | null)?.entityTypes) ?? []
  return types.find((t) => t.id === lead.entityType)?.customFields ?? []
}

export async function setLeadCustomFields(leadId: string, set: Record<string, unknown>, user: { id?: string | null; name?: string | null } = {}) {
  const lead = await db.lead.findFirst({ where: { id: leadId, deletedAt: null }, select: { id: true, companyName: true, businessLineId: true, entityType: true, customFields: true } })
  if (!lead) throw new CustomFieldError('Lead-ul nu există', 404)
  const { write, remove } = validateSet(await defsOf(lead), set)
  const before = (lead.customFields ?? {}) as Record<string, unknown>
  const changed: Record<string, { from: unknown; to: unknown }> = {}
  for (const k of Object.keys(write)) if (before[k] !== write[k]) changed[k] = { from: before[k] ?? null, to: write[k]! }
  for (const k of remove) if (before[k] !== undefined) changed[k] = { from: before[k], to: null }
  if (!Object.keys(changed).length) return { changed: {} }
  await db.$transaction([
    db.$executeRaw(merge(lead.id, write, remove)),
    db.activity.create({ data: { businessLineId: lead.businessLineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action: 'updated', entityType: 'lead', entityId: lead.id, entityName: lead.companyName, leadId: lead.id, details: { customFields: changed } as Prisma.InputJsonValue } }),
  ])
  return { changed }
}

/** Adds the leads to the pilot (pilot = "da") or takes them out (key removed). Returns how many leads actually changed. */
export async function setPilot(leadIds: string[], on: boolean, user: { id?: string | null; name?: string | null } = {}) {
  const ids = [...new Set(leadIds)]
  if (!ids.length) throw new CustomFieldError('Nicio firmă selectată')
  if (ids.length > 1000) throw new CustomFieldError('Maxim 1000 de firme odată')
  const rows = await db.lead.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, companyName: true, businessLineId: true, customFields: true } })
  const todo = rows.filter((l) => ((l.customFields ?? {}) as Record<string, unknown>)[PILOT_KEY] === 'da' !== on)
  if (!todo.length) return { updated: 0, requested: ids.length }
  const idList = todo.map((l) => l.id)
  await db.$transaction([
    db.$executeRaw(on
      ? Prisma.sql`UPDATE "Lead" SET "customFields" = COALESCE("customFields", '{}'::jsonb) || '{"pilot":"da"}'::jsonb, "updatedAt" = now() WHERE id = ANY(${idList}::text[])`
      : Prisma.sql`UPDATE "Lead" SET "customFields" = COALESCE("customFields", '{}'::jsonb) - 'pilot', "updatedAt" = now() WHERE id = ANY(${idList}::text[])`),
    db.activity.createMany({ data: todo.map((l) => ({ businessLineId: l.businessLineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action: 'updated', entityType: 'lead', entityId: l.id, entityName: l.companyName, leadId: l.id, details: { customFields: { [PILOT_KEY]: { from: on ? null : 'da', to: on ? 'da' : null } } } as Prisma.InputJsonValue })) }),
  ])
  return { updated: todo.length, requested: ids.length }
}
