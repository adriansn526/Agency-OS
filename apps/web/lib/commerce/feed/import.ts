/**
 * Feed import orchestrator — idempotent, bulk SQL (parameterized unnest) for speed.
 *
 *   parse → categories/group maps → vehicles → products → fitments/OE/links/stock
 *   → deactivate missing → (translations, listings & prices are separate steps)
 *
 * All SQL uses Prisma tagged templates (parameterized) — no string concatenation of values.
 */
import { createHash } from 'crypto'
import { db, Prisma } from '@repo/db'
import { parseGrTxtFeed, resolveFeedDir, type FeedData, type PriceRow } from './gr-txt-v1'
import { parseVehicleName } from '../vehicles'
import { parseAttributes, parseGroup, resolveBrandQuality } from '../attributes'
import { CATEGORY_TREE, categoryForGroup, categoryForDescription, bulkyClassFor } from '../categories'
import { normalizeOe } from '../text'

const CHUNK = 10_000

export interface ImportStats {
  rows: number
  parseErrors: number
  products: number
  productsCreated: number
  productsChanged: number
  productsDeactivated: number
  vehicles: { models: number; mapped: number; unmapped: number; generationsCreated: number }
  fitments: number
  oeCodes: number
  links: number
  stockRows: number
  groups: number
  timingsMs: Record<string, number>
}

function chunk<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function md5(s: string): string {
  return createHash('md5').update(s).digest('hex')
}

// ─────────────────────────────────────────────────────────────
// Categories & group maps
// ─────────────────────────────────────────────────────────────
export async function ensureCategories(): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>()
  // Parents first (create-only: never overwrite admin edits)
  for (const def of [...CATEGORY_TREE].sort((a, b) => Number(!!a.parent) - Number(!!b.parent))) {
    const parentId = def.parent ? bySlug.get(def.parent) ?? null : null
    const cat = await db.commerceCategory.upsert({
      where: { slug: def.slug },
      update: {},
      create: { slug: def.slug, nameRo: def.nameRo, parentId, bulkyClass: def.bulky ?? 'standard', sortOrder: CATEGORY_TREE.indexOf(def) },
      select: { id: true },
    })
    bySlug.set(def.slug, cat.id)
  }
  // Include admin-created categories too
  for (const c of await db.commerceCategory.findMany({ select: { id: true, slug: true } })) bySlug.set(c.slug, c.id)
  return bySlug
}

async function syncGroupMaps(feedId: string, groups: string[], catBySlug: Map<string, string>) {
  const existing = await db.commerceGroupMap.findMany({ where: { feedId } })
  const known = new Set(existing.map((g) => g.groupCode))
  const toCreate = groups.filter((g) => !known.has(g))
  if (toCreate.length) {
    await db.commerceGroupMap.createMany({
      data: toCreate.map((groupCode) => {
        const slug = categoryForGroup(groupCode)
        const gi = parseGroup(groupCode)
        return { feedId, groupCode, categoryId: slug ? catBySlug.get(slug) ?? null : null, brand: gi.brand, quality: gi.quality }
      }),
      skipDuplicates: true,
    })
  }
  return db.commerceGroupMap.findMany({ where: { feedId } })
}

