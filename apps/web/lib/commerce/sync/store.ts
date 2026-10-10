/**
 * DB access for the supplier sync: snapshot reads and batched writes (parameterized unnest, one transaction per batch).
 * Nothing here deletes catalog data; "removal" is only ever isActive=false.
 */
import { randomUUID } from 'node:crypto'
import { db, Prisma } from '@repo/db'
import type { FeedPlan, PricePlanRow, RepriceRow, ReviewState, SnapshotProduct, StockPlanRow } from './plan'

export const BATCH = 2_000

export class SyncTimeoutError extends Error {
  constructor() { super('Sync exceeded its global time limit') }
}

export type Tick = () => void

/**
 * Numbers go to Postgres as text and are cast there: Prisma sends JS numbers as float8, and 592.93::float8::numeric
 * comes back as 592.9299999999999, which breaks the equality guards below (and would store drift in wider columns).
 */
const txt = (v: number | null | undefined): string | null => (v == null || !Number.isFinite(v) ? null : v.toFixed(4))

export function chunks<T>(arr: T[], size = BATCH): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** True when the additive DDL (prisma/sql/commerce_supplier_sync.sql) has been applied to this database. */
export async function syncTablesReady(): Promise<boolean> {
  const r = await db.$queryRaw<Array<{ ok: boolean }>>`
    SELECT (to_regclass('"CommerceSyncRun"') IS NOT NULL AND to_regclass('"CommerceSyncFile"') IS NOT NULL
        AND to_regclass('"CommerceSyncReview"') IS NOT NULL AND to_regclass('"CommerceSyncMissing"') IS NOT NULL) AS ok`
  return !!r[0]?.ok
}

// ─── snapshot ───

interface ProductRow {
  id: string; code: string; cost: number; isActive: boolean; brand: string | null; cat: string | null
  lid: string | null; price: number | null; psrc: string | null; manual: boolean | null; lactive: boolean | null; missing: boolean
}

export async function loadSnapshot(feedId: string, businessLineId: string, tablesReady: boolean): Promise<SnapshotProduct[]> {
  const rows = tablesReady
    ? await db.$queryRaw<ProductRow[]>`
        SELECT p.id, p."supplierCode" AS code, p."costPrice"::float8 AS cost, p."isActive", p.brand, c.slug AS cat,
               l.id AS lid, l."priceRon"::float8 AS price, l."priceSource" AS psrc, (l."manualPriceRon" IS NOT NULL) AS manual, l."isActive" AS lactive,
               (m."productId" IS NOT NULL) AS missing
        FROM "CommerceProduct" p
        LEFT JOIN "CommerceCategory" c ON c.id = p."categoryId"
        LEFT JOIN "CommerceListing" l ON l."productId" = p.id AND l."businessLineId" = ${businessLineId}
        LEFT JOIN "CommerceSyncMissing" m ON m."productId" = p.id
        WHERE p."feedId" = ${feedId}`
    : await db.$queryRaw<ProductRow[]>`
        SELECT p.id, p."supplierCode" AS code, p."costPrice"::float8 AS cost, p."isActive", p.brand, c.slug AS cat,
               l.id AS lid, l."priceRon"::float8 AS price, l."priceSource" AS psrc, (l."manualPriceRon" IS NOT NULL) AS manual, l."isActive" AS lactive,
               false AS missing
        FROM "CommerceProduct" p
        LEFT JOIN "CommerceCategory" c ON c.id = p."categoryId"
        LEFT JOIN "CommerceListing" l ON l."productId" = p.id AND l."businessLineId" = ${businessLineId}
        WHERE p."feedId" = ${feedId}`
  const stockRows = await db.$queryRaw<Array<{ productId: string; warehouse: string; rawFlag: number }>>`
    SELECT s."productId", s.warehouse, s."rawFlag" FROM "CommerceStock" s JOIN "CommerceProduct" p ON p.id = s."productId" WHERE p."feedId" = ${feedId}`
  const stockBy = new Map<string, Map<string, number>>()
  for (const s of stockRows) {
    let m = stockBy.get(s.productId)
    if (!m) stockBy.set(s.productId, (m = new Map()))
    m.set(s.warehouse, s.rawFlag)
  }
  return rows.map((r) => ({
    id: r.id, code: r.code, cost: r.cost, isActive: r.isActive, brand: r.brand, categorySlug: r.cat, missing: r.missing,
    listing: r.lid ? { id: r.lid, priceRon: r.price, priceSource: r.psrc ?? 'rule', manual: !!r.manual, isActive: !!r.lactive } : null,
    stock: stockBy.get(r.id) ?? new Map(),
  }))
}

