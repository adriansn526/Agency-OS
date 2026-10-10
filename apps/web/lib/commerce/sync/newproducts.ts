/**
 * New supplier articles found in the price list: created INACTIVE with a pending "new_product" review.
 * They are never published automatically; approving the review activates them (a listing is then created by the normal pipeline
 * once the product has a Romanian name). Fitments / OE codes arrive with the next full catalog import.
 */
import { db } from '@repo/db'
import { buildProducts, ensureCategories, syncGroupMaps } from '../feed/import'
import type { PriceRow } from '../feed/gr-txt-v1'
import type { BaseItem } from './parse'
import { chunks, type Tick } from './store'

export async function createNewProducts(feedId: string, currency: string, items: BaseItem[], runId: string, tick: Tick): Promise<number> {
  if (!items.length) return 0
  const catBySlug = await ensureCategories()
  const catById = new Map([...catBySlug].map(([slug, id]) => [id, slug]))
  const groupMaps = await syncGroupMaps(feedId, [...new Set(items.map((i) => i.group))], catBySlug)
  const rows: PriceRow[] = items.map((i) => ({
    listingCode: i.code, baseCode: i.code, oeMain: i.oeMain, nameEl: i.nameEl, nameEn: i.nameEn, side: i.side,
    modelCode: i.modelCode, make: i.make, modelName: i.modelName, price: i.price, group: i.group,
  }))
  const products = buildProducts(rows, groupMaps, catBySlug, catById)
  let created = 0
  for (const c of chunks(products, 1_000)) {
    tick()
    created += await db.$executeRaw`
      INSERT INTO "CommerceProduct" (
        "id", "feedId", "supplierCode", "groupCode", "categoryId", "nameEn", "nameEl", "oeMain", "side",
        "brand", "quality", "attributes", "bulkyClass", "costPrice", "costCurrency", "contentHash",
        "isActive", "firstSeenAt", "lastSeenAt", "updatedAt"
      )
      SELECT gen_random_uuid()::text, ${feedId}, u.code, u.grp, u.cat, u.en, u.el, u.oe, u.side,
             u.brand, u.quality, u.attrs::jsonb, u.bulky, u.cost::numeric, ${currency}, u.hash,
             false, now(), now(), now()
      FROM unnest(
        ${c.map((p) => p.code)}::text[], ${c.map((p) => p.group)}::text[], ${c.map((p) => p.categoryId)}::text[],
        ${c.map((p) => p.nameEn)}::text[], ${c.map((p) => p.nameEl)}::text[], ${c.map((p) => p.oeMain)}::text[],
        ${c.map((p) => p.side)}::text[], ${c.map((p) => p.brand)}::text[], ${c.map((p) => p.quality)}::text[],
        ${c.map((p) => p.attributes)}::text[], ${c.map((p) => p.bulky)}::text[], ${c.map((p) => p.cost.toFixed(4))}::text[],
        ${c.map((p) => p.hash)}::text[]
      ) AS u(code, grp, cat, en, el, oe, side, brand, quality, attrs, bulky, cost, hash)
      ON CONFLICT ("feedId", "supplierCode") DO NOTHING`
    const codes = c.map((p) => p.code)
    const payloads = c.map((p) => JSON.stringify({ nameEn: p.nameEn, group: p.group, brand: p.brand, categoryId: p.categoryId }))
    await db.$executeRaw`
      INSERT INTO "CommerceSyncReview" ("id", "feedId", "kind", "productId", "supplierCode", "status", "newCost", "payload", "runId", "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text, ${feedId}, 'new_product', p.id, p."supplierCode", 'pending', p."costPrice", u.payload::jsonb, ${runId}, now(), now()
      FROM unnest(${codes}::text[], ${payloads}::text[]) AS u(code, payload)
      JOIN "CommerceProduct" p ON p."feedId" = ${feedId} AND p."supplierCode" = u.code AND p."isActive" = false
      ON CONFLICT ("feedId", "supplierCode", "kind") WHERE "status" = 'pending' DO NOTHING`
  }
  return created
}

