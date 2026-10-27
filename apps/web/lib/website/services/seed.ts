/**
 * Seeds the service pages of the glossary: the new categories (draft) and the written content of the pilot pages (data lists, SEO fields, block layout).
 * Everything stays DRAFT; the team previews, checks the figures and publishes in the UI. Idempotent: a page that already has blocks is left alone unless `force`.
 */
import { db, Prisma } from '@repo/db'
import { GLOSSARY_FIELDS, GLOSSARY_KEY, GLOSSARY_SOURCE } from '../glossary/seed'
import { parseContentLayout, layoutHasPlaceholder } from '../content/blocks'
import { NEW_CATEGORIES } from './categories'
import { PRICE_PAGES } from '../prices/pages'
import { SERVICE_CONTENT, type ServiceContent } from './index'

export interface ServicePlan {
  line: { id: string; slug: string }
  collectionId: string
  fieldsToAdd: string[]
  categoriesToCreate: typeof NEW_CATEGORIES
  pagesToWrite: ServiceContent[]
  pagesSkipped: string[]
  /** price pages (draft) whose category changes to a more specific one */
  reroutes: { id: string; slug: string; from: string; to: string }[]
  missingGroups: string[]
  problems: string[]
}

export const validateContent = (c: ServiceContent): string[] => {
  const r = parseContentLayout({ version: 2, blocks: c.blocks }, new Set())
  const p: string[] = r.ok ? [] : r.issues.map((i) => `${c.slug}: ${i}`)
  if (r.ok && layoutHasPlaceholder(r.layout)) p.push(`${c.slug}: conține marcajul de completat`)
  if (c.seoTitle.length > 60) p.push(`${c.slug}: titlul SEO are ${c.seoTitle.length} caractere`)
  if (c.seoDescription.length > 165) p.push(`${c.slug}: descrierea SEO are ${c.seoDescription.length} caractere`)
  for (const l of c.preturi) if (l.split('|').length < 2 || !l.split('|')[0]!.trim() || !l.split('|')[1]!.trim()) p.push(`${c.slug}: rând de preț invalid: ${l}`)
  for (const l of c.intrebari) if (l.split('|').length < 2) p.push(`${c.slug}: întrebare invalidă: ${l.slice(0, 40)}`)
  return p
}

/** `only`: write just these pages (and nothing else: no new categories, no price page re-routing). A page that already has blocks still needs `force`. */
export async function planServices(lineSlug: string, force = false, only?: string[]): Promise<ServicePlan> {
  const line = await db.businessLine.findUnique({ where: { slug: lineSlug }, select: { id: true, slug: true } })
  if (!line) throw new Error(`Linia „${lineSlug}” nu există`)
  const col = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: GLOSSARY_KEY } }, select: { id: true, fields: true } })
  if (!col) throw new Error('Colecția „servicii” nu există; rulează întâi seed-glossary')
  const have = new Set(((col.fields ?? []) as { key: string }[]).map((f) => f.key))
  const entries = await db.websiteEntry.findMany({ where: { collectionId: col.id }, select: { slug: true, layout: true, data: true } })
  const bySlug = new Map(entries.map((e) => [e.slug, e]))
  const groups = new Set(entries.filter((e) => (e.data as { tip?: string } | null)?.tip === 'grup').map((e) => e.slug))
  const hasBlocks = (slug: string) => { const l = bySlug.get(slug)?.layout as { blocks?: unknown[] } | null | undefined; return !!l && Array.isArray(l.blocks) && l.blocks.length > 0 }
  const priceCol = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: 'preturi' } }, select: { id: true } })
  const priceRows = priceCol ? await db.websiteEntry.findMany({ where: { collectionId: priceCol.id, status: { not: 'published' } }, select: { id: true, slug: true, data: true } }) : []
  const target = new Map(PRICE_PAGES.map((x) => [x.slug, x.serviciu]))
  const known = new Set([...entries.map((e) => e.slug)])
  const reroutes = priceRows.flatMap((r) => {
    const to = target.get(r.slug), from = String((r.data as { serviciu?: unknown } | null)?.serviciu ?? '')
    return to && to !== from && (known.has(to) || NEW_CATEGORIES.some((c) => c.slug === to)) ? [{ id: r.id, slug: r.slug, from, to }] : []
  })
  const inScope = (c: ServiceContent) => !only || only.includes(c.slug)
  const pagesToWrite = SERVICE_CONTENT.filter((c) => inScope(c) && (force || !hasBlocks(c.slug)))
  const newCats = only ? [] : NEW_CATEGORIES.filter((c) => !bySlug.has(c.slug))
  const unknownOnly = (only ?? []).filter((s) => !SERVICE_CONTENT.some((c) => c.slug === s))
  return {
    line, collectionId: col.id,
    fieldsToAdd: GLOSSARY_FIELDS.map((f) => f.key).filter((k) => !have.has(k)),
    categoriesToCreate: newCats,
    reroutes: only ? [] : reroutes,
    pagesToWrite, pagesSkipped: SERVICE_CONTENT.filter((c) => inScope(c) && !pagesToWrite.includes(c)).map((c) => c.slug),
    missingGroups: only ? [] : NEW_CATEGORIES.map((c) => c.group).filter((g) => !groups.has(g)),
    problems: [...unknownOnly.map((s) => `--only: „${s}” nu este o pagină scrisă`), ...SERVICE_CONTENT.filter(inScope).flatMap(validateContent), ...SERVICE_CONTENT.filter((c) => inScope(c) && !bySlug.has(c.slug)).map((c) => `${c.slug}: categoria nu există în glosar`)],
  }
}