/** Pending and rejected price-change reviews; values are in cents. */
export async function loadReviews(feedId: string, tablesReady: boolean): Promise<ReviewState> {
  const state: ReviewState = { pending: new Map(), rejected: new Map() }
  if (!tablesReady) return state
  const rows = await db.$queryRaw<Array<{ code: string; status: string; cents: number | null }>>`
    SELECT "supplierCode" AS code, status, round("newCost" * 100)::int AS cents
    FROM "CommerceSyncReview" WHERE "feedId" = ${feedId} AND kind = 'price_change' AND status IN ('pending', 'rejected')`
  for (const r of rows) {
    if (r.cents == null) continue
    ;(r.status === 'pending' ? state.pending : state.rejected).set(r.code, r.cents)
  }
  return state
}

// ─── run bookkeeping ───

export async function startRun(feedId: string, job: string, dryRun: boolean, triggeredBy: string, staleMs: number): Promise<string | 'locked'> {
  // ON CONFLICT DO NOTHING on the partial unique index = the lock; no exception (and no error log line) when someone else holds it.
  const attempt = async (): Promise<string | null> => {
    const id = randomUUID()
    const rows = dryRun
      ? await db.$queryRaw<Array<{ id: string }>>`
          INSERT INTO "CommerceSyncRun" ("id", "feedId", "job", "dryRun", "triggeredBy") VALUES (${id}, ${feedId}, ${job}, true, ${triggeredBy}) RETURNING id`
      : await db.$queryRaw<Array<{ id: string }>>`
          INSERT INTO "CommerceSyncRun" ("id", "feedId", "job", "dryRun", "triggeredBy") VALUES (${id}, ${feedId}, ${job}, false, ${triggeredBy})
          ON CONFLICT ("feedId") WHERE "status" = 'running' AND NOT "dryRun" DO NOTHING RETURNING id`
    return rows[0]?.id ?? null
  }
  const first = await attempt()
  if (first) return first
  // A crashed process leaves a 'running' row behind: reclaim it once it is older than any legitimate run.
  const stale = await db.commerceSyncRun.updateMany({
    where: { feedId, status: 'running', dryRun: false, startedAt: { lt: new Date(Date.now() - staleMs) } },
    data: { status: 'failed', finishedAt: new Date(), error: 'Marked failed: run exceeded the global time limit without finishing (process died?)' },
  })
  if (stale.count === 0) return 'locked'
  return (await attempt()) ?? 'locked'
}

export async function finishRun(id: string, status: string, stats: unknown, error: string | null, durationMs: number, alerted: boolean): Promise<void> {
  await db.commerceSyncRun.update({
    where: { id },
    data: { status, stats: stats as Prisma.InputJsonValue, error: error ? error.slice(0, 2000) : null, finishedAt: new Date(), durationMs, alerted },
  })
}

export async function loadFileState(feedId: string): Promise<Map<string, { remoteMtime: Date; size: number; sha256: string; rows: number }>> {
  const rows = await db.commerceSyncFile.findMany({ where: { feedId } })
  return new Map(rows.map((r) => [r.name, { remoteMtime: r.remoteMtime, size: r.size, sha256: r.sha256, rows: r.rows }]))
}

export async function saveFileState(feedId: string, name: string, v: { remoteMtime: Date; size: number; sha256: string; rows: number }): Promise<void> {
  await db.commerceSyncFile.upsert({
    where: { feedId_name: { feedId, name } },
    update: { ...v, appliedAt: new Date() },
    create: { feedId, name, ...v, appliedAt: new Date() },
  })
}

