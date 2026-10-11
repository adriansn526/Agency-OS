/** Stock/price fluctuation and demand queries for /commerce/trends and the /commerce widget. All read-only. */
import { db } from '@repo/db'
import { formatVehicle, vehicleSummaries } from './vehicle-summary'

export interface DayPoint { day: string; out: number; back: number; priceChanges: number }
export interface ProductRow {
  id: string; sku: string; name: string | null; isActive: boolean; available: boolean | null
  outs: number; backs: number; views: number; ordered: number; score: number
  /** cars the product fits (table-friendly text) */
  vehicle?: { make: string; model: string; years: string; makeFull: string; modelFull: string }
}

/** Demand score of a make / model / model generation ("an" = the generation's year range). */
export interface VehicleScoreRow {
  make: string; model: string | null; years: string | null; products: number; views: number; ordered: number; score: number
}
export interface VehicleScores { byMake: VehicleScoreRow[]; byModel: VehicleScoreRow[]; byGeneration: VehicleScoreRow[]; unattributedScore: number; attributedScore: number }
export interface PriceMove { sku: string; name: string | null; oldPrice: number; newPrice: number; pct: number; at: string }
export interface Trends {
  days: number
  totals: { went_out: number; back: number; productsAffected: number; priceChanges: number; views: number; searches: number; orderedUnits: number }
  daily: DayPoint[]
  byScore: ProductRow[]
  byFlips: ProductRow[]
  vehicles: VehicleScores
  searches: Array<{ term: string; n: number }>
  priceMoves: PriceMove[]
  historyStart: string | null
}

/**
 * Vehicle score = Σ over the products that fit the car of (page views + 10 × units ordered) / (number of car generations the product fits).
 * The division spreads a universal part over all the cars it fits, so the scores add up to the real demand and a part that fits 50 cars
 * does not inflate each of them. Supplier stock movements are not demand and are left out.
 */
export const VEHICLE_SCORE_FORMULA = '(vizualizări + 10 × unități comandate) ale pieselor care se potrivesc, împărțite la câte generații de mașini acoperă fiecare piesă'

/** score = product page views + 10 × units ordered from us + 3 × times it went out of stock at the supplier */
export const SCORE_FORMULA = 'vizualizări + 10 × unități comandate + 3 × epuizări la furnizor'

const num = (v: unknown) => Number(v ?? 0)

