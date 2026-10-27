/**
 * Seeds the situation pages (glossary entries of type "situație", under a category). Created as DRAFT and ticked "în construcție";
 * a situation that exists is left alone unless `force` (then its text and layout are rewritten, the old layout stays in the history, the tick is kept).
 */
import { db, Prisma } from '@repo/db'
import { GLOSSARY_FIELDS, GLOSSARY_KEY, GLOSSARY_SOURCE } from '../glossary/seed'
import { situationSlugOk } from '../glossary/validate'
import { layoutHasPlaceholder, parseContentLayout } from '../content/blocks'
import { WIP_KEY, WIP_VALUE } from '../content/wip'
import { SITUATIONS, type SituationContent } from './index'

export function validateSituation(s: SituationContent): string[] {
  const p: string[] = []
  if (!situationSlugOk(s.slug, s.categorie)) p.push(`${s.slug}: slug-ul trebuie să fie „${s.categorie}--<situație>”`)
  const r = parseContentLayout({ version: 2, blocks: s.blocks }, new Set())
  if (!r.ok) p.push(...r.issues.map((i) => `${s.slug}: ${i}`))
  else if (layoutHasPlaceholder(r.layout)) p.push(`${s.slug}: conține marcajul de completat`)
  const types = s.blocks.map((b) => b.type)
  for (const t of ['hero', 'faq_list', 'firms_list', 'request_form']) if (!types.includes(t)) p.push(`${s.slug}: lipsește blocul ${t}`)
  if (types[0] !== 'hero') p.push(`${s.slug}: primul bloc trebuie să fie bannerul`)
  if (new Set(s.blocks.map((b) => b.id)).size !== s.blocks.length) p.push(`${s.slug}: id-uri duplicate`)
  if (s.seoTitle.length > 60) p.push(`${s.slug}: titlul SEO are ${s.seoTitle.length} caractere`)
  if (s.seoDescription.length > 165) p.push(`${s.slug}: descrierea SEO are ${s.seoDescription.length} caractere`)
  if (s.intrebari.length < 5) p.push(`${s.slug}: sub 5 întrebări frecvente`)
  return p
}

export interface SituationsPlan {
  line: { id: string; slug: string }
  collectionId: string
  /** the `tip` option "situatie" is missing from the collection */
  addOption: boolean
  toCreate: SituationContent[]
  toRewrite: SituationContent[]
  skipped: string[]
  problems: string[]
}

export async function planSituations(lineSlug: string, force = false, situations: SituationContent[] = SITUATIONS): Promise<SituationsPlan> {
  const line = await db.businessLine.findUnique({ where: { slug: lineSlug }, select: { id: true, slug: true } })
  if (!line) throw new Error(`Linia „${lineSlug}” nu există`)
  const col = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: GLOSSARY_KEY } }, select: { id: true, fields: true } })
  if (!col) throw new Error('Colecția „servicii” nu există; rulează întâi seed-glossary')
  const entries = await db.websiteEntry.findMany({ where: { collectionId: col.id }, select: { slug: true, data: true } })
  const existing = new Set(entries.map((e) => e.slug))
  const cats = new Set(entries.filter((e) => (e.data as { tip?: string } | null)?.tip === 'categorie').map((e) => e.slug))
  const tipOptions = (((col.fields ?? []) as { key: string; options?: string[] }[]).find((f) => f.key === 'tip')?.options ?? [])
  const dup = situations.map((s) => s.slug).filter((s, i, a) => a.indexOf(s) !== i)
  return {
    line, collectionId: col.id, addOption: !tipOptions.includes('situatie'),
    toCreate: situations.filter((s) => !existing.has(s.slug)),
    toRewrite: force ? situations.filter((s) => existing.has(s.slug)) : [],
    skipped: force ? [] : situations.filter((s) => existing.has(s.slug)).map((s) => s.slug),
    problems: [
      ...situations.flatMap(validateSituation),
      ...situations.filter((s) => !cats.has(s.categorie)).map((s) => `${s.slug}: categoria „${s.categorie}” nu există în glosar`),
      ...(dup.length ? [`slug-uri duplicate: ${dup.join(', ')}`] : []),
    ],
  }
}

export async function applySituations(p: SituationsPlan) {
  if (p.problems.length) throw new Error(`Conținut invalid:\n${p.problems.join('\n')}`)
  if (p.addOption) {
    const col = await db.websiteCollection.findUniqueOrThrow({ where: { id: p.collectionId }, select: { fields: true } })
    const tip = GLOSSARY_FIELDS.find((f) => f.key === 'tip')!
    const fields = ((col.fields ?? []) as { key: string }[]).map((f) => (f.key === 'tip' ? { ...f, options: tip.options } : f))
    await db.websiteCollection.update({ where: { id: p.collectionId }, data: { fields: fields as unknown as Prisma.InputJsonValue } })
  }
  let created = 0, rewritten = 0
  for (const s of [...p.toCreate, ...p.toRewrite]) {
    const layout = { version: 2, blocks: s.blocks } as unknown as Prisma.InputJsonValue
    await db.$transaction(async (tx) => {
      const cur = await tx.websiteEntry.findFirst({ where: { collectionId: p.collectionId, slug: s.slug }, select: { id: true, data: true } })
      const prev = ((cur?.data ?? {}) as Record<string, unknown>)[WIP_KEY]
      const wip = !cur ? { [WIP_KEY]: WIP_VALUE } : prev !== undefined ? { [WIP_KEY]: prev } : {}
      const data = { ...((cur?.data ?? {}) as Record<string, unknown>), tip: 'situatie', parinte: s.categorie, sinonime: s.sinonime, intrebari: s.intrebari, ...wip } as Prisma.InputJsonValue
      const fields = { title: s.title, summary: s.summary, seoTitle: s.seoTitle, seoDescription: s.seoDescription, data, layout }
      const e = cur
        ? await tx.websiteEntry.update({ where: { id: cur.id }, data: fields })
        : await tx.websiteEntry.create({ data: { businessLineId: p.line.id, collectionId: p.collectionId, slug: s.slug, status: 'draft', externalSource: GLOSSARY_SOURCE, externalId: s.slug, ...fields } })
      await tx.websiteLayoutVersion.create({ data: { entryId: e.id, layout, source: 'seed' } })
      if (cur) rewritten++; else created++
    })
  }
  return { created, rewritten, optionAdded: p.addOption }
}
