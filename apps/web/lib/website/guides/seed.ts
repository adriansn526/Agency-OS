/**
 * Seeds the guides (collection "ghiduri") that make up a service hub: one page per group of search terms (see docs/SEO/HUB_HIDROIZOLATII.md).
 * Everything is created as DRAFT; the team reads, checks the facts with a specialist and publishes in the UI.
 * Idempotent: a guide that already exists is left alone unless `force` (then its layout and lists are rewritten; the old layout stays in the history).
 */
import { db, Prisma } from '@repo/db'
import type { CollectionField } from '../admin/entry-data'
import { GLOSSARY_KEY } from '../glossary/seed'
import { layoutHasPlaceholder, parseContentLayout } from '../content/blocks'
import { GUIDES, type GuideContent } from './index'

export const GUIDES_KEY = 'ghiduri'

export const GUIDES_FIELDS: CollectionField[] = [
  { key: 'serviciu', label: 'Serviciu (categorie din glosar)', type: 'text', filterable: true },
  { key: 'cuvant_cheie', label: 'Cuvânt cheie principal', type: 'text' },
  { key: 'cuvinte_cheie', label: 'Cuvinte cheie servite de pagină', type: 'list' },
  { key: 'intrebari', label: 'Întrebări frecvente (Întrebare | Răspuns)', type: 'list' },
]

export function validateGuide(g: GuideContent): string[] {
  const p: string[] = []
  if (!/^[a-z0-9-]{2,80}$/.test(g.slug)) p.push(`${g.slug}: slug invalid`)
  const r = parseContentLayout({ version: 2, blocks: g.blocks }, new Set())
  if (!r.ok) p.push(...r.issues.map((i) => `${g.slug}: ${i}`))
  else if (layoutHasPlaceholder(r.layout)) p.push(`${g.slug}: conține marcajul de completat`)
  const types = g.blocks.map((b) => b.type)
  for (const t of ['hero', 'faq_list', 'request_form']) if (!types.includes(t)) p.push(`${g.slug}: lipsește blocul ${t}`)
  if (types[0] !== 'hero') p.push(`${g.slug}: primul bloc trebuie să fie bannerul`)
  if (new Set(g.blocks.map((b) => b.id)).size !== g.blocks.length) p.push(`${g.slug}: id-uri duplicate`)
  if (g.seoTitle.length > 60) p.push(`${g.slug}: titlul SEO are ${g.seoTitle.length} caractere`)
  if (g.seoDescription.length > 165) p.push(`${g.slug}: descrierea SEO are ${g.seoDescription.length} caractere`)
  if (g.summary.length > 500) p.push(`${g.slug}: rezumatul are ${g.summary.length} caractere`)
  if (!g.keyword || g.keywords.length === 0) p.push(`${g.slug}: lipsesc cuvintele cheie`)
  if (g.intrebari.length < 5) p.push(`${g.slug}: sub 5 întrebări frecvente`)
  for (const l of g.intrebari) { const parts = l.split('|'); if (parts.length !== 2 || !parts[0]!.trim() || !parts[1]!.trim()) p.push(`${g.slug}: întrebare invalidă: ${l.slice(0, 40)}`) }
  return p
}

export interface GuidesPlan {
  line: { id: string; slug: string }
  collection: boolean
  toCreate: GuideContent[]
  toRewrite: GuideContent[]
  skipped: string[]
  problems: string[]
}

export async function planGuides(lineSlug: string, force = false, guides: GuideContent[] = GUIDES): Promise<GuidesPlan> {
  const line = await db.businessLine.findUnique({ where: { slug: lineSlug }, select: { id: true, slug: true } })
  if (!line) throw new Error(`Linia „${lineSlug}” nu există`)
  const col = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: GUIDES_KEY } }, select: { id: true } })
  const existing = col ? new Set((await db.websiteEntry.findMany({ where: { collectionId: col.id }, select: { slug: true } })).map((e) => e.slug)) : new Set<string>()
  const gloss = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: GLOSSARY_KEY } }, select: { id: true } })
  const cats = gloss ? new Set((await db.websiteEntry.findMany({ where: { collectionId: gloss.id }, select: { slug: true, data: true } })).filter((e) => (e.data as { tip?: string } | null)?.tip === 'categorie').map((e) => e.slug)) : new Set<string>()
  const problems = [...guides.flatMap(validateGuide), ...guides.filter((g) => !cats.has(g.serviciu)).map((g) => `${g.slug}: categoria „${g.serviciu}” nu există în glosar (rulează seed-services)`)]
  const dup = guides.map((g) => g.slug).filter((s, i, a) => a.indexOf(s) !== i)
  if (dup.length) problems.push(`slug-uri duplicate: ${dup.join(', ')}`)
  return {
    line, collection: !!col,
    toCreate: guides.filter((g) => !existing.has(g.slug)),
    toRewrite: force ? guides.filter((g) => existing.has(g.slug)) : [],
    skipped: force ? [] : guides.filter((g) => existing.has(g.slug)).map((g) => g.slug),
    problems,
  }
}

const dataOf = (g: GuideContent) => ({ serviciu: g.serviciu, cuvant_cheie: g.keyword, cuvinte_cheie: g.keywords, intrebari: g.intrebari }) as Prisma.InputJsonValue

export async function applyGuides(p: GuidesPlan) {
  if (p.problems.length) throw new Error(`Conținut invalid:\n${p.problems.join('\n')}`)
  const col = await db.websiteCollection.upsert({
    where: { businessLineId_key: { businessLineId: p.line.id, key: GUIDES_KEY } },
    create: { businessLineId: p.line.id, key: GUIDES_KEY, name: 'Ghid', namePlural: 'Ghiduri', kind: 'article', fields: GUIDES_FIELDS as unknown as Prisma.InputJsonValue, sortOrder: 35 },
    update: {},
  })
  let created = 0, rewritten = 0
  for (const g of [...p.toCreate, ...p.toRewrite]) {
    const layout = { version: 2, blocks: g.blocks } as unknown as Prisma.InputJsonValue
    await db.$transaction(async (tx) => {
      const cur = await tx.websiteEntry.findUnique({ where: { businessLineId_collectionId_slug: { businessLineId: p.line.id, collectionId: col.id, slug: g.slug } }, select: { id: true } })
      const fields = { title: g.title, summary: g.summary, seoTitle: g.seoTitle, seoDescription: g.seoDescription, data: dataOf(g), layout }
      const e = cur
        ? await tx.websiteEntry.update({ where: { id: cur.id }, data: fields })
        : await tx.websiteEntry.create({ data: { businessLineId: p.line.id, collectionId: col.id, slug: g.slug, status: 'draft', ...fields } })
      await tx.websiteLayoutVersion.create({ data: { entryId: e.id, layout, source: 'seed' } })
      if (cur) rewritten++; else created++
    })
  }
  return { created, rewritten }
}
