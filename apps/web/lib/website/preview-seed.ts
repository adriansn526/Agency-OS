/**
 * Seeds private PREVIEW profiles (WebsiteEntry.status = 'preview') for CRM leads of a marketing segment.
 *
 * Content comes only from data the CRM already has (name, place, speciality, contact, size bands): no invented projects or reviews.
 * Nothing is published and no token is generated here; the token and the expiry clock start when the preview is SENT.
 * planPreviewSeed never writes; applyPreviewSeed is idempotent (unique externalSource + externalId, one entry per lead).
 */
import { db, Prisma } from '@repo/db'
import { validateEntryData, type CollectionField } from './admin/entry-data'
import { slugify } from './admin/slug'
import { normalizeWebsite } from './admin/url'

export const COLLECTION_KEY = 'companii'
export const SEED_SOURCE = 'preview:prospectare-2026-10'

export const COLLECTION_FIELDS: CollectionField[] = [
  { key: 'cui', label: 'CUI', type: 'text' },
  { key: 'forma_juridica', label: 'Formă juridică', type: 'text', filterable: true },
  { key: 'specializare', label: 'Specializare', type: 'text', filterable: true },
  { key: 'regiune', label: 'Regiune', type: 'text', filterable: true },
  { key: 'banda_angajati', label: 'Angajați', type: 'text' },
  { key: 'banda_cifra_afaceri', label: 'Cifră de afaceri', type: 'text' },
  { key: 'banda_vechime', label: 'Vechime', type: 'text' },
  { key: 'an_infiintare', label: 'An înființare', type: 'number' },
]

export interface SegmentFilter { field: string; operator: string; value: unknown }

/** Same meaning as the Marketing segment filters, for the subset the prospecting segments use (custom fields: equals / not_equals / contains). */
export function segmentWhere(businessLineId: string, filters: SegmentFilter[]): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [{ businessLineId }, { optOut: false }, { deletedAt: null }]
  for (const f of filters) {
    if (!f.field?.startsWith('cf.')) throw new Error(`Filtru nesuportat de seed: ${f.field}`)
    const path = [f.field.slice(3)]
    const v = isNaN(Number(f.value)) ? String(f.value) : Number(f.value)
    if (f.operator === 'equals') and.push({ customFields: { path, equals: v } })
    else if (f.operator === 'not_equals') and.push({ NOT: { customFields: { path, equals: v } } })
    else if (f.operator === 'contains') and.push({ customFields: { path, string_contains: String(f.value) } })
    else throw new Error(`Operator nesuportat de seed: ${f.operator}`)
  }
  return { AND: and }
}

export interface SeedLead {
  id: string; companyName: string; email: string | null; phone: string | null; website: string | null; cui: string | null
  city: string | null; county: string | null; address: string | null; foundedYear: number | null; employees: number | null; revenue: number | null
  externalId: string | null; caenDescription: string | null; customFields: unknown
}

const realEmail = (e: string | null) => !!e && e.includes('@') && !e.endsWith('@formular.ro')
const cfOf = (l: SeedLead) => (l.customFields ?? {}) as Record<string, any>

/** How much real content the profile can show; used to pick the pilot (higher = richer). */
export function richness(l: SeedLead): number {
  const cf = cfOf(l)
  return (normalizeWebsite(l.website) ? 2 : 0) + (realEmail(l.email) ? 2 : 0) + (cf.are_email_domeniu_propriu === 'da' ? 1 : 0)
    + (l.phone ? 1 : 0) + (l.address ? 1 : 0) + (cf.specializare ? 1 : 0) + (cf.banda_cifra_afaceri ? 1 : 0)
    + (cf.banda_angajati ? 1 : 0) + (l.foundedYear ? 1 : 0) + (l.employees ? 1 : 0) + (l.revenue ? 1 : 0)
}

const text = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

export function buildPreviewEntry(l: SeedLead, slug: string) {
  const cf = cfOf(l)
  const title = text(l.companyName, 160)
  if (title.length < 2) return null
  const city = text(l.city, 80), county = text(l.county, 80)
  const where = [city, county && county.toLowerCase() !== city.toLowerCase() ? county : ''].filter(Boolean).join(', ')
  const spec = text(cf.specializare, 120)
  const summary = text(`${title} este o firmă de construcții${where ? ` din ${where}` : ''}${spec ? `, cu activitate în: ${spec.toLowerCase()}` : ''}.`, 500)
  const data = validateEntryData(COLLECTION_FIELDS, {
    cui: text(l.cui, 20), forma_juridica: text(cf.forma_juridica, 20), specializare: spec, regiune: text(cf.regiune, 60),
    banda_angajati: text(cf.banda_angajati, 40), banda_cifra_afaceri: text(cf.banda_cifra_afaceri, 40), banda_vechime: text(cf.banda_vechime, 40),
    ...(l.foundedYear ? { an_infiintare: l.foundedYear } : {}),
  })
  return {
    slug, title, summary, status: 'preview', verified: false, leadId: l.id, data,
    email: realEmail(l.email) ? l.email!.trim().slice(0, 200) : null, phone: l.phone?.trim().slice(0, 40) || null,
    city: text(l.city, 80) || null, county: text(l.county, 80) || null, address: text(l.address, 200) || null, websiteUrl: normalizeWebsite(l.website),
    externalSource: SEED_SOURCE, externalId: l.externalId ?? l.cui ?? l.id,
  }
}