// ─────────────────────────────────────────────────────────────
// Vehicles
// ─────────────────────────────────────────────────────────────
async function syncVehicles(feedId: string, models: Map<string, { make: string; name: string }>) {
  const maps = await db.commerceModelMap.findMany({ where: { feedId } })
  const byCode = new Map(maps.map((m) => [m.modelCode, m]))
  const makeCache = new Map<string, string>()
  const modelCache = new Map<string, string>()
  const genCache = new Map<string, string>()
  let generationsCreated = 0

  const result = new Map<string, string | null>()
  for (const [code, { make, name }] of models) {
    const existing = byCode.get(code)
    if (existing?.generationId && (existing.isManual || existing.rawName === name)) {
      result.set(code, existing.generationId)
      continue
    }
    const p = parseVehicleName(name, make)
    let generationId: string | null = null
    if (p) {
      let makeId = makeCache.get(p.makeSlug)
      if (!makeId) {
        makeId = (await db.vehicleMake.upsert({
          where: { slug: p.makeSlug },
          update: {},
          create: { slug: p.makeSlug, name: p.makeName },
          select: { id: true },
        })).id
        makeCache.set(p.makeSlug, makeId)
      }
      const modelKey = `${makeId}/${p.modelSlug}`
      let modelId = modelCache.get(modelKey)
      if (!modelId) {
        modelId = (await db.vehicleModel.upsert({
          where: { makeId_slug: { makeId, slug: p.modelSlug } },
          update: {},
          create: { makeId, slug: p.modelSlug, name: p.modelName },
          select: { id: true },
        })).id
        modelCache.set(modelKey, modelId)
      }
      const genKey = `${modelId}/${p.generationSlug}`
      generationId = genCache.get(genKey) ?? null
      if (!generationId) {
        const found = await db.vehicleGeneration.findUnique({ where: { modelId_slug: { modelId, slug: p.generationSlug } }, select: { id: true } })
        if (found) generationId = found.id
        else {
          generationId = (await db.vehicleGeneration.create({
            data: {
              modelId, slug: p.generationSlug, name: p.generationName, variant: p.variant,
              yearFrom: p.yearFrom, yearTo: p.yearTo, chassisCodes: p.chassisCodes, bodyTypes: p.bodyTypes,
            },
            select: { id: true },
          })).id
          generationsCreated++
        }
        genCache.set(genKey, generationId)
      }
    }
    await db.commerceModelMap.upsert({
      where: { feedId_modelCode: { feedId, modelCode: code } },
      update: { rawName: name, ...(existing?.isManual ? {} : { generationId }) },
      create: { feedId, modelCode: code, rawName: name, generationId },
    })
    result.set(code, existing?.isManual ? existing.generationId : generationId)
  }
  const mapped = [...result.values()].filter(Boolean).length
  return { byCode: result, stats: { models: models.size, mapped, unmapped: models.size - mapped, generationsCreated } }
}

// ─────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────
interface ProductInput {
  code: string
  group: string
  categoryId: string | null
  nameEn: string
  nameEl: string | null
  oeMain: string | null
  side: string | null
  brand: string | null
  quality: string | null
  attributes: string
  bulky: string
  cost: number
  hash: string
}

function buildProducts(rows: PriceRow[], groupMaps: Awaited<ReturnType<typeof syncGroupMaps>>, catBySlug: Map<string, string>, catById: Map<string, string>) {
  const gm = new Map(groupMaps.map((g) => [g.groupCode, g]))
  const canonical = new Map<string, PriceRow>()
  for (const r of rows) {
    const cur = canonical.get(r.baseCode)
    if (!cur || (r.listingCode === r.baseCode && cur.listingCode !== cur.baseCode)) canonical.set(r.baseCode, r)
  }
  const products: ProductInput[] = []
  for (const r of canonical.values()) {
    const g = gm.get(r.group)
    const parsed = parseAttributes(r.nameEn)
    const bq = resolveBrandQuality(parsed, { brand: g?.brand ?? null, quality: (g?.quality as never) ?? null })
    const categoryId = g?.categoryId ?? catBySlug.get(categoryForDescription(r.nameEn)) ?? null
    const catSlug = categoryId ? catById.get(categoryId) : undefined
    const side = r.side === 'LE' ? 'L' : r.side === 'RI' ? 'R' : null
    const attributes = JSON.stringify(parsed.attributes)
    const bulky = bulkyClassFor(catSlug ?? 'diverse')
    const base = {
      group: r.group, categoryId, nameEn: r.nameEn, nameEl: r.nameEl || null, oeMain: r.oeMain || null,
      side, brand: bq.brand, quality: bq.quality, attributes, bulky, cost: r.price,
    }
    products.push({ code: r.baseCode, ...base, hash: md5(JSON.stringify(base)) })
  }
  return products
}

