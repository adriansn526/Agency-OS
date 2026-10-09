/**
 * Read-only storefront queries, always scoped to a BusinessLine (listing.businessLineId).
 * All raw SQL uses Prisma tagged templates (parameterized).
 */
import { db, Prisma } from '@repo/db'
import { normalizeOe } from '../text'
import { StorefrontInputError, type StorefrontContext } from './auth'

const SLUG_RE = /^[a-z0-9-]{1,140}$/
const QUALITIES = new Set(['OE', 'A', 'B', 'aftermarket'])
const SORTS = new Set(['relevance', 'price_asc', 'price_desc', 'name'])

function slugParam(v: string | null, name: string): string | null {
  if (v == null || v === '') return null
  if (!SLUG_RE.test(v)) throw new StorefrontInputError(`Invalid ${name}`)
  return v
}

// ─── small TTL cache for heavy aggregate endpoints ───
const TTL_MAX_ENTRIES = 500
const ttl = new Map<string, { until: number; data: unknown }>()
const inflight = new Map<string, Promise<unknown>>()
async function cached<T>(key: string, ms: number, fn: () => Promise<T>): Promise<T> {
  const hit = ttl.get(key)
  if (hit && Date.now() < hit.until) return hit.data as T
  // concurrent callers for the same key share one query instead of each hitting the DB
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>
  const p = fn()
    .then((data) => {
      const now = Date.now()
      if (ttl.size >= TTL_MAX_ENTRIES) for (const [k, v] of ttl) if (v.until <= now) ttl.delete(k)
      if (ttl.size >= TTL_MAX_ENTRIES) ttl.delete(ttl.keys().next().value!)
      ttl.set(key, { until: now + ms, data })
      return data
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

export function availabilityFor(stock: { rawFlag: number }[], meaning: string): 'in_stock' | 'out_of_stock' | 'confirm_on_order' {
  if (meaning === 'one_in_stock') return stock.some((s) => s.rawFlag === 1) ? 'in_stock' : 'out_of_stock'
  if (meaning === 'one_out_of_stock') return stock.some((s) => s.rawFlag === 0) ? 'in_stock' : 'out_of_stock'
  return 'confirm_on_order'
}

// ─── Vehicles ───
export async function listMakes(ctx: StorefrontContext) {
  return cached(`makes:${ctx.businessLineId}`, 10 * 60_000, async () => {
    const rows = await db.$queryRaw<Array<{ slug: string; name: string; logoUrl: string | null; products: bigint }>>`
      SELECT mk.slug, mk.name, mk."logoUrl", COUNT(DISTINCT l.id) AS products
      FROM "VehicleMake" mk
      JOIN "VehicleModel" m ON m."makeId" = mk.id AND m."isActive"
      JOIN "VehicleGeneration" g ON g."modelId" = m.id AND g."isActive"
      JOIN "CommerceFitment" f ON f."generationId" = g.id
      JOIN "CommerceListing" l ON l."productId" = f."productId" AND l."businessLineId" = ${ctx.businessLineId} AND l."isActive" AND l."priceRon" IS NOT NULL
      WHERE mk."isActive"
      GROUP BY mk.id ORDER BY mk."sortOrder" DESC, mk.name`
    return rows.map((r) => ({ ...r, products: Number(r.products) }))
  })
}

export async function listModels(ctx: StorefrontContext, makeSlug: string) {
  return cached(`models:${ctx.businessLineId}:${makeSlug}`, 10 * 60_000, async () => {
    const make = await db.vehicleMake.findUnique({ where: { slug: makeSlug }, select: { id: true, slug: true, name: true } })
    if (!make) return null
    const rows = await db.$queryRaw<Array<{
      modelSlug: string; modelName: string; genId: string; genSlug: string; genName: string
      variant: string | null; yearFrom: number | null; yearTo: number | null; imageUrl: string | null; products: bigint
    }>>`
      SELECT m.slug AS "modelSlug", m.name AS "modelName", g.id AS "genId", g.slug AS "genSlug", g.name AS "genName",
             g.variant, g."yearFrom", g."yearTo", g."imageUrl", COUNT(DISTINCT l.id) AS products
      FROM "VehicleModel" m
      JOIN "VehicleGeneration" g ON g."modelId" = m.id AND g."isActive"
      JOIN "CommerceFitment" f ON f."generationId" = g.id
      JOIN "CommerceListing" l ON l."productId" = f."productId" AND l."businessLineId" = ${ctx.businessLineId} AND l."isActive" AND l."priceRon" IS NOT NULL
      WHERE m."makeId" = ${make.id} AND m."isActive"
      GROUP BY m.id, g.id ORDER BY m.name, g."yearFrom" NULLS LAST, g.name`
    const models = new Map<string, { slug: string; name: string; generations: unknown[] }>()
    for (const r of rows) {
      if (!models.has(r.modelSlug)) models.set(r.modelSlug, { slug: r.modelSlug, name: r.modelName, generations: [] })
      models.get(r.modelSlug)!.generations.push({
        id: r.genId, slug: r.genSlug, name: r.genName, variant: r.variant,
        yearFrom: r.yearFrom, yearTo: r.yearTo, imageUrl: r.imageUrl, products: Number(r.products),
      })
    }
    return { make: { slug: make.slug, name: make.name }, models: [...models.values()] }
  })
}

export async function resolveGeneration(make: string, model: string, gen: string) {
  return db.vehicleGeneration.findFirst({
    where: { slug: gen, isActive: true, model: { slug: model, make: { slug: make } } },
    select: {
      id: true, slug: true, name: true, variant: true, yearFrom: true, yearTo: true, imageUrl: true, bodyTypes: true,
      model: { select: { slug: true, name: true, make: { select: { slug: true, name: true } } } },
    },
  })
}

// ─── Categories ───
export async function listCategories(ctx: StorefrontContext, generationId: string | null) {
  return cached(`cats:${ctx.businessLineId}:${generationId ?? '*'}`, 10 * 60_000, async () => {
    const cats = await db.commerceCategory.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true, slug: true, nameRo: true, description: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { nameRo: 'asc' }],
    })
    const counts = generationId
      ? await db.$queryRaw<Array<{ categoryId: string; n: bigint }>>`
          SELECT p."categoryId", COUNT(DISTINCT l.id) AS n
          FROM "CommerceListing" l JOIN "CommerceProduct" p ON p.id = l."productId"
          JOIN "CommerceFitment" f ON f."productId" = p.id AND f."generationId" = ${generationId}
          WHERE l."businessLineId" = ${ctx.businessLineId} AND l."isActive" AND l."priceRon" IS NOT NULL
          GROUP BY p."categoryId"`
      : await db.$queryRaw<Array<{ categoryId: string; n: bigint }>>`
          SELECT p."categoryId", COUNT(*) AS n
          FROM "CommerceListing" l JOIN "CommerceProduct" p ON p.id = l."productId"
          WHERE l."businessLineId" = ${ctx.businessLineId} AND l."isActive" AND l."priceRon" IS NOT NULL
          GROUP BY p."categoryId"`
    const own = new Map(counts.map((c) => [c.categoryId, Number(c.n)]))
    type Node = { slug: string; name: string; description: string | null; products: number; children: Node[] }
    const nodes = new Map<string, Node & { parentId: string | null }>()
    for (const c of cats) nodes.set(c.id, { slug: c.slug, name: c.nameRo, description: c.description, products: own.get(c.id) ?? 0, children: [], parentId: c.parentId })
    const roots: Node[] = []
    for (const n of nodes.values()) (n.parentId && nodes.get(n.parentId) ? nodes.get(n.parentId)!.children : roots).push(n)
    const total = (n: Node): number => (n.products += n.children.reduce((s, c) => s + total(c), 0), n.products)
    roots.forEach(total)
    const strip = (n: Node): Node | null => {
      if (n.products === 0) return null
      return { slug: n.slug, name: n.name, description: n.description, products: n.products, children: n.children.map(strip).filter((x): x is Node => !!x) }
    }
    return roots.map(strip).filter(Boolean)
  })
}

