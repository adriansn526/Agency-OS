/**
 * Which cars a product fits, summarised for tables: make(s), model(s) and year range, from CommerceFitment → generation → model → make.
 * One query for a whole page of products (no N+1). A product with no fitments (e.g. newly created) has no summary.
 */
import { db } from '@repo/db'

export interface VehicleSummary {
  makes: string[]
  models: string[]
  yearFrom: number | null
  /** null with openEnded = still in production ("2021–") */
  yearTo: number | null
  openEnded: boolean
  generations: number
}

export async function vehicleSummaries(productIds: string[]): Promise<Map<string, VehicleSummary>> {
  const out = new Map<string, VehicleSummary>()
  if (!productIds.length) return out
  const rows = await db.$queryRaw<Array<{ id: string; makes: string[]; models: string[]; yf: number | null; yt: number | null; open: boolean; gens: bigint }>>`
    SELECT f."productId" AS id,
           array_agg(DISTINCT mk.name ORDER BY mk.name) AS makes,
           array_agg(DISTINCT m.name ORDER BY m.name) AS models,
           min(g."yearFrom") AS yf, max(g."yearTo") AS yt,
           COALESCE(bool_or(g."yearTo" IS NULL AND g."yearFrom" IS NOT NULL), false) AS open,
           count(DISTINCT g.id) AS gens
    FROM "CommerceFitment" f
    JOIN "VehicleGeneration" g ON g.id = f."generationId"
    JOIN "VehicleModel" m ON m.id = g."modelId"
    JOIN "VehicleMake" mk ON mk.id = m."makeId"
    WHERE f."productId" = ANY(${productIds}::text[])
    GROUP BY f."productId"`
  for (const r of rows) out.set(r.id, { makes: r.makes, models: r.models, yearFrom: r.yf, yearTo: r.yt, openEnded: r.open, generations: Number(r.gens) })
  return out
}

export function formatYears(yearFrom: number | null, yearTo: number | null, openEnded: boolean): string {
  if (yearFrom == null) return '—'
  if (openEnded) return `${yearFrom}–`
  return yearTo != null && yearTo !== yearFrom ? `${yearFrom}–${yearTo}` : String(yearFrom)
}

/** Short, table-friendly text; `full` carries the complete lists for a tooltip. */
export function formatVehicle(s: VehicleSummary | undefined, max = { makes: 2, models: 3 }) {
  if (!s) return { make: '—', model: '—', years: '—', makeFull: '', modelFull: '' }
  const cut = (list: string[], n: number) => (list.length > n ? `${list.slice(0, n).join(', ')} +${list.length - n}` : list.join(', '))
  return {
    make: cut(s.makes, max.makes) || '—',
    model: cut(s.models, max.models) || '—',
    years: formatYears(s.yearFrom, s.yearTo, s.openEnded),
    makeFull: s.makes.join(', '),
    modelFull: s.models.join(', '),
  }
}