export type PlannedEntry = NonNullable<ReturnType<typeof buildPreviewEntry>>

export interface SeedPlan {
  line: { id: string; slug: string }
  segment: { id: string; name: string }
  collectionExists: boolean
  inSegment: number
  alreadySeeded: number
  eligible: number
  entries: PlannedEntry[]
  byCounty: Record<string, number>
  richness: { min: number; max: number; avg: number }
  skippedNoName: number
}

export async function planPreviewSeed(o: { line: string; segmentId: string; limit: number }): Promise<SeedPlan> {
  const line = await db.businessLine.findUnique({ where: { slug: o.line }, select: { id: true, slug: true } })
  if (!line) throw new Error(`Linia „${o.line}” nu există`)
  const seg = await db.marketingSegment.findFirst({ where: { id: o.segmentId, businessLineId: line.id } })
  if (!seg) throw new Error('Segmentul nu există pe această linie')
  const collection = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: COLLECTION_KEY } }, select: { id: true } })

  const where = segmentWhere(line.id, seg.filters as unknown as SegmentFilter[])
  const excluded = new Set(Array.isArray(seg.excludedLeadIds) ? (seg.excludedLeadIds as string[]) : [])
  const leads = (await db.lead.findMany({
    where, orderBy: { id: 'asc' },
    select: { id: true, companyName: true, email: true, phone: true, website: true, cui: true, city: true, county: true, address: true, foundedYear: true,
              employees: true, revenue: true, externalId: true, caenDescription: true, customFields: true },
  })).filter((l) => !excluded.has(l.id)) as SeedLead[]

  const linked = new Set((await db.websiteEntry.findMany({ where: { businessLineId: line.id, leadId: { not: null } }, select: { leadId: true } })).map((e) => e.leadId!))
  const fresh = leads.filter((l) => !linked.has(l.id))
  // richest first; ties broken by CUI so the pilot is reproducible
  const ranked = fresh.map((l) => ({ l, r: richness(l) })).sort((a, b) => b.r - a.r || String(a.l.cui ?? a.l.id).localeCompare(String(b.l.cui ?? b.l.id)))

  const taken = new Set((await db.websiteEntry.findMany({ where: { businessLineId: line.id, ...(collection ? { collectionId: collection.id } : { id: '-' }) }, select: { slug: true } })).map((e) => e.slug))
  const entries: PlannedEntry[] = [], used: number[] = []
  let skippedNoName = 0
  for (const { l, r } of ranked) {
    if (entries.length >= o.limit) break
    const base = slugify(`${l.companyName} ${l.city ?? ''}`)
    let slug = base
    for (let i = 2; taken.has(slug); i++) slug = `${base.slice(0, 74)}-${i}`
    const e = buildPreviewEntry(l, slug)
    if (!e) { skippedNoName++; continue }
    taken.add(slug); entries.push(e); used.push(r)
  }
  const byCounty: Record<string, number> = {}
  for (const e of entries) byCounty[e.county ?? '—'] = (byCounty[e.county ?? '—'] ?? 0) + 1
  return {
    line, segment: { id: seg.id, name: seg.name }, collectionExists: !!collection, inSegment: leads.length, alreadySeeded: leads.length - fresh.length, eligible: fresh.length,
    entries, byCounty, richness: { min: Math.min(...used, 0), max: Math.max(...used, 0), avg: used.length ? +(used.reduce((a, b) => a + b, 0) / used.length).toFixed(2) : 0 }, skippedNoName,
  }
}

/** Creates the "Companii" collection when missing and inserts the planned entries (status preview, no token). */
export async function applyPreviewSeed(p: SeedPlan, batch = 200) {
  const col = await db.websiteCollection.upsert({
    where: { businessLineId_key: { businessLineId: p.line.id, key: COLLECTION_KEY } },
    create: { businessLineId: p.line.id, key: COLLECTION_KEY, name: 'Companie', namePlural: 'Companii', kind: 'listing', fields: COLLECTION_FIELDS as unknown as Prisma.InputJsonValue },
    update: {},
  })
  let created = 0
  for (let i = 0; i < p.entries.length; i += batch) {
    const part = p.entries.slice(i, i + batch).map((e) => ({ ...e, businessLineId: p.line.id, collectionId: col.id, data: e.data as Prisma.InputJsonValue }))
    created += (await db.websiteEntry.createMany({ data: part, skipDuplicates: true })).count
  }
  return { created, planned: p.entries.length, collectionId: col.id }
}
