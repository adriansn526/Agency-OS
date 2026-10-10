/** Loads everything the SEO generator needs, in two queries (no N+1). Read-only. */
import { db } from '@repo/db'
import type { VehicleRef, SeoInput } from './titles'

export interface SeoRow extends SeoInput { listingId: string; productId: string; currentSlug: string; currentSeoTitle: string | null }

export async function loadSeoRows(opts: { businessLineId: string; productId?: string }): Promise<SeoRow[]> {
  const pid = opts.productId ?? null
  const products = await db.$queryRaw<Array<{ pid: string; lid: string; sku: string; name: string; side: string | null; oe: string | null; slug: string; seoTitle: string | null }>>`
    SELECT p.id AS pid, l.id AS lid, p."supplierCode" AS sku, p."nameRo" AS name, p.side, p."oeMain" AS oe, l.slug, l."seoTitle" AS "seoTitle"
    FROM "CommerceListing" l JOIN "CommerceProduct" p ON p.id = l."productId"
    WHERE l."businessLineId" = ${opts.businessLineId} AND p."nameRo" IS NOT NULL AND p."nameRo" <> ''
      AND (${pid}::text IS NULL OR p.id = ${pid})
    ORDER BY p."supplierCode"`
  const fit = await db.$queryRaw<Array<{ pid: string; make: string; model: string; yf: number | null; yt: number | null }>>`
    SELECT f."productId" AS pid, mk.name AS make, m.name AS model, g."yearFrom" AS yf, g."yearTo" AS yt
    FROM "CommerceFitment" f
    JOIN "VehicleGeneration" g ON g.id = f."generationId" JOIN "VehicleModel" m ON m.id = g."modelId" JOIN "VehicleMake" mk ON mk.id = m."makeId"
    WHERE (${pid}::text IS NULL OR f."productId" = ${pid})`
  const byProduct = new Map<string, VehicleRef[]>()
  for (const r of fit) {
    const list = byProduct.get(r.pid) ?? []
    list.push({ make: r.make, model: r.model, yearFrom: r.yf, yearTo: r.yt })
    byProduct.set(r.pid, list)
  }
  return products.map((p) => ({
    listingId: p.lid, productId: p.pid, currentSlug: p.slug, currentSeoTitle: p.seoTitle,
    sku: p.sku, nameRo: p.name, side: p.side, oeMain: p.oe, vehicles: byProduct.get(p.pid) ?? [],
  }))
}
