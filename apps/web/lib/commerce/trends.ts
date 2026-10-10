/** Stock/price fluctuation and demand queries for /commerce/trends and the /commerce widget. All read-only. */
import { db } from '@repo/db'

export interface DayPoint { day: string; out: number; back: number; priceChanges: number }
export interface ProductRow {
  id: string; sku: string; name: string | null; isActive: boolean; available: boolean | null
  outs: number; backs: number; views: number; ordered: number; score: number
}
export interface PriceMove { sku: string; name: string | null; oldPrice: number; newPrice: number; pct: number; at: string }
export interface Trends {
  days: number
  totals: { went_out: number; back: number; productsAffected: number; priceChanges: number; views: number; searches: number; orderedUnits: number }
  daily: DayPoint[]
  byScore: ProductRow[]
  byFlips: ProductRow[]
  searches: Array<{ term: string; n: number }>
  priceMoves: PriceMove[]
  historyStart: string | null
}

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
  return rows.map((r) => ({
    id: String(r.id), sku: String(r.sku), name: (r.name as string | null) ?? null, isActive: !!r.isActive, available: r.available == null ? null : !!r.available,
    outs: num(r.outs), backs: num(r.backs), views: num(r.views), ordered: num(r.ordered), score: num(r.score),
  })).filter((r) => (orderBy === 'score' ? r.score > 0 : r.outs + r.backs > 0))
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
    byScore, byFlips,
    searches: searches.map((r) => ({ term: r.term, n: num(r.n) })),
    priceMoves: moves.map((m) => ({ sku: m.sku, name: m.name, oldPrice: Number(m.o), newPrice: Number(m.n), pct: Number(m.pct), at: m.at.toISOString() })),
    historyStart: start[0]?.t ? start[0].t.toISOString() : null,
  }
}