async function productRows(since: Date, orderBy: 'score' | 'flips', limit: number): Promise<ProductRow[]> {
  const order = orderBy === 'score' ? 'score DESC, outs DESC' : '(outs + backs) DESC, score DESC'
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    WITH ev AS (
      SELECT "productId", count(*) FILTER (WHERE "newFlag" = 0) AS outs, count(*) FILTER (WHERE "newFlag" = 1) AS backs
      FROM "CommerceStockEvent" WHERE "at" >= $1 GROUP BY 1),
    vw AS (SELECT "productId", sum("views") AS views FROM "CommerceDemandDaily" WHERE "day" >= $1::date GROUP BY 1),
    od AS (
      SELECT i."productId", sum(i.qty) AS qty FROM "CommerceOrderItem" i JOIN "CommerceOrder" o ON o.id = i."orderId"
      WHERE o."createdAt" >= $1 AND o.status <> 'cancelled' AND i."productId" IS NOT NULL GROUP BY 1),
    ids AS (SELECT "productId" FROM ev UNION SELECT "productId" FROM vw UNION SELECT "productId" FROM od)
    SELECT p.id, p."supplierCode" AS sku, COALESCE(p."nameRo", p."nameEn") AS name, p."isActive",
           COALESCE(ev.outs, 0) AS outs, COALESCE(ev.backs, 0) AS backs, COALESCE(vw.views, 0) AS views, COALESCE(od.qty, 0) AS ordered,
           (COALESCE(vw.views, 0) + 10 * COALESCE(od.qty, 0) + 3 * COALESCE(ev.outs, 0)) AS score,
           (SELECT bool_or(s."rawFlag" = 1) FROM "CommerceStock" s WHERE s."productId" = p.id) AS available
    FROM ids JOIN "CommerceProduct" p ON p.id = ids."productId"
    LEFT JOIN ev ON ev."productId" = p.id LEFT JOIN vw ON vw."productId" = p.id LEFT JOIN od ON od."productId" = p.id
    ORDER BY ${order} LIMIT ${limit}`, since)
  const veh = await vehicleSummaries(rows.map((r) => String(r.id)))
  return rows.map((r) => ({
    vehicle: formatVehicle(veh.get(String(r.id))),
    id: String(r.id), sku: String(r.sku), name: (r.name as string | null) ?? null, isActive: !!r.isActive, available: r.available == null ? null : !!r.available,
    outs: num(r.outs), backs: num(r.backs), views: num(r.views), ordered: num(r.ordered), score: num(r.score),
  })).filter((r) => (orderBy === 'score' ? r.score > 0 : r.outs + r.backs > 0))
}

type Level = 'make' | 'model' | 'generation'

async function vehicleLevel(since: Date, level: Level, limit: number): Promise<VehicleScoreRow[]> {
  const cols = level === 'make' ? 'mk.name AS make, NULL::text AS model, NULL::int AS yf, NULL::int AS yt'
    : level === 'model' ? 'mk.name AS make, m.name AS model, min(g."yearFrom") AS yf, CASE WHEN bool_or(g."yearTo" IS NULL) THEN NULL ELSE max(g."yearTo") END AS yt'
    : 'mk.name AS make, m.name AS model, g."yearFrom" AS yf, g."yearTo" AS yt'
  const group = level === 'make' ? 'mk.id, mk.name' : level === 'model' ? 'mk.id, mk.name, m.id, m.name' : 'mk.id, mk.name, m.id, m.name, g.id, g."yearFrom", g."yearTo"'
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    WITH vw AS (SELECT "productId", sum("views") AS views FROM "CommerceDemandDaily" WHERE "day" >= $1::date GROUP BY 1),
    od AS (
      SELECT i."productId", sum(i.qty) AS qty FROM "CommerceOrderItem" i JOIN "CommerceOrder" o ON o.id = i."orderId"
      WHERE o."createdAt" >= $1 AND o.status <> 'cancelled' AND i."productId" IS NOT NULL GROUP BY 1),
    prod AS (
      SELECT p.id, COALESCE(vw.views, 0) AS views, COALESCE(od.qty, 0) AS ordered
      FROM "CommerceProduct" p LEFT JOIN vw ON vw."productId" = p.id LEFT JOIN od ON od."productId" = p.id
      WHERE vw."productId" IS NOT NULL OR od."productId" IS NOT NULL),
    gens AS (SELECT DISTINCT f."productId", f."generationId" FROM "CommerceFitment" f JOIN prod ON prod.id = f."productId"),
    n AS (SELECT "productId", count(*) AS c FROM gens GROUP BY 1)
    SELECT ${cols},
           count(DISTINCT gens."productId") AS products,
           sum(prod.views::numeric / n.c) AS views, sum(prod.ordered::numeric / n.c) AS ordered,
           sum((prod.views + 10 * prod.ordered)::numeric / n.c) AS score
    FROM gens
    JOIN prod ON prod.id = gens."productId" JOIN n ON n."productId" = gens."productId"
    JOIN "VehicleGeneration" g ON g.id = gens."generationId" JOIN "VehicleModel" m ON m.id = g."modelId" JOIN "VehicleMake" mk ON mk.id = m."makeId"
    GROUP BY ${group} ORDER BY score DESC, make LIMIT ${limit}`, since)
  return rows.map((r) => ({
    make: String(r.make), model: (r.model as string | null) ?? null,
    years: level === 'make' ? null : formatYearsLocal(r.yf as number | null, r.yt as number | null),
    products: num(r.products), views: Math.round(num(r.views)), ordered: Math.round(num(r.ordered) * 10) / 10, score: Math.round(num(r.score) * 10) / 10,
  }))
}

// no end year = still in production; a model's span is open when any of its generations is
function formatYearsLocal(yf: number | null, yt: number | null): string {
  if (yf == null) return '—'
  return yt == null ? `${yf}–` : yt === yf ? String(yf) : `${yf}–${yt}`
}

export async function getVehicleScores(since: Date, limit = 20): Promise<VehicleScores> {
  const [byMake, byModel, byGeneration, totals] = await Promise.all([
    vehicleLevel(since, 'make', limit), vehicleLevel(since, 'model', limit), vehicleLevel(since, 'generation', limit),
    db.$queryRawUnsafe<Array<{ total: unknown; attributed: unknown }>>(`
      WITH vw AS (SELECT "productId", sum("views") AS views FROM "CommerceDemandDaily" WHERE "day" >= $1::date GROUP BY 1),
      od AS (SELECT i."productId", sum(i.qty) AS qty FROM "CommerceOrderItem" i JOIN "CommerceOrder" o ON o.id = i."orderId"
             WHERE o."createdAt" >= $1 AND o.status <> 'cancelled' AND i."productId" IS NOT NULL GROUP BY 1),
      prod AS (SELECT p.id, COALESCE(vw.views, 0) + 10 * COALESCE(od.qty, 0) AS sc FROM "CommerceProduct" p
               LEFT JOIN vw ON vw."productId" = p.id LEFT JOIN od ON od."productId" = p.id WHERE vw."productId" IS NOT NULL OR od."productId" IS NOT NULL)
      SELECT COALESCE(sum(sc), 0) AS total,
             COALESCE(sum(sc) FILTER (WHERE EXISTS (SELECT 1 FROM "CommerceFitment" f WHERE f."productId" = prod.id)), 0) AS attributed
      FROM prod`, since),
  ])
  const total = num(totals[0]?.total), attributed = num(totals[0]?.attributed)
  return { byMake, byModel, byGeneration, attributedScore: Math.round(attributed), unattributedScore: Math.round(total - attributed) }
}