async function upsertProducts(feedId: string, currency: string, products: ProductInput[]) {
  const existing = await db.commerceProduct.findMany({ where: { feedId }, select: { supplierCode: true, contentHash: true } })
  const prev = new Map(existing.map((p) => [p.supplierCode, p.contentHash]))
  let created = 0
  let changed = 0
  for (const p of products) {
    if (!prev.has(p.code)) created++
    else if (prev.get(p.code) !== p.hash) changed++
  }

  for (const c of chunk(products)) {
    await db.$executeRaw`
      INSERT INTO "CommerceProduct" (
        "id", "feedId", "supplierCode", "groupCode", "categoryId", "nameEn", "nameEl", "oeMain", "side",
        "brand", "quality", "attributes", "bulkyClass", "costPrice", "costCurrency", "contentHash",
        "isActive", "firstSeenAt", "lastSeenAt", "updatedAt"
      )
      SELECT gen_random_uuid()::text, ${feedId}, u.code, u.grp, u.cat, u.en, u.el, u.oe, u.side,
             u.brand, u.quality, u.attrs::jsonb, u.bulky, u.cost, ${currency}, u.hash,
             true, now(), now(), now()
      FROM unnest(
        ${c.map((p) => p.code)}::text[], ${c.map((p) => p.group)}::text[], ${c.map((p) => p.categoryId)}::text[],
        ${c.map((p) => p.nameEn)}::text[], ${c.map((p) => p.nameEl)}::text[], ${c.map((p) => p.oeMain)}::text[],
        ${c.map((p) => p.side)}::text[], ${c.map((p) => p.brand)}::text[], ${c.map((p) => p.quality)}::text[],
        ${c.map((p) => p.attributes)}::text[], ${c.map((p) => p.bulky)}::text[], ${c.map((p) => p.cost)}::numeric[],
        ${c.map((p) => p.hash)}::text[]
      ) AS u(code, grp, cat, en, el, oe, side, brand, quality, attrs, bulky, cost, hash)
      ON CONFLICT ("feedId", "supplierCode") DO UPDATE SET
        "lastSeenAt" = now(),
        "isActive" = true,
        "groupCode" = EXCLUDED."groupCode",
        "categoryId" = EXCLUDED."categoryId",
        "nameEn" = EXCLUDED."nameEn",
        "nameEl" = EXCLUDED."nameEl",
        "oeMain" = EXCLUDED."oeMain",
        "side" = EXCLUDED."side",
        "brand" = EXCLUDED."brand",
        "quality" = EXCLUDED."quality",
        "attributes" = EXCLUDED."attributes",
        "bulkyClass" = EXCLUDED."bulkyClass",
        "costPrice" = EXCLUDED."costPrice",
        "contentHash" = EXCLUDED."contentHash",
        -- Re-translate when the source name changes (keep manual translations)
        "nameRo" = CASE WHEN "CommerceProduct"."nameEn" IS DISTINCT FROM EXCLUDED."nameEn"
                         AND COALESCE("CommerceProduct"."nameRoSource", '') <> 'manual'
                        THEN NULL ELSE "CommerceProduct"."nameRo" END,
        "updatedAt" = CASE WHEN "CommerceProduct"."contentHash" IS DISTINCT FROM EXCLUDED."contentHash"
                           THEN now() ELSE "CommerceProduct"."updatedAt" END
    `
  }
  return { created, changed }
}

