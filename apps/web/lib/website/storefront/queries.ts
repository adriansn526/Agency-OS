/** Read queries for the Website storefront API. Always scoped to the key's business line and to published content. */
import { db, Prisma } from '@repo/db'
import type { WebsiteContext } from './auth'
import { WebsiteInputError } from './auth'
import { parseListQuery, isSlug, type FieldDef } from './query'
import { serializeCollection, serializeDetail, serializeListItem } from './serialize'

const activeCollection = (ctx: WebsiteContext, key: string) =>
  db.websiteCollection.findFirst({ where: { businessLineId: ctx.businessLineId, key, isActive: true } })

export async function listCollections(ctx: WebsiteContext) {
  const rows = await db.websiteCollection.findMany({
    where: { businessLineId: ctx.businessLineId, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  const counts = await db.websiteEntry.groupBy({
    by: ['collectionId'],
    where: { businessLineId: ctx.businessLineId, status: 'published' },
    _count: { _all: true },
  })
  const byId = new Map(counts.map((c) => [c.collectionId, c._count._all]))
  return { items: rows.map((c) => ({ ...serializeCollection(c), total: byId.get(c.id) ?? 0 })) }
}

const ORDER: Record<string, Prisma.WebsiteEntryOrderByWithRelationInput[]> = {
  featured: [{ featured: 'desc' }, { verified: 'desc' }, { ratingAvg: { sort: 'desc', nulls: 'last' } }, { title: 'asc' }],
  name: [{ title: 'asc' }],
  rating: [{ ratingAvg: { sort: 'desc', nulls: 'last' } }, { ratingCount: 'desc' }, { title: 'asc' }],
  new: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { title: 'asc' }],
}

export async function listEntries(ctx: WebsiteContext, sp: URLSearchParams) {
  const key = sp.get('collection') ?? ''
  const collection = isSlug(key) ? await activeCollection(ctx, key) : null
  // parse first with the collection's fields so unknown filters are rejected, not silently ignored
  const q = parseListQuery(sp, ((collection?.fields as FieldDef[] | undefined) ?? []))
  if (!collection) return null

  const where: Prisma.WebsiteEntryWhereInput = {
    businessLineId: ctx.businessLineId,
    collectionId: collection.id,
    status: 'published',
    ...(q.verified ? { verified: true } : {}),
    ...(q.featured ? { featured: true } : {}),
    ...(q.county ? { county: { equals: q.county, mode: 'insensitive' } } : {}),
    ...(q.city ? { city: { equals: q.city, mode: 'insensitive' } } : {}),
    ...(q.q
      ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { summary: { contains: q.q, mode: 'insensitive' } }, { city: { contains: q.q, mode: 'insensitive' } }] }
      : {}),
    ...(Object.keys(q.fieldFilters).length
      ? { AND: Object.entries(q.fieldFilters).map(([k, v]) => ({ data: { path: [k], equals: v } })) }
      : {}),
  }

  const [total, rows] = await Promise.all([
    db.websiteEntry.count({ where }),
    db.websiteEntry.findMany({ where, orderBy: ORDER[q.sort], skip: (q.page - 1) * q.limit, take: q.limit }),
  ])
  return {
    collection: serializeCollection(collection),
    total, page: q.page, limit: q.limit, pages: Math.max(1, Math.ceil(total / q.limit)),
    items: rows.map((e) => serializeListItem(e, collection.key)),
  }
}

export async function getEntry(ctx: WebsiteContext, collectionKey: string, slug: string) {
  if (!isSlug(collectionKey) || !isSlug(slug)) throw new WebsiteInputError('Colecție sau slug invalid')
  const collection = await activeCollection(ctx, collectionKey)
  if (!collection) return null
  const entry = await db.websiteEntry.findFirst({
    where: { businessLineId: ctx.businessLineId, collectionId: collection.id, slug, status: 'published' },
    include: {
      media: { orderBy: { sortOrder: 'asc' }, take: 60 },
      reviews: { where: { status: 'approved' }, orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  return entry ? serializeDetail(entry, collection.key, entry.media, entry.reviews) : null
}

/** Slugs and last-modified dates of everything published, for the site's sitemap. */
export async function sitemap(ctx: WebsiteContext) {
  const rows = await db.websiteEntry.findMany({
    where: { businessLineId: ctx.businessLineId, status: 'published', collection: { isActive: true } },
    select: { slug: true, updatedAt: true, collection: { select: { key: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 50_000,
  })
  return { items: rows.map((r) => ({ collection: r.collection.key, slug: r.slug, updatedAt: r.updatedAt.toISOString() })) }
}
