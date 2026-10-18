/**
 * The service categories a line really has: the entries of its "servicii" collection (groups and categories), so the team adds a service
 * by creating an entry in the UI and it shows up everywhere (partner editor, filters, validation, page titles). Drafts count (a category can be
 * chosen before its guide page is published); suspended entries do not. Falls back to the built-in list when the collection is empty or missing.
 */
import { db } from '@repo/db'
import { CATEGORIES, GROUPS } from './taxonomy'

export interface LiveCategory { slug: string; title: string; group: string }
export interface LiveGroup { slug: string; title: string }
export interface LiveTaxonomy { groups: LiveGroup[]; categories: LiveCategory[] }

const TTL_MS = 30_000
const cache = new Map<string, { at: number; tax: LiveTaxonomy }>()
export const invalidateTaxonomy = (lineId?: string) => { if (lineId) cache.delete(lineId); else cache.clear() }

export const builtInTaxonomy = (): LiveTaxonomy => ({ groups: GROUPS.map((g) => ({ slug: g.slug, title: g.title })), categories: CATEGORIES.map((c) => ({ slug: c.slug, title: c.title, group: c.group })) })

/** Pure: entries of the "servicii" collection → taxonomy (groups in the built-in order first, then alphabetical; categories by group then title). */
export function taxonomyFromEntries(rows: { slug: string; title: string; data: unknown }[]): LiveTaxonomy {
  const d = (r: { data: unknown }) => (r.data ?? {}) as { tip?: unknown; parinte?: unknown }
  const order = (s: string) => { const i = GROUPS.findIndex((g) => g.slug === s); return i < 0 ? 999 : i }
  const groups = rows.filter((r) => d(r).tip === 'grup').map((r) => ({ slug: r.slug, title: r.title })).sort((a, b) => order(a.slug) - order(b.slug) || a.title.localeCompare(b.title, 'ro'))
  const known = new Set(groups.map((g) => g.slug))
  const categories = rows.filter((r) => d(r).tip === 'categorie' && typeof d(r).parinte === 'string' && known.has(d(r).parinte as string))
    .map((r) => ({ slug: r.slug, title: r.title, group: d(r).parinte as string }))
    .sort((a, b) => groups.findIndex((g) => g.slug === a.group) - groups.findIndex((g) => g.slug === b.group) || a.title.localeCompare(b.title, 'ro'))
  return { groups, categories }
}

export async function getTaxonomy(lineId: string, now = Date.now()): Promise<LiveTaxonomy> {
  const hit = cache.get(lineId)
  if (hit && now - hit.at < TTL_MS) return hit.tax
  const rows = await db.websiteEntry.findMany({ where: { businessLineId: lineId, status: { not: 'suspended' }, collection: { key: 'servicii' } }, select: { slug: true, title: true, data: true } })
  const live = taxonomyFromEntries(rows)
  const tax = live.categories.length ? live : builtInTaxonomy()
  cache.set(lineId, { at: now, tax })
  return tax
}

export const isLiveCategory = (tax: LiveTaxonomy, slug: string) => tax.categories.some((c) => c.slug === slug)
export const unknownCategories = (tax: LiveTaxonomy, slugs: string[]) => slugs.filter((s) => !isLiveCategory(tax, s))
