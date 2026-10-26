/**
 * Bulk publish (or take back to draft) the SEO content of a line: glossary groups and categories, price pages and guides.
 * A page whose content is not finished is still published: the site shows it as "în construcție" (noindex, not in the sitemap) until the team finishes it.
 * Publishing also ticks "în construcție" on the entries that have no decision yet (unless `markWip` is off), so nothing is indexed before the team has checked it
 * and cleared the tick; an entry whose tick the team already set or cleared keeps it.
 * Never touches suspended entries or other collections (firms, projects, custom pages).
 */
import { db, Prisma } from '@repo/db'
import { WIP_KEY, WIP_VALUE } from './wip'

export const PUBLISH_COLLECTIONS = ['servicii', 'preturi', 'ghiduri'] as const
export type PublishTarget = 'published' | 'draft'

export interface PublishPlan {
  line: { id: string; slug: string }
  to: PublishTarget
  /** publishing also ticks "în construcție" on entries without a decision */
  markWip: boolean
  /** how many entries would get the tick */
  wipToMark: number
  /** entries that would change, per collection (and for the glossary: groups and categories separately) */
  counts: { collection: string; tip: string | null; from: string; count: number }[]
  total: number
}

const FROM: Record<PublishTarget, string[]> = { published: ['draft', 'preview'], draft: ['published'] }

/** The tick was already set (`da`) or cleared (`nu`) by someone: any value of the key is a decision. */
const hasDecision = (data: unknown) => !!data && typeof data === 'object' && WIP_KEY in (data as Record<string, unknown>)

export async function planPublish(lineSlug: string, to: PublishTarget = 'published', markWip = true): Promise<PublishPlan> {
  const line = await db.businessLine.findUnique({ where: { slug: lineSlug }, select: { id: true, slug: true } })
  if (!line) throw new Error(`Linia „${lineSlug}” nu există`)
  const rows = await db.websiteEntry.findMany({
    where: { businessLineId: line.id, status: { in: FROM[to] }, collection: { key: { in: [...PUBLISH_COLLECTIONS] } } },
    select: { status: true, data: true, collection: { select: { key: true } } },
  })
  const wipToMark = to === 'published' && markWip ? rows.filter((r) => !hasDecision(r.data)).length : 0
  const m = new Map<string, PublishPlan['counts'][number]>()
  for (const r of rows) {
    const tip = r.collection.key === 'servicii' ? String((r.data as { tip?: unknown } | null)?.tip ?? '') || null : null
    const k = `${r.collection.key}|${tip}|${r.status}`
    const c = m.get(k) ?? { collection: r.collection.key, tip, from: r.status, count: 0 }
    c.count++; m.set(k, c)
  }
  return { line, to, markWip: to === 'published' && markWip, wipToMark, counts: [...m.values()].sort((a, b) => a.collection.localeCompare(b.collection) || String(a.tip).localeCompare(String(b.tip))), total: rows.length }
}

export async function applyPublish(p: PublishPlan, now = new Date()) {
  const where = { businessLineId: p.line.id, status: { in: FROM[p.to] }, collection: { key: { in: [...PUBLISH_COLLECTIONS] } } }
  if (p.to === 'draft') return { changed: (await db.websiteEntry.updateMany({ where, data: { status: 'draft' } })).count }
  if (p.markWip) {
    const rows = await db.websiteEntry.findMany({ where, select: { id: true, data: true } })
    for (const r of rows.filter((x) => !hasDecision(x.data))) await db.websiteEntry.update({ where: { id: r.id }, data: { data: { ...((r.data ?? {}) as Record<string, unknown>), [WIP_KEY]: WIP_VALUE } as Prisma.InputJsonValue } })
  }
  // first publication stamps publishedAt; an entry that was published before keeps its date
  const fresh = (await db.websiteEntry.updateMany({ where: { ...where, publishedAt: null }, data: { status: 'published', publishedAt: now } })).count
  const rest = (await db.websiteEntry.updateMany({ where, data: { status: 'published' } })).count
  return { changed: fresh + rest }
}