async function categoryIdsFor(slug: string): Promise<string[] | null> {
  const cats = await db.commerceCategory.findMany({ select: { id: true, parentId: true, slug: true } })
  const root = cats.find((c) => c.slug === slug)
  if (!root) return null
  const out = [root.id]
  for (let i = 0; i < out.length; i++) for (const c of cats) if (c.parentId === out[i]) out.push(c.id)
  return out
}

// ─── Products ───
const listingSelect = {
  slug: true, priceRon: true, compareAtRon: true,
  product: {
    select: {
      supplierCode: true, nameRo: true, oeMain: true, side: true, brand: true, quality: true, images: true, bulkyClass: true,
      category: { select: { slug: true, nameRo: true } },
      stock: { select: { rawFlag: true } },
    },
  },
} satisfies Prisma.CommerceListingSelect

type ListingRow = Prisma.CommerceListingGetPayload<{ select: typeof listingSelect }>

function toCard(l: ListingRow, meaning: string) {
  const p = l.product
  return {
    slug: l.slug,
    sku: p.supplierCode,
    name: p.nameRo,
    oe: p.oeMain,
    side: p.side,
    brand: p.brand,
    quality: p.quality,
    image: p.images[0] ?? null,
    category: p.category ? { slug: p.category.slug, name: p.category.nameRo } : null,
    priceRon: l.priceRon != null ? Number(l.priceRon) : null,
    compareAtRon: l.compareAtRon != null ? Number(l.compareAtRon) : null,
    bulky: p.bulkyClass === 'large' || p.bulkyClass === 'xlarge',
    availability: availabilityFor(p.stock, meaning),
  }
}

