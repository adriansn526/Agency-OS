/** Read queries for the Website storefront API. Always scoped to the key's business line and to published content. */
import { db, Prisma } from '@repo/db'
import type { WebsiteContext } from './auth'
import { WebsiteInputError } from './auth'
import { parseListQuery, isSlug, type FieldDef } from './query'
import { serializeCollection, serializeDetail, serializeListItem } from './serialize'
import { getTaxonomy } from '../glossary/live'

/** Children (a firm's projects) are public only while their parent entry is published. */
const PARENT_PUBLISHED: Prisma.WebsiteEntryWhereInput = { OR: [{ parentId: null }, { parent: { status: 'published' } }] }

const PARENT_SELECT = { slug: true, title: true, city: true, county: true, logoUrl: true, verified: true } satisfies Prisma.WebsiteEntrySelect

const activeCollection = (ctx: WebsiteContext, key: string) =>
  db.websiteCollection.findFirst({ where: { businessLineId: ctx.businessLineId, key, isActive: true } })

export async function listCollections(ctx: WebsiteContext) {
  const rows = await db.websiteCollection.findMany({
    where: { businessLineId: ctx.businessLineId, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  const counts = await db.websiteEntry.groupBy({
    by: ['collectionId'],
    where: { businessLineId: ctx.businessLineId, status: 'published', ...PARENT_PUBLISHED },
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
  const fieldDefs = (collection?.fields as FieldDef[] | undefined) ?? []
  const q = parseListQuery(sp, fieldDefs)
  if (!collection) return null

  const where: Prisma.WebsiteEntryWhereInput = {
    businessLineId: ctx.businessLineId,
    collectionId: collection.id,
    status: 'published',
    ...(q.verified ? { verified: true } : {}),
    ...(q.featured ? { featured: true } : {}),
    ...(q.parent ? { parent: { slug: q.parent } } : {}),
    ...(q.county ? { county: { equals: q.county, mode: 'insensitive' } } : {}),
    ...(q.city ? { city: { equals: q.city, mode: 'insensitive' } } : {}),
    ...(q.q
      ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { summary: { contains: q.q, mode: 'insensitive' } }, { city: { contains: q.q, mode: 'insensitive' } }] }
      : {}),
    // list fields hold several values (e.g. a firm's service categories): match membership; other fields: equality
    AND: [
      PARENT_PUBLISHED,
      ...Object.entries(q.fieldFilters).map(([k, v]) => ({ data: { path: [k], ...(fieldDefs.find((f) => f.key === k)?.type === 'list' ? { array_contains: v } : { equals: v }) } })),
    ],
  }

  const tax = await getTaxonomy(ctx.businessLineId)
  const [total, rows] = await Promise.all([
    db.websiteEntry.count({ where }),
    db.websiteEntry.findMany({ where, orderBy: ORDER[q.sort], skip: (q.page - 1) * q.limit, take: q.limit, include: { parent: { select: PARENT_SELECT }, _count: { select: { foundingSlots: true } } } }),
  ])
  // `facet=county`: number of published entries per county for the same filters (without the county filter itself)
  let facets: { county: { value: string; count: number }[] } | undefined
  if (sp.get('facet') === 'county') {
    const { county: _omit, ...withoutCounty } = where
    const groups = await db.websiteEntry.groupBy({ by: ['county'], where: withoutCounty, _count: { _all: true }, orderBy: { county: 'asc' } })
    facets = { county: groups.filter((g) => g.county).map((g) => ({ value: g.county!, count: g._count._all })) }
  }
  return {
    collection: serializeCollection(collection),
    total, page: q.page, limit: q.limit, pages: Math.max(1, Math.ceil(total / q.limit)),
    items: rows.map((e) => serializeListItem(e, collection.key, tax.categories)),
    ...(facets ? { facets } : {}),
  }
}

export async function getEntry(ctx: WebsiteContext, collectionKey: string, slug: string) {
  if (!isSlug(collectionKey) || !isSlug(slug)) throw new WebsiteInputError('Colecție sau slug invalid')
  const collection = await activeCollection(ctx, collectionKey)
  if (!collection) return null
  const entry = await db.websiteEntry.findFirst({
    where: { businessLineId: ctx.businessLineId, collectionId: collection.id, slug, status: 'published', ...PARENT_PUBLISHED },
    include: {
      parent: { select: PARENT_SELECT },
      _count: { select: { foundingSlots: true } },
      media: { orderBy: { sortOrder: 'asc' }, take: 60 },
      reviews: { where: { status: 'approved' }, orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  return entry ? serializeDetail(entry, collection.key, entry.media, entry.reviews, (await getTaxonomy(ctx.businessLineId)).categories) : null
}

/** Slugs and last-modified dates of everything published, for the site's sitemap. */
export async function sitemap(ctx: WebsiteContext) {
  const rows = await db.websiteEntry.findMany({
    where: { businessLineId: ctx.businessLineId, status: 'published', collection: { isActive: true }, ...PARENT_PUBLISHED },
    select: { slug: true, updatedAt: true, data: true, collection: { select: { key: true } }, parent: { select: { slug: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 50_000,
  })
  // custom pages are addressed by the firm and their own slug (the entry slug carries a random suffix)
  return { items: rows.flatMap((r) => {
    if (r.collection.key !== 'pagini') return [{ collection: r.collection.key, slug: r.slug, updatedAt: r.updatedAt.toISOString() }]
    const page = String(((r.data ?? {}) as { pagina?: unknown }).pagina ?? '')
    return page && r.parent ? [{ collection: 'pagini', slug: page, firm: r.parent.slug, updatedAt: r.updatedAt.toISOString() }] : []
  }) }
}