export async function getTrends(days: number, limit = 25): Promise<Trends> {
  days = Math.max(1, Math.min(365, Math.floor(days) || 7))
  const since = new Date(Date.now() - days * 86_400_000)

  const [stockDaily, priceDaily, totalsRow, searches, moves, start, byScore, byFlips] = await Promise.all([
    db.$queryRaw<Array<{ d: Date; out: bigint; back: bigint }>>`
      SELECT "at"::date AS d, count(*) FILTER (WHERE "newFlag" = 0) AS out, count(*) FILTER (WHERE "newFlag" = 1) AS back
      FROM "CommerceStockEvent" WHERE "at" >= ${since} GROUP BY 1`,
    db.$queryRaw<Array<{ d: Date; n: bigint }>>`SELECT "at"::date AS d, count(*) AS n FROM "CommercePriceEvent" WHERE "at" >= ${since} GROUP BY 1`,
    db.$queryRaw<Array<Record<string, bigint | null>>>`
      SELECT (SELECT count(*) FILTER (WHERE "newFlag" = 0) FROM "CommerceStockEvent" WHERE "at" >= ${since}) AS went_out,
             (SELECT count(*) FILTER (WHERE "newFlag" = 1) FROM "CommerceStockEvent" WHERE "at" >= ${since}) AS back,
             (SELECT count(DISTINCT "productId") FROM "CommerceStockEvent" WHERE "at" >= ${since}) AS affected,
             (SELECT count(*) FROM "CommercePriceEvent" WHERE "at" >= ${since}) AS price_changes,
             (SELECT COALESCE(sum("views"), 0) FROM "CommerceDemandDaily" WHERE "day" >= ${since}::date) AS views,
             (SELECT COALESCE(sum("n"), 0) FROM "CommerceSearchDaily" WHERE "day" >= ${since}::date) AS searches,
             (SELECT COALESCE(sum(i.qty), 0) FROM "CommerceOrderItem" i JOIN "CommerceOrder" o ON o.id = i."orderId" WHERE o."createdAt" >= ${since} AND o.status <> 'cancelled') AS ordered`,
    db.$queryRaw<Array<{ term: string; n: bigint }>>`SELECT term, sum("n") AS n FROM "CommerceSearchDaily" WHERE "day" >= ${since}::date GROUP BY term ORDER BY 2 DESC, term LIMIT 15`,
    db.$queryRaw<Array<{ sku: string; name: string | null; o: string; n: string; pct: string; at: Date }>>`
      SELECT p."supplierCode" AS sku, COALESCE(p."nameRo", p."nameEn") AS name, e."oldPrice"::text AS o, e."newPrice"::text AS n,
             round(((e."newPrice" / e."oldPrice" - 1) * 100)::numeric, 1)::text AS pct, e."at"
      FROM "CommercePriceEvent" e JOIN "CommerceProduct" p ON p.id = e."productId"
      WHERE e."at" >= ${since} AND e."oldPrice" > 0 ORDER BY abs(e."newPrice" / e."oldPrice" - 1) DESC LIMIT 15`,
    db.$queryRaw<Array<{ t: Date | null }>>`SELECT least((SELECT min("at") FROM "CommerceStockEvent"), (SELECT min("at") FROM "CommercePriceEvent")) AS t`,
    productRows(since, 'score', limit),
    productRows(since, 'flips', limit),
  ])
  const vehicles = await getVehicleScores(since)

  const map = new Map<string, DayPoint>()
  const key = (d: Date) => d.toISOString().slice(0, 10)
  for (let i = days - 1; i >= 0; i--) { const k = key(new Date(Date.now() - i * 86_400_000)); map.set(k, { day: k, out: 0, back: 0, priceChanges: 0 }) }
  for (const r of stockDaily) { const p = map.get(key(r.d)); if (p) { p.out = num(r.out); p.back = num(r.back) } }
  for (const r of priceDaily) { const p = map.get(key(r.d)); if (p) p.priceChanges = num(r.n) }

  const t = totalsRow[0] ?? {}
  return {
    days,
    totals: { went_out: num(t.went_out), back: num(t.back), productsAffected: num(t.affected), priceChanges: num(t.price_changes), views: num(t.views), searches: num(t.searches), orderedUnits: num(t.ordered) },
    daily: [...map.values()],
    byScore, byFlips, vehicles,
    searches: searches.map((r) => ({ term: r.term, n: num(r.n) })),
    priceMoves: moves.map((m) => ({ sku: m.sku, name: m.name, oldPrice: Number(m.o), newPrice: Number(m.n), pct: Number(m.pct), at: m.at.toISOString() })),
    historyStart: start[0]?.t ? start[0].t.toISOString() : null,
  }
}