export async function applyServices(p: ServicePlan) {
  if (p.problems.length) throw new Error(`Conținut invalid:\n${p.problems.join('\n')}`)
  if (p.missingGroups.length) throw new Error(`Grupuri lipsă: ${p.missingGroups.join(', ')}`)
  const col = await db.websiteCollection.findUniqueOrThrow({ where: { id: p.collectionId }, select: { fields: true } })
  if (p.fieldsToAdd.length) {
    const fields = [...((col.fields ?? []) as unknown as typeof GLOSSARY_FIELDS), ...GLOSSARY_FIELDS.filter((f) => p.fieldsToAdd.includes(f.key))]
    await db.websiteCollection.update({ where: { id: p.collectionId }, data: { fields: fields as unknown as Prisma.InputJsonValue } })
  }
  const created = (await db.websiteEntry.createMany({
    data: p.categoriesToCreate.map((c) => ({ businessLineId: p.line.id, collectionId: p.collectionId, slug: c.slug, title: c.title, summary: c.summary, status: 'draft', data: { tip: 'categorie', parinte: c.group, sinonime: c.sinonime } as Prisma.InputJsonValue, externalSource: GLOSSARY_SOURCE, externalId: c.slug })),
    skipDuplicates: true,
  })).count
  let written = 0
  for (const c of p.pagesToWrite) {
    await db.$transaction(async (tx) => {
      const e = await tx.websiteEntry.findFirstOrThrow({ where: { collectionId: p.collectionId, slug: c.slug }, select: { id: true, data: true } })
      const data = { ...((e.data ?? {}) as Record<string, unknown>), sinonime: c.sinonime, preturi: c.preturi, intrebari: c.intrebari }
      const layout = { version: 2, blocks: c.blocks } as unknown as Prisma.InputJsonValue
      await tx.websiteEntry.update({ where: { id: e.id }, data: { summary: c.summary, seoTitle: c.seoTitle, seoDescription: c.seoDescription, data: data as Prisma.InputJsonValue, layout } })
      await tx.websiteLayoutVersion.create({ data: { entryId: e.id, layout, source: 'seed' } })
    })
    written++
  }
  let rerouted = 0
  for (const r of p.reroutes) {
    const e = await db.websiteEntry.findUniqueOrThrow({ where: { id: r.id }, select: { data: true, status: true } })
    if (e.status === 'published') continue
    await db.websiteEntry.update({ where: { id: r.id }, data: { data: { ...((e.data ?? {}) as Record<string, unknown>), serviciu: r.to } as Prisma.InputJsonValue } })
    rerouted++
  }
  return { created, written, rerouted }
}
