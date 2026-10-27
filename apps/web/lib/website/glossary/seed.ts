/**
 * Seeds the portal glossary (collection "servicii") and links company entries to its categories.
 *
 * - Glossary entries are created as DRAFT (nothing public until the content is reviewed); groups and categories come from taxonomy.ts.
 * - The "companii" collection gets a `servicii` list field (category slugs) and existing company entries are backfilled from their
 *   speciality; entries that already have `servicii` are left alone.
 * Idempotent: unique (externalSource, externalId) for glossary entries; the backfill only fills empty values.
 */
import { db, Prisma } from '@repo/db'
import type { CollectionField } from '../admin/entry-data'
import { CATEGORIES, categoriesFor, GROUPS } from './taxonomy'

export const GLOSSARY_KEY = 'servicii'
export const GLOSSARY_SOURCE = 'glossary:v1'
const COMPANY_KEY = 'companii'

export const GLOSSARY_FIELDS: CollectionField[] = [
  { key: 'tip', label: 'Tip', type: 'select', options: ['grup', 'categorie', 'situatie'], filterable: true },
  { key: 'parinte', label: 'Grup (părinte)', type: 'text', filterable: true },
  { key: 'sinonime', label: 'Sinonime', type: 'list' },
  { key: 'preturi', label: 'Prețuri (Lucrare | interval | observații)', type: 'list' },
  { key: 'intrebari', label: 'Întrebări frecvente (Întrebare | Răspuns)', type: 'list' },
]
export const COMPANY_SERVICES_FIELD: CollectionField = { key: 'servicii', label: 'Servicii (categorii)', type: 'list', filterable: true }

export interface GlossaryPlan {
  line: { id: string; slug: string }
  glossaryCollection: boolean
  entriesToCreate: { slug: string; title: string; summary: string; data: Record<string, unknown> }[]
  entriesExisting: number
  companyCollection: boolean
  companyFieldMissing: boolean
  backfill: { id: string; servicii: string[] }[]
  alreadyLinked: number
  unmapped: Record<string, number>
}

export async function planGlossary(lineSlug: string): Promise<GlossaryPlan> {
  const line = await db.businessLine.findUnique({ where: { slug: lineSlug }, select: { id: true, slug: true } })
  if (!line) throw new Error(`Linia „${lineSlug}” nu există`)
  const glossary = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: GLOSSARY_KEY } }, select: { id: true } })
  const existing = glossary ? new Set((await db.websiteEntry.findMany({ where: { collectionId: glossary.id, externalSource: GLOSSARY_SOURCE }, select: { externalId: true } })).map((e) => e.externalId)) : new Set<string | null>()
  const all = [
    ...GROUPS.map((g) => ({ slug: g.slug, title: g.title, summary: g.summary, data: { tip: 'grup' } })),
    ...CATEGORIES.map((c) => ({ slug: c.slug, title: c.title, summary: c.summary, data: { tip: 'categorie', parinte: c.group } })),
  ]
  const company = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: COMPANY_KEY } }, select: { id: true, fields: true } })
  const fields = (company?.fields ?? []) as unknown as CollectionField[]
  const backfill: GlossaryPlan['backfill'] = []
  const unmapped: Record<string, number> = {}
  let alreadyLinked = 0
  if (company) {
    const rows = await db.websiteEntry.findMany({ where: { collectionId: company.id }, select: { id: true, data: true } })
    for (const r of rows) {
      const d = (r.data ?? {}) as Record<string, unknown>
      if (Array.isArray(d.servicii) && d.servicii.length) { alreadyLinked++; continue }
      const slugs = categoriesFor(d.specializare)
      if (slugs.length) backfill.push({ id: r.id, servicii: slugs })
      else { const k = String(d.specializare ?? '(fără)'); unmapped[k] = (unmapped[k] ?? 0) + 1 }
    }
  }
  return {
    line, glossaryCollection: !!glossary, entriesToCreate: all.filter((e) => !existing.has(e.slug)), entriesExisting: existing.size,
    companyCollection: !!company, companyFieldMissing: !!company && !fields.some((f) => f.key === 'servicii'), backfill, alreadyLinked, unmapped,
  }
}

export async function applyGlossary(p: GlossaryPlan) {
  const col = await db.websiteCollection.upsert({
    where: { businessLineId_key: { businessLineId: p.line.id, key: GLOSSARY_KEY } },
    create: { businessLineId: p.line.id, key: GLOSSARY_KEY, name: 'Serviciu', namePlural: 'Servicii', kind: 'article', fields: GLOSSARY_FIELDS as unknown as Prisma.InputJsonValue, sortOrder: 20 },
    update: {},
  })
  const created = (await db.websiteEntry.createMany({
    data: p.entriesToCreate.map((e) => ({ businessLineId: p.line.id, collectionId: col.id, slug: e.slug, title: e.title, summary: e.summary, status: 'draft', data: e.data as Prisma.InputJsonValue, externalSource: GLOSSARY_SOURCE, externalId: e.slug })),
    skipDuplicates: true,
  })).count
  let fieldAdded = false, linked = 0
  const company = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: p.line.id, key: COMPANY_KEY } }, select: { id: true, fields: true } })
  if (company) {
    const fields = (company.fields ?? []) as unknown as CollectionField[]
    if (!fields.some((f) => f.key === 'servicii')) {
      await db.websiteCollection.update({ where: { id: company.id }, data: { fields: [...fields, COMPANY_SERVICES_FIELD] as unknown as Prisma.InputJsonValue } })
      fieldAdded = true
    }
    for (const b of p.backfill) {
      const cur = await db.websiteEntry.findUnique({ where: { id: b.id }, select: { data: true } })
      const d = (cur?.data ?? {}) as Record<string, unknown>
      if (Array.isArray(d.servicii) && d.servicii.length) continue
      await db.websiteEntry.update({ where: { id: b.id }, data: { data: { ...d, servicii: b.servicii } as Prisma.InputJsonValue } })
      linked++
    }
  }
  return { created, fieldAdded, linked }
}

export { categoryTitles } from './taxonomy'