export async function listProducts(ctx: StorefrontContext, sp: URLSearchParams) {
  const page = Math.max(1, Math.min(500, Number(sp.get('page') ?? 1) || 1))
  const pageSize = Math.max(1, Math.min(60, Number(sp.get('pageSize') ?? 24) || 24))
  const sort = sp.get('sort') ?? 'relevance'
  if (!SORTS.has(sort)) throw new StorefrontInputError('Invalid sort')
  const side = sp.get('side')
  if (side && side !== 'L' && side !== 'R') throw new StorefrontInputError('Invalid side')
  const quality = sp.get('quality')
  if (quality && !QUALITIES.has(quality)) throw new StorefrontInputError('Invalid quality')
  const q = (sp.get('q') ?? '').trim().slice(0, 80)

  const where: Prisma.CommerceListingWhereInput = { businessLineId: ctx.businessLineId, isActive: true, priceRon: { not: null } }
  const pw: Prisma.CommerceProductWhereInput = { isActive: true }

  let generation: Awaited<ReturnType<typeof resolveGeneration>> = null
  const make = slugParam(sp.get('make'), 'make'), model = slugParam(sp.get('model'), 'model'), gen = slugParam(sp.get('gen'), 'gen')
  if (make && model && gen) {
    generation = await resolveGeneration(make, model, gen)
    if (!generation) return null
    pw.fitments = { some: { generationId: generation.id } }
  }
  const catSlug = slugParam(sp.get('category'), 'category')
  let category: { slug: string; name: string } | null = null
  if (catSlug) {
    const ids = await categoryIdsFor(catSlug)
    if (!ids) return null
    pw.categoryId = { in: ids }
    const c = await db.commerceCategory.findUnique({ where: { slug: catSlug }, select: { slug: true, nameRo: true } })
    category = c ? { slug: c.slug, name: c.nameRo } : null
  }
  if (side) pw.side = side
  if (quality) pw.quality = quality
  if (q) {
    const oe = normalizeOe(q)
    pw.OR = [
      { nameRo: { contains: q, mode: 'insensitive' } },
      ...(oe.length >= 4 ? [{ oeCodes: { some: { normalized: { startsWith: oe } } } }, { supplierCode: { startsWith: q.toUpperCase() } }] : []),
    ]
  }
  where.product = pw

  const orderBy: Prisma.CommerceListingOrderByWithRelationInput[] =
    sort === 'price_asc' ? [{ priceRon: 'asc' }] :
    sort === 'price_desc' ? [{ priceRon: 'desc' }] :
    sort === 'name' ? [{ product: { nameRo: 'asc' } }] :
    [{ product: { categoryId: 'asc' } }, { priceRon: 'asc' }]

  const [total, rows] = await Promise.all([
    // count() is a full parallel hash join (~70 ms) and doesn't depend on page/sort: cache per filter set
    cached(`count:${JSON.stringify(where)}`, 60_000, () => db.commerceListing.count({ where })),
    db.commerceListing.findMany({ where, select: listingSelect, orderBy: [...orderBy, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
  ])
  return {
    page, pageSize, total, pages: Math.ceil(total / pageSize),
    vehicle: generation ? {
      make: generation.model.make, model: { slug: generation.model.slug, name: generation.model.name },
      generation: { slug: generation.slug, name: generation.name, variant: generation.variant, yearFrom: generation.yearFrom, yearTo: generation.yearTo, imageUrl: generation.imageUrl },
    } : null,
    category,
    items: rows.map((r) => toCard(r, ctx.stockFlagMeaning)),
  }
}

export async function getProduct(ctx: StorefrontContext, slug: string) {
  if (!SLUG_RE.test(slug)) throw new StorefrontInputError('Invalid slug')
  const l = await db.commerceListing.findUnique({
    where: { businessLineId_slug: { businessLineId: ctx.businessLineId, slug } },
    select: {
      ...listingSelect, isActive: true, seoTitle: true, seoDescription: true, productId: true,
      product: {
        select: {
          ...listingSelect.product.select, attributes: true, isActive: true,
          oeCodes: { select: { raw: true }, take: 30 },
          fitments: {
            select: { generation: { select: { slug: true, name: true, variant: true, yearFrom: true, yearTo: true, model: { select: { slug: true, name: true, make: { select: { slug: true, name: true } } } } } } },
            distinct: ['generationId'], take: 100,
          },
          links: { select: { type: true, related: { select: { listings: { where: { businessLineId: ctx.businessLineId, isActive: true, priceRon: { not: null } }, select: listingSelect, take: 1 } } } }, take: 12 },
        },
      },
    },
  })
  if (!l || !l.isActive || !l.product.isActive || l.priceRon == null) return null
  return {
    ...toCard(l, ctx.stockFlagMeaning),
    seoTitle: l.seoTitle, seoDescription: l.seoDescription,
    attributes: l.product.attributes,
    oeCodes: [...new Set(l.product.oeCodes.map((o) => o.raw))],
    fitments: l.product.fitments.map(({ generation: g }) => ({
      make: g.model.make, model: { slug: g.model.slug, name: g.model.name },
      generation: { slug: g.slug, name: g.name, variant: g.variant, yearFrom: g.yearFrom, yearTo: g.yearTo },
    })),
    related: l.product.links.flatMap((k) => k.related.listings.map((rl) => ({ type: k.type, ...toCard(rl, ctx.stockFlagMeaning) }))),
  }
}

export async function searchSuggest(ctx: StorefrontContext, qRaw: string) {
  const q = qRaw.trim().slice(0, 80)
  if (q.length < 2) return { products: [], vehicles: [] }
  const oe = normalizeOe(q)
  const [products, vehicles] = await Promise.all([
    db.commerceListing.findMany({
      where: {
        businessLineId: ctx.businessLineId, isActive: true, priceRon: { not: null },
        product: {
          isActive: true,
          OR: [
            { nameRo: { contains: q, mode: 'insensitive' } },
            ...(oe.length >= 4 ? [{ oeCodes: { some: { normalized: { startsWith: oe } } } }] : []),
          ],
        },
      },
      select: listingSelect, take: 8, orderBy: { priceRon: 'asc' },
    }),
    db.vehicleGeneration.findMany({
      where: { isActive: true, OR: [{ name: { contains: q, mode: 'insensitive' } }, { model: { name: { contains: q, mode: 'insensitive' } } }] },
      select: { slug: true, name: true, model: { select: { slug: true, name: true, make: { select: { slug: true, name: true } } } } },
      take: 6,
    }),
  ])
  return {
    products: products.map((p) => toCard(p, ctx.stockFlagMeaning)),
    vehicles: vehicles.map((g) => ({ make: g.model.make, model: { slug: g.model.slug, name: g.model.name }, generation: { slug: g.slug, name: g.name } })),
  }
}
