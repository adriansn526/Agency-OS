/**
 * Public shapes of the Website storefront API.
 * Whitelists on purpose: contact email, CRM / ERP links (leadId, clientId, tenantId), import ids and
 * moderation data never leave the ERP. New columns stay private until added here.
 */

import { categoryTitles } from '../glossary/taxonomy'

interface EntryRow {
  slug: string; title: string; summary: string | null; body: string | null
  city: string | null; county: string | null; address: string | null; lat: number | null; lng: number | null
  coverUrl: string | null; logoUrl: string | null; verified: boolean; featured: boolean
  ratingAvg: { toString(): string } | number | null; ratingCount: number
  data: unknown; seoTitle: string | null; seoDescription: string | null
  phone: string | null; websiteUrl: string | null
  parent?: { slug: string; title: string; city: string | null; county: string | null; logoUrl: string | null; verified: boolean } | null
  publishedAt: Date | null; updatedAt: Date
}
interface MediaRow { url: string; alt: string | null; kind: string; width: number | null; height: number | null }
interface ReviewRow { authorName: string; rating: number; title: string | null; body: string | null; createdAt: Date }
interface CollectionRow { key: string; name: string; namePlural: string; kind: string; fields: unknown }

const num = (v: EntryRow['ratingAvg']): number | null => (v == null ? null : Number(v.toString()))
const iso = (d: Date | null) => (d ? d.toISOString() : null)

export function serializeListItem(e: EntryRow, collectionKey: string) {
  return {
    collection: collectionKey, slug: e.slug, title: e.title, summary: e.summary,
    city: e.city, county: e.county, address: e.address, lat: e.lat, lng: e.lng,
    coverUrl: e.coverUrl, logoUrl: e.logoUrl, verified: e.verified, featured: e.featured,
    ratingAvg: num(e.ratingAvg), ratingCount: e.ratingCount,
    data: e.data ?? {}, publishedAt: iso(e.publishedAt), updatedAt: e.updatedAt.toISOString(),
    // a firm's own page for its projects; the service categories chosen by a firm come with their titles
    parent: e.parent ? { slug: e.parent.slug, title: e.parent.title, city: e.parent.city, county: e.parent.county, logoUrl: e.parent.logoUrl, verified: e.parent.verified } : null,
    services: categoryTitles((e.data as Record<string, unknown> | null)?.servicii),
  }
}

export function serializeDetail(e: EntryRow, collectionKey: string, media: MediaRow[], reviews: ReviewRow[]) {
  return {
    ...serializeListItem(e, collectionKey),
    body: e.body, phone: e.phone, websiteUrl: e.websiteUrl,
    seo: { title: e.seoTitle, description: e.seoDescription },
    media: media.map((m) => ({ url: m.url, alt: m.alt, kind: m.kind, width: m.width, height: m.height })),
    reviews: reviews.map((r) => ({ authorName: r.authorName, rating: r.rating, title: r.title, body: r.body, createdAt: r.createdAt.toISOString() })),
  }
}

/** Collections expose their field definitions so the site can render filters and labels. */
export function serializeCollection(c: CollectionRow) {
  return { key: c.key, name: c.name, namePlural: c.namePlural, kind: c.kind, fields: Array.isArray(c.fields) ? c.fields : [] }
}