// ─── applying a feed plan ───

export interface ApplyCounts {
  costUpdated: number
  pricesUpdated: number
  priceConflicts: number
  stockUpserted: number
  listingsTouched: number
  reviewQueued: number
  reviewClosedReverted: number
  deactivated: number
  reactivated: number
  newProductsCreated: number
}

async function writeCostAndPrice(tx: Prisma.TransactionClient, rows: PricePlanRow[], withPrice: boolean): Promise<{ cost: number; price: number; conflicts: number }> {
  if (!rows.length) return { cost: 0, price: 0, conflicts: 0 }
  const ids = rows.map((r) => r.productId)
  const cost = rows.map((r) => txt(r.newCost))
  const cost0 = rows.map((r) => txt(r.oldCost))
  // Optimistic guard: only touch rows still holding the value we planned from (a concurrent edit wins, the next run retries).
  const c = await tx.$executeRaw`
    UPDATE "CommerceProduct" p SET "costPrice" = u.nc::numeric, "updatedAt" = now()
    FROM unnest(${ids}::text[], ${cost}::text[], ${cost0}::text[]) AS u(id, nc, oc)
    WHERE p.id = u.id AND p."costPrice" = u.oc::numeric`
  let price = 0
  if (withPrice) {
    const priced = rows.filter((r) => r.listingId && r.newPrice != null)
    if (priced.length) {
      price = await tx.$executeRaw`
        UPDATE "CommerceListing" l SET "priceRon" = u.np::numeric, "priceUpdatedAt" = now(), "updatedAt" = now()
        FROM unnest(${priced.map((r) => r.listingId!)}::text[], ${priced.map((r) => txt(r.newPrice))}::text[], ${priced.map((r) => txt(r.oldPrice))}::text[]) AS u(id, np, op)
        WHERE l.id = u.id AND l."manualPriceRon" IS NULL AND l."priceSource" = 'rule' AND l."priceRon" IS NOT DISTINCT FROM u.op::numeric`
    }
  }
  return { cost: c, price, conflicts: rows.length - c }
}

async function upsertReviews(tx: Prisma.TransactionClient, feedId: string, runId: string, rows: PricePlanRow[]): Promise<number> {
  if (!rows.length) return 0
  return tx.$executeRaw`
    INSERT INTO "CommerceSyncReview" ("id", "feedId", "kind", "productId", "supplierCode", "status", "oldCost", "newCost", "oldPriceRon", "newPriceRon", "changePct", "runId", "createdAt", "updatedAt")
    SELECT gen_random_uuid()::text, ${feedId}, 'price_change', u.pid, u.code, 'pending', u.oc::numeric, u.nc::numeric, u.op::numeric, u.np::numeric, u.pct::numeric, ${runId}, now(), now()
    FROM unnest(${rows.map((r) => r.productId)}::text[], ${rows.map((r) => r.code)}::text[], ${rows.map((r) => txt(r.oldCost))}::text[],
                ${rows.map((r) => txt(r.newCost))}::text[], ${rows.map((r) => txt(r.oldPrice))}::text[], ${rows.map((r) => txt(r.newPrice))}::text[],
                ${rows.map((r) => txt(r.pct))}::text[]) AS u(pid, code, oc, nc, op, np, pct)
    ON CONFLICT ("feedId", "supplierCode", "kind") WHERE "status" = 'pending'
    DO UPDATE SET "oldCost" = EXCLUDED."oldCost", "newCost" = EXCLUDED."newCost", "oldPriceRon" = EXCLUDED."oldPriceRon",
                  "newPriceRon" = EXCLUDED."newPriceRon", "changePct" = EXCLUDED."changePct", "runId" = EXCLUDED."runId", "updatedAt" = now()
    WHERE "CommerceSyncReview"."newCost" IS DISTINCT FROM EXCLUDED."newCost" OR "CommerceSyncReview"."newPriceRon" IS DISTINCT FROM EXCLUDED."newPriceRon"
       OR "CommerceSyncReview"."oldPriceRon" IS DISTINCT FROM EXCLUDED."oldPriceRon"`
}