// ─────────────────────────────────────────────────────────────
// Relations (fitments, OE, links, stock) — staging temp tables, diff-sync
// ─────────────────────────────────────────────────────────────
async function syncRelations(feedId: string, data: FeedData, genByModel: Map<string, string | null>) {
  const listingToBases = new Map<string, Set<string>>()
  for (const r of data.rows) {
    if (!listingToBases.has(r.listingCode)) listingToBases.set(r.listingCode, new Set())
    listingToBases.get(r.listingCode)!.add(r.baseCode)
  }
  const basesFor = (code: string): string[] => [...(listingToBases.get(code) ?? [])]

  // Fitments
  const fitSeen = new Set<string>()
  const fit: { base: string[]; gen: string[]; listing: string[] } = { base: [], gen: [], listing: [] }
  for (const r of data.rows) {
    const gen = genByModel.get(r.modelCode)
    if (!gen) continue
    const k = `${r.baseCode}|${gen}|${r.listingCode}`
    if (fitSeen.has(k)) continue
    fitSeen.add(k)
    fit.base.push(r.baseCode); fit.gen.push(gen); fit.listing.push(r.listingCode)
  }

  // OE codes (GENUINE is keyed by listing code; may map to several base articles)
  const oeSeen = new Set<string>()
  const oe: { base: string[]; raw: string[]; norm: string[] } = { base: [], raw: [], norm: [] }
  const addOe = (base: string, raw: string) => {
    const norm = normalizeOe(raw)
    if (norm.length < 3) return
    const k = `${base}|${norm}`
    if (oeSeen.has(k)) return
    oeSeen.add(k)
    oe.base.push(base); oe.raw.push(raw); oe.norm.push(norm)
  }
  for (const [code, raw] of data.genuine) for (const b of basesFor(code)) addOe(b, raw)
  for (const r of data.rows) if (r.oeMain) addOe(r.baseCode, r.oeMain)

  // Equivalent links (REFAR)
  const linkSeen = new Set<string>()
  const link: { a: string[]; b: string[] } = { a: [], b: [] }
  for (const [x, y] of data.refar) {
    for (const a of basesFor(x)) for (const b of basesFor(y)) {
      if (a === b) continue
      const k = `${a}|${b}`
      if (linkSeen.has(k)) continue
      linkSeen.add(k)
      link.a.push(a); link.b.push(b)
    }
  }

  // Stock (keyed by code; base articles appear as their own listing code)
  const stockSeen = new Set<string>()
  const st: { base: string[]; wh: string[]; flag: number[] } = { base: [], wh: [], flag: [] }
  const baseSet = new Set(data.rows.map((r) => r.baseCode))
  for (const [wh, code, flag] of data.stock) {
    if (!baseSet.has(code)) continue
    const k = `${code}|${wh}`
    if (stockSeen.has(k)) continue
    stockSeen.add(k)
    st.base.push(code); st.wh.push(wh); st.flag.push(flag)
  }

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`CREATE TEMP TABLE tmp_fit (base text, gen text, listing text) ON COMMIT DROP`
    await tx.$executeRaw`CREATE TEMP TABLE tmp_oe (base text, raw text, norm text) ON COMMIT DROP`
    await tx.$executeRaw`CREATE TEMP TABLE tmp_link (a text, b text) ON COMMIT DROP`
    await tx.$executeRaw`CREATE TEMP TABLE tmp_stock (base text, wh text, flag int) ON COMMIT DROP`
    await tx.$executeRaw`CREATE TEMP TABLE tmp_prod ON COMMIT DROP AS
      SELECT id, "supplierCode" AS code FROM "CommerceProduct" WHERE "feedId" = ${feedId}`
    await tx.$executeRaw`CREATE UNIQUE INDEX ON tmp_prod (code)`

    for (let i = 0; i < fit.base.length; i += CHUNK) {
      await tx.$executeRaw`INSERT INTO tmp_fit SELECT * FROM unnest(${fit.base.slice(i, i + CHUNK)}::text[], ${fit.gen.slice(i, i + CHUNK)}::text[], ${fit.listing.slice(i, i + CHUNK)}::text[])`
    }
    for (let i = 0; i < oe.base.length; i += CHUNK) {
      await tx.$executeRaw`INSERT INTO tmp_oe SELECT * FROM unnest(${oe.base.slice(i, i + CHUNK)}::text[], ${oe.raw.slice(i, i + CHUNK)}::text[], ${oe.norm.slice(i, i + CHUNK)}::text[])`
    }
    for (let i = 0; i < link.a.length; i += CHUNK) {
      await tx.$executeRaw`INSERT INTO tmp_link SELECT * FROM unnest(${link.a.slice(i, i + CHUNK)}::text[], ${link.b.slice(i, i + CHUNK)}::text[])`
    }
    for (let i = 0; i < st.base.length; i += CHUNK) {
      await tx.$executeRaw`INSERT INTO tmp_stock SELECT * FROM unnest(${st.base.slice(i, i + CHUNK)}::text[], ${st.wh.slice(i, i + CHUNK)}::text[], ${st.flag.slice(i, i + CHUNK)}::int[])`
    }

    // Fitments
    await tx.$executeRaw`CREATE INDEX ON tmp_fit (base, gen, listing)`
    await tx.$executeRaw`CREATE INDEX ON tmp_oe (base, norm)`
    await tx.$executeRaw`CREATE INDEX ON tmp_link (a, b)`
    await tx.$executeRaw`CREATE INDEX ON tmp_stock (base)`
    await tx.$executeRaw`ANALYZE tmp_fit`
    await tx.$executeRaw`ANALYZE tmp_oe`
    await tx.$executeRaw`ANALYZE tmp_link`
    await tx.$executeRaw`ANALYZE tmp_stock`
    await tx.$executeRaw`ANALYZE tmp_prod`
    await tx.$executeRaw`
      DELETE FROM "CommerceFitment" f USING tmp_prod p
      WHERE f."productId" = p.id AND NOT EXISTS (
        SELECT 1 FROM tmp_fit t WHERE t.base = p.code AND t.gen = f."generationId" AND t.listing = f."listingCode")`
    await tx.$executeRaw`
      INSERT INTO "CommerceFitment" ("id", "productId", "generationId", "listingCode")
      SELECT gen_random_uuid()::text, p.id, t.gen, t.listing FROM tmp_fit t JOIN tmp_prod p ON p.code = t.base
      ON CONFLICT ("productId", "generationId", "listingCode") DO NOTHING`

    // OE codes
    await tx.$executeRaw`
      DELETE FROM "CommerceOeCode" o USING tmp_prod p
      WHERE o."productId" = p.id AND NOT EXISTS (SELECT 1 FROM tmp_oe t WHERE t.base = p.code AND t.norm = o."normalized")`
    await tx.$executeRaw`
      INSERT INTO "CommerceOeCode" ("id", "productId", "raw", "normalized")
      SELECT gen_random_uuid()::text, p.id, t.raw, t.norm FROM tmp_oe t JOIN tmp_prod p ON p.code = t.base
      ON CONFLICT ("productId", "normalized") DO NOTHING`

    // Links
    await tx.$executeRaw`
      DELETE FROM "CommerceProductLink" l USING tmp_prod pa, tmp_prod pb
      WHERE l."productId" = pa.id AND l."relatedId" = pb.id AND l."type" = 'equivalent'
        AND NOT EXISTS (SELECT 1 FROM tmp_link t WHERE t.a = pa.code AND t.b = pb.code)`
    await tx.$executeRaw`
      INSERT INTO "CommerceProductLink" ("id", "productId", "relatedId", "type")
      SELECT gen_random_uuid()::text, pa.id, pb.id, 'equivalent'
      FROM tmp_link t JOIN tmp_prod pa ON pa.code = t.a JOIN tmp_prod pb ON pb.code = t.b
      ON CONFLICT ("productId", "relatedId", "type") DO NOTHING`

    // Stock
    await tx.$executeRaw`
      INSERT INTO "CommerceStock" ("id", "productId", "warehouse", "rawFlag", "updatedAt")
      SELECT gen_random_uuid()::text, p.id, t.wh, t.flag, now() FROM tmp_stock t JOIN tmp_prod p ON p.code = t.base
      ON CONFLICT ("productId", "warehouse") DO UPDATE SET "rawFlag" = EXCLUDED."rawFlag", "updatedAt" = now()
      WHERE "CommerceStock"."rawFlag" IS DISTINCT FROM EXCLUDED."rawFlag"`
  }, { timeout: 600_000, maxWait: 30_000 })

  return { fitments: fit.base.length, oeCodes: oe.base.length, links: link.a.length, stockRows: st.base.length }
}

