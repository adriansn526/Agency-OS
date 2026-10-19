/**
 * Seeds the SEO price pages (collection "preturi") as DRAFT entries; nothing is public until the content is written and published in the UI.
 *
 * Each entry gets an editorial skeleton in `body` whose first line carries the marker PLACEHOLDER: the portal's price route refuses to
 * render a page that still contains it, so an unfinished draft cannot go live by mistake. The team replaces the skeleton, fills the
 * structured `preturi` and `intrebari` lists and publishes.
 * Idempotent: unique (externalSource, externalId); existing entries are never overwritten.
 */
import { db, Prisma } from '@repo/db'
import type { CollectionField } from '../admin/entry-data'
import { EXTRA_CATEGORY_SLUGS } from '../services/categories'
import { CATEGORIES } from '../glossary/taxonomy'
import { PRICE_PAGES, type PricePageSeed } from './pages'

export const PRICES_KEY = 'preturi'
export const PRICES_SOURCE = 'prices:v1'
export { PLACEHOLDER } from '../content/blocks'
import { PLACEHOLDER } from '../content/blocks'
const YEAR = 2026

export const PRICES_FIELDS: CollectionField[] = [
  { key: 'serviciu', label: 'Serviciu (categorie din glosar)', type: 'text', filterable: true },
  { key: 'cuvant_cheie', label: 'Cuvânt cheie principal', type: 'text' },
  { key: 'cuvinte_cheie', label: 'Cuvinte cheie înrudite', type: 'list' },
  { key: 'preturi', label: 'Prețuri (Lucrare | interval | observații)', type: 'list' },
  { key: 'intrebari', label: 'Întrebări frecvente (Întrebare | Răspuns)', type: 'list' },
  { key: 'preturi_verificate', label: 'Prețuri verificate la', type: 'date' },
]

export const skeleton = (p: PricePageSeed) => [
  `${PLACEHOLDER} Pagină neterminată: înlocuiește tot acest text, completează lista „Prețuri” și „Întrebări frecvente”, apoi publică.`,
  `## Cât costă ${p.title.replace(/^Prețuri? /i, '').toLowerCase()}`,
  'Introducere scurtă cu intervalul de preț principal și ce include (manoperă / materiale).',
  '## De ce depinde prețul',
  '- factorul 1\n- factorul 2\n- factorul 3',
  '## Cum alegi firma',
  'Ce să ceri în ofertă și ce să verifici înainte de a semna.',
].join('\n\n')

const seoTitle = (p: PricePageSeed) => `${p.title} ${YEAR}: tarife și ghid`
const seoDescription = (p: PricePageSeed) => `${p.title}: intervale de preț orientative, ce influențează tariful și cum ceri oferte gratuite de la firme verificate.`
const summary = (p: PricePageSeed) => `${p.title}: intervale orientative și factorii care influențează tariful.`

/** Pure checks on the seed list (also used by the test). */
export function priceSeedProblems(pages: PricePageSeed[] = PRICE_PAGES): string[] {
  const out: string[] = []
  const cats = new Set([...CATEGORIES.map((c) => c.slug), ...EXTRA_CATEGORY_SLUGS])
  const seen = new Set<string>()
  for (const p of pages) {
    if (!/^[a-z0-9-]{2,80}$/.test(p.slug)) out.push(`slug invalid: ${p.slug}`)
    if (seen.has(p.slug)) out.push(`slug duplicat: ${p.slug}`)
    seen.add(p.slug)
    if (!cats.has(p.serviciu)) out.push(`${p.slug}: categoria „${p.serviciu}” nu există în glosar`)
  }
  return out
}

export interface PricesPlan {
  line: { id: string; slug: string }
  collection: boolean
  entriesToCreate: PricePageSeed[]
  entriesExisting: number
}

export async function planPrices(lineSlug: string): Promise<PricesPlan> {
  const problems = priceSeedProblems()
  if (problems.length) throw new Error(`Lista de pagini are probleme: ${problems.join('; ')}`)
  const line = await db.businessLine.findUnique({ where: { slug: lineSlug }, select: { id: true, slug: true } })
  if (!line) throw new Error(`Linia „${lineSlug}” nu există`)
  const col = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: PRICES_KEY } }, select: { id: true } })
  const existing = col
    ? new Set((await db.websiteEntry.findMany({ where: { collectionId: col.id }, select: { slug: true } })).map((e) => e.slug))
    : new Set<string>()
  return { line, collection: !!col, entriesToCreate: PRICE_PAGES.filter((p) => !existing.has(p.slug)), entriesExisting: existing.size }
}

export async function applyPrices(p: PricesPlan) {
  const col = await db.websiteCollection.upsert({
    where: { businessLineId_key: { businessLineId: p.line.id, key: PRICES_KEY } },
    create: { businessLineId: p.line.id, key: PRICES_KEY, name: 'Pagină de prețuri', namePlural: 'Prețuri', kind: 'article', fields: PRICES_FIELDS as unknown as Prisma.InputJsonValue, sortOrder: 30 },
    update: {},
  })
  const created = (await db.websiteEntry.createMany({
    data: p.entriesToCreate.map((e) => ({
      businessLineId: p.line.id, collectionId: col.id, slug: e.slug, title: e.title, summary: summary(e), body: skeleton(e), status: 'draft',
      seoTitle: seoTitle(e), seoDescription: seoDescription(e),
      data: { serviciu: e.serviciu, cuvant_cheie: e.keyword, cuvinte_cheie: e.keywords } as Prisma.InputJsonValue,
      externalSource: PRICES_SOURCE, externalId: e.slug,
    })),
    skipDuplicates: true,
  })).count
  return { created }
}