export async function applyFeedPlan(
  feedId: string, runId: string, plan: FeedPlan, revertedPending: string[], tick: Tick,
): Promise<ApplyCounts> {
  const out: ApplyCounts = {
    costUpdated: 0, pricesUpdated: 0, priceConflicts: 0, stockUpserted: 0, listingsTouched: 0, reviewQueued: 0,
    reviewClosedReverted: 0, deactivated: 0, reactivated: 0, newProductsCreated: 0,
  }

  for (const part of chunks(plan.priceUpdates)) {
    tick()
    const r = await db.$transaction((tx) => writeCostAndPrice(tx, part, true), { timeout: 120_000 })
    out.costUpdated += r.cost; out.pricesUpdated += r.price; out.priceConflicts += r.conflicts
  }
  for (const part of chunks(plan.costOnly)) {
    tick()
    const r = await db.$transaction((tx) => writeCostAndPrice(tx, part, false), { timeout: 120_000 })
    out.costUpdated += r.cost; out.priceConflicts += r.conflicts
  }
  for (const part of chunks(plan.reviewPrice)) {
    tick()
    out.reviewQueued += await db.$transaction((tx) => upsertReviews(tx, feedId, runId, part), { timeout: 120_000 })
  }
  if (revertedPending.length) {
    for (const part of chunks(revertedPending)) {
      tick()
      out.reviewClosedReverted += await db.$executeRaw`
        UPDATE "CommerceSyncReview" SET status = 'rejected', "decidedAt" = now(), "decidedBy" = 'system:supplier_price_reverted', "updatedAt" = now()
        WHERE "feedId" = ${feedId} AND kind = 'price_change' AND status = 'pending' AND "supplierCode" = ANY(${part}::text[])`
    }
  }

  for (const part of chunks<StockPlanRow>(plan.stockUpserts, 5_000)) {
    tick()
    out.stockUpserted += await db.$executeRaw`
      INSERT INTO "CommerceStock" ("id", "productId", "warehouse", "rawFlag", "updatedAt")
      SELECT gen_random_uuid()::text, u.pid, u.wh, u.flag, now()
      FROM unnest(${part.map((s) => s.productId)}::text[], ${part.map((s) => s.warehouse)}::text[], ${part.map((s) => s.flag)}::int[]) AS u(pid, wh, flag)
      ON CONFLICT ("productId", "warehouse") DO UPDATE SET "rawFlag" = EXCLUDED."rawFlag", "updatedAt" = now()
      WHERE "CommerceStock"."rawFlag" IS DISTINCT FROM EXCLUDED."rawFlag"`
  }

  // Vanished from the price list → inactive (never deleted); remembered so only these can be reactivated.
  for (const part of chunks(plan.deactivate)) {
    tick()
    await db.$transaction(async (tx) => {
      const ids = part.map((d) => d.productId)
      out.deactivated += await tx.$executeRaw`UPDATE "CommerceProduct" SET "isActive" = false, "updatedAt" = now() WHERE id = ANY(${ids}::text[]) AND "isActive" = true`
      await tx.$executeRaw`UPDATE "CommerceListing" SET "isActive" = false, "updatedAt" = now() WHERE "productId" = ANY(${ids}::text[]) AND "isActive" = true`
      await tx.$executeRaw`INSERT INTO "CommerceSyncMissing" ("productId", "feedId", "missingSince") SELECT x, ${feedId}, now() FROM unnest(${ids}::text[]) AS x ON CONFLICT ("productId") DO NOTHING`
    }, { timeout: 120_000 })
  }
  for (const part of chunks(plan.reactivate)) {
    tick()
    await db.$transaction(async (tx) => {
      const ids = part.map((d) => d.productId)
      out.reactivated += await tx.$executeRaw`UPDATE "CommerceProduct" SET "isActive" = true, "updatedAt" = now() WHERE id = ANY(${ids}::text[]) AND "isActive" = false`
      await tx.$executeRaw`UPDATE "CommerceListing" SET "isActive" = true, "updatedAt" = now() WHERE "productId" = ANY(${ids}::text[]) AND "isActive" = false`
      await tx.$executeRaw`DELETE FROM "CommerceSyncMissing" WHERE "productId" = ANY(${ids}::text[])`
    }, { timeout: 120_000 })
  }

  // Listings whose public price/availability changed: move updatedAt (drives the storefront sitemap lastmod).
  // Price updates already set it; this covers availability flips, deactivations and reactivations.
  const touch = [...plan.touchListingIds]
  for (const part of chunks(touch, 5_000)) {
    tick()
    out.listingsTouched += await db.$executeRaw`UPDATE "CommerceListing" SET "updatedAt" = now() WHERE id = ANY(${part}::text[])`
  }
  return out
}

