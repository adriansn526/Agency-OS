/**
 * Public shapes of the Website storefront API.
 * Whitelists on purpose: contact email, CRM / ERP links (leadId, clientId, tenantId), import ids and
 * moderation data never leave the ERP. New columns stay private until added here.
 */

import { categoryTitles } from '../glossary/taxonomy'
import { effectiveLayout } from '../layout/blocks'
import { contentReady, effectiveContentLayout, isContentCollection } from '../content/blocks'
import { isWip } from '../content/wip'
import { activeCmr, CMR_KEY, decodeCmr } from '../verification/cmr-data'

const PENDING_KEY = 'modificari_asteptare'

interface EntryRow {
  slug: string; title: string; summary: string | null; body: string | null
  city: string | null; county: string | null; address: string | null; lat: number | null; lng: number | null
  coverUrl: string | null; logoUrl: string | null; verified: boolean; featured: boolean
  ratingAvg: { toString(): string } | number | null; ratingCount: number
  data: unknown; seoTitle: string | null; seoDescription: string | null
  phone: string | null; websiteUrl: string | null
  layout?: unknown
  _count?: { foundingSlots: number }
  parent?: { slug: string; title: string; city: string | null; county: string | null; logoUrl: string | null; verified: boolean } | null
  publishedAt: Date | null; updatedAt: Date
}
interface MediaRow { id: string; url: string; alt: string | null; kind: string; width: number | null; height: number | null }
interface ReviewRow { authorName: string; rating: number; title: string | null; body: string | null; createdAt: Date }
interface CollectionRow { key: string; name: string; namePlural: string; kind: string; fields: unknown }

const num = (v: EntryRow['ratingAvg']): number | null => (v == null ? null : Number(v.toString()))
const iso = (d: Date | null) => (d ? d.toISOString() : null)

/** The CMR verification is internal (who checked, parafă); the site only gets whether it is currently valid. */
function withCmr(data: unknown, collectionKey: string) {
  const d = { ...((data ?? {}) as Record<string, unknown>) }
  const raw = d[CMR_KEY]
  delete d[CMR_KEY]
  delete d[PENDING_KEY]
  delete d.sugestii_medici // suggestions from reviewing doctors are for the team only
  if (collectionKey !== 'companii') return { data: d }
  const v = activeCmr(decodeCmr(raw))[0]
  return { data: d, cmr: v ? { verifiedAt: v.verifiedAt, practiceUntil: v.practiceUntil, specialities: v.specialities } : null }
}

/** `cats`: the line's live service categories (slug → title); defaults to the built-in list. */
export function serializeListItem(e: EntryRow, collectionKey: string, cats?: { slug: string; title: string }[]) {
  return {
    collection: collectionKey, slug: e.slug, title: e.title, summary: e.summary,
    city: e.city, county: e.county, address: e.address, lat: e.lat, lng: e.lng,
    coverUrl: e.coverUrl, logoUrl: e.logoUrl, verified: e.verified, featured: e.featured, founder: (e._count?.foundingSlots ?? 0) > 0,
    ratingAvg: num(e.ratingAvg), ratingCount: e.ratingCount,
    ...withCmr(e.data, collectionKey), publishedAt: iso(e.publishedAt), updatedAt: e.updatedAt.toISOString(),
    // services and prices: whether the team arranged the page with blocks (a page with only the seeded skeleton is not finished)
    // `ready`: the page may be shown in full (blocks without the marker, or a written body, and not ticked "în construcție"); a page that is not ready is shown as "în construcție"
    ...(isContentCollection(collectionKey) ? (() => { const l = effectiveContentLayout(e.layout); return { hasBlocks: l.blocks.length > 0, ready: !isWip(e.data) && contentReady(l, e.body), wip: isWip(e.data) } })() : {}),
    // a firm's own page for its projects; the service categories chosen by a firm come with their titles
    parent: e.parent ? { slug: e.parent.slug, title: e.parent.title, city: e.parent.city, county: e.parent.county, logoUrl: e.parent.logoUrl, verified: e.parent.verified } : null,
    services: categoryTitles((e.data as Record<string, unknown> | null)?.servicii, cats),
    // a project's service category with its title (for the project page)
    ...(collectionKey === 'proiecte' ? { category: categoryTitles([(e.data as Record<string, unknown> | null)?.categorie], cats)[0] ?? null } : {}),
  }
}

export function serializeDetail(e: EntryRow, collectionKey: string, media: MediaRow[], reviews: ReviewRow[], cats?: { slug: string; title: string }[]) {
  return {
    ...serializeListItem(e, collectionKey, cats),
    // the firm's chosen home blocks (always valid: damaged storage falls back to the default)
    ...(collectionKey === 'companii' ? { layout: effectiveLayout(e.layout) } : {}),
    // services and prices: the blocks the team arranged (empty = the site draws its default layout)
    ...(isContentCollection(collectionKey) ? { pageLayout: effectiveContentLayout(e.layout) } : {}),
    body: e.body, phone: e.phone, websiteUrl: e.websiteUrl,
    seo: { title: e.seoTitle, description: e.seoDescription },
    media: media.filter((m) => !m.alt?.startsWith('cazuistica')).map((m) => ({ id: m.id, url: m.url, alt: m.alt, kind: m.kind, width: m.width, height: m.height })),
    reviews: reviews.map((r) => ({ authorName: r.authorName, rating: r.rating, title: r.title, body: r.body, createdAt: r.createdAt.toISOString() })),
  }
}

/** Collections expose their field definitions so the site can render filters and labels. */
export function serializeCollection(c: CollectionRow) {
  return { key: c.key, name: c.name, namePlural: c.namePlural, kind: c.kind, fields: Array.isArray(c.fields) ? c.fields : [] }
}
