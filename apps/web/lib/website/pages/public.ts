/** Public side of the custom pages: read-only, always published pages of published firms. */
import { db } from '@repo/db'
import type { WebsiteContext } from '../storefront/auth'
import { WebsiteInputError } from '../storefront/auth'
import { isSlug } from '../storefront/query'
import { mediaRefs, parsePageLayout, emptyPageLayout, type PageLayout } from './blocks'
import { PAGES_KEY } from './service'

export interface PublicPage {
  firm: { slug: string; title: string }
  page: { slug: string; title: string; seoTitle: string | null; seoDescription: string | null; publishedAt: string | null; updatedAt: string }
  layout: PageLayout
  /** the images the layout refers to (id → what to draw), only the firm's own */
  media: Record<string, { url: string; alt: string | null; width: number | null; height: number | null }>
}

const idsOf = (raw: unknown): Set<string> => { const out = new Set<string>(); const walk = (x: unknown) => { if (typeof x === 'string' && /^[A-Za-z0-9_-]{10,40}$/.test(x)) out.add(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk) }; walk(raw); return out }

/** One page by the firm's slug and the page's own slug; null when it does not exist, is a draft, or its firm is not published. */
export async function getPublicPage(ctx: WebsiteContext, firmSlug: string, pageSlug: string): Promise<PublicPage | null> {
  if (!isSlug(firmSlug) || !isSlug(pageSlug)) throw new WebsiteInputError('Adresă invalidă')
  const firm = await db.websiteEntry.findFirst({ where: { businessLineId: ctx.businessLineId, slug: firmSlug, status: 'published', collection: { key: 'companii', isActive: true } }, select: { id: true, slug: true, title: true } })
  if (!firm) return null
  const row = await db.websiteEntry.findFirst({ where: { parentId: firm.id, businessLineId: ctx.businessLineId, status: 'published', collection: { key: PAGES_KEY }, data: { path: ['pagina'], equals: pageSlug } } })
  if (!row) return null
  // stored layouts were validated on save; to read one back its own references count as known, then only the firm's real images are served
  const parsed = parsePageLayout(row.layout, { mediaIds: idsOf(row.layout) })
  const layout = parsed.ok ? parsed.layout : emptyPageLayout()
  const refs = mediaRefs(layout)
  const media = refs.length ? await db.websiteMedia.findMany({ where: { id: { in: refs }, entryId: firm.id, kind: 'image' }, select: { id: true, url: true, alt: true, width: true, height: true } }) : []
  return {
    firm: { slug: firm.slug, title: firm.title },
    page: { slug: pageSlug, title: row.title, seoTitle: row.seoTitle, seoDescription: row.seoDescription, publishedAt: row.publishedAt?.toISOString() ?? null, updatedAt: row.updatedAt.toISOString() },
    layout, media: Object.fromEntries(media.map((m) => [m.id, { url: m.url, alt: m.alt, width: m.width, height: m.height }])),
  }
}

/** Published pages of one firm (for its menu), oldest first. */
export async function listPublicPages(ctx: WebsiteContext, firmSlug: string) {
  if (!isSlug(firmSlug)) throw new WebsiteInputError('Adresă invalidă')
  const rows = await db.websiteEntry.findMany({
    where: { businessLineId: ctx.businessLineId, status: 'published', collection: { key: PAGES_KEY }, parent: { slug: firmSlug, status: 'published', collection: { key: 'companii' } } },
    select: { title: true, data: true, publishedAt: true }, orderBy: [{ publishedAt: 'asc' }, { title: 'asc' }], take: 20,
  })
  return { items: rows.map((r) => ({ title: r.title, slug: String(((r.data ?? {}) as { pagina?: unknown }).pagina ?? '') })).filter((r) => r.slug) }
}