/** Rows written by reprice (fx/formula change). Returns { updated, conflicts }. */
export async function applyReprice(feedId: string, runId: string, updates: RepriceRow[], review: RepriceRow[], tick: Tick): Promise<{ updated: number; conflicts: number; queued: number }> {
  let updated = 0
  for (const part of chunks(updates, 5_000)) {
    tick()
    updated += await db.$executeRaw`
      UPDATE "CommerceListing" l SET "priceRon" = u.np::numeric, "priceUpdatedAt" = now(), "updatedAt" = now()
      FROM unnest(${part.map((r) => r.listingId)}::text[], ${part.map((r) => txt(r.newPrice))}::text[], ${part.map((r) => txt(r.oldPrice))}::text[]) AS u(id, np, op)
      WHERE l.id = u.id AND l."manualPriceRon" IS NULL AND l."priceSource" = 'rule' AND l."priceRon" IS NOT DISTINCT FROM u.op::numeric`
  }
  let queued = 0
  for (const part of chunks(review)) {
    tick()
    queued += await db.$transaction((tx) => upsertReviews(tx, feedId, runId, part.map((r) => ({
      productId: r.productId, listingId: r.listingId, code: r.code, oldCost: r.cost, newCost: r.cost, oldPrice: r.oldPrice, newPrice: r.newPrice, pct: r.pct,
    }))), { timeout: 120_000 })
  }
  return { updated, conflicts: updates.length - updated, queued }
}

/** Merge `priceSync.applied` into the channel config without touching anything else in it (API key hashes etc.). */
export async function saveAppliedState(businessLineId: string, applied: { fxRate: number; fxDate: string; formulaHash: string; at: string }): Promise<void> {
  const json = JSON.stringify(applied)
  await db.$executeRaw`
    UPDATE "CommerceChannel"
    SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('priceSync', COALESCE(config->'priceSync', '{}'::jsonb) || jsonb_build_object('applied', ${json}::jsonb)),
        "updatedAt" = now()
    WHERE "businessLineId" = ${businessLineId}`
}

/** Stock flags for articles created in this very run (their ids did not exist when the plan was made). */
export async function applyStockForCodes(feedId: string, rows: Array<{ code: string; warehouse: string; flag: number }>, tick: Tick): Promise<number> {
  let n = 0
  for (const part of chunks(rows, 5_000)) {
    tick()
    n += await db.$executeRaw`
      INSERT INTO "CommerceStock" ("id", "productId", "warehouse", "rawFlag", "updatedAt")
      SELECT gen_random_uuid()::text, p.id, u.wh, u.flag, now()
      FROM unnest(${part.map((r) => r.code)}::text[], ${part.map((r) => r.warehouse)}::text[], ${part.map((r) => r.flag)}::int[]) AS u(code, wh, flag)
      JOIN "CommerceProduct" p ON p."feedId" = ${feedId} AND p."supplierCode" = u.code
      ON CONFLICT ("productId", "warehouse") DO UPDATE SET "rawFlag" = EXCLUDED."rawFlag", "updatedAt" = now()
      WHERE "CommerceStock"."rawFlag" IS DISTINCT FROM EXCLUDED."rawFlag"`
  }
  return n
}