// ─────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────
export async function runFeedImport(feedCode: string, triggeredBy = 'manual') {
  const feed = await db.commerceSupplierFeed.findUnique({ where: { code: feedCode } })
  if (!feed) throw new Error(`Feed "${feedCode}" not found`)
  if (!feed.isActive) throw new Error(`Feed "${feedCode}" is inactive`)
  if (feed.format !== 'gr-txt-v1') throw new Error(`Unsupported feed format: ${feed.format}`)

  const running = await db.commerceFeedRun.findFirst({
    where: { feedId: feed.id, status: 'running', startedAt: { gt: new Date(Date.now() - 60 * 60_000) } },
  })
  if (running) throw new Error('Another import for this feed is already running')

  const run = await db.commerceFeedRun.create({ data: { feedId: feed.id, triggeredBy } })
  const t0 = Date.now()
  const timings: Record<string, number> = {}
  const lap = (k: string, from: number) => { timings[k] = Date.now() - from; return Date.now() }

  try {
    let t = Date.now()
    const cfg = (feed.sourceConfig ?? {}) as { dir?: string }
    if (feed.sourceType !== 'local' || !cfg.dir) throw new Error('Only local feed sources are supported for now')
    const data = parseGrTxtFeed(resolveFeedDir(cfg.dir), feed.encoding)
    if (data.rows.length === 0) throw new Error('Price list is empty — aborting to avoid deactivating the catalog')
    t = lap('parse', t)

    const catBySlug = await ensureCategories()
    const catById = new Map([...catBySlug].map(([slug, id]) => [id, slug]))
    const groups = [...new Set(data.rows.map((r) => r.group))]
    const groupMaps = await syncGroupMaps(feed.id, groups, catBySlug)
    t = lap('groups', t)

    const models = new Map<string, { make: string; name: string }>()
    for (const r of data.rows) if (!models.has(r.modelCode)) models.set(r.modelCode, { make: r.make, name: r.modelName })
    const vehicles = await syncVehicles(feed.id, models)
    t = lap('vehicles', t)

    const products = buildProducts(data.rows, groupMaps, catBySlug, catById)
    const startedAt = new Date()
    const up = await upsertProducts(feed.id, feed.currency, products)
    t = lap('products', t)

    const rel = await syncRelations(feed.id, data, vehicles.byCode)
    t = lap('relations', t)

    // Safety: never deactivate more than 30% of the catalog in a single run
    const activeBefore = await db.commerceProduct.count({ where: { feedId: feed.id, isActive: true } })
    const toDeactivate = await db.commerceProduct.count({ where: { feedId: feed.id, isActive: true, lastSeenAt: { lt: startedAt } } })
    let deactivated = 0
    if (activeBefore > 0 && toDeactivate / activeBefore > 0.3) {
      data.errors.push(`Skipped deactivation of ${toDeactivate} products (>30% of catalog) — manual review required`)
    } else if (toDeactivate > 0) {
      deactivated = await db.$executeRaw`
        UPDATE "CommerceProduct" SET "isActive" = false, "updatedAt" = now()
        WHERE "feedId" = ${feed.id} AND "isActive" = true AND "lastSeenAt" < ${startedAt}`
    }
    lap('deactivate', t)

    const stats: ImportStats = {
      rows: data.rows.length,
      parseErrors: data.errors.length,
      products: products.length,
      productsCreated: up.created,
      productsChanged: up.changed,
      productsDeactivated: deactivated,
      vehicles: vehicles.stats,
      ...rel,
      groups: groups.length,
      timingsMs: timings,
    }
    await db.commerceFeedRun.update({
      where: { id: run.id },
      data: {
        status: 'success', finishedAt: new Date(), durationMs: Date.now() - t0,
        stats: { ...stats, errorsSample: data.errors.slice(0, 50) } as unknown as Prisma.InputJsonValue,
      },
    })
    await db.commerceSupplierFeed.update({ where: { id: feed.id }, data: { lastRunAt: new Date() } })
    return { runId: run.id, stats }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db.commerceFeedRun.update({
      where: { id: run.id },
      data: { status: 'failed', finishedAt: new Date(), durationMs: Date.now() - t0, error: message.slice(0, 2000) },
    })
    throw err
  }
}
