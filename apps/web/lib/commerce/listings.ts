/**
 * Listings & prices per BusinessLine channel.
 *
 * - Creates a CommerceListing for every active, translated product (slug fixed at creation for SEO stability).
 * - Recomputes prices with the pricing engine and bulk-updates only changed rows.
 * - Deactivates listings whose product became inactive.
 */
import { db } from '@repo/db'
import { slugify } from './text'
import { computePrice, type PricingRuleInput } from './pricing'
import { getFxRates } from './bnr'

const CHUNK = 10_000

async function categoryDescendants(): Promise<Map<string, string[]>> {
  const cats = await db.commerceCategory.findMany({ select: { id: true, parentId: true } })
  const children = new Map<string, string[]>()
  for (const c of cats) if (c.parentId) children.set(c.parentId, [...(children.get(c.parentId) ?? []), c.id])
  const out = new Map<string, string[]>()
  const walk = (id: string): string[] => [id, ...(children.get(id) ?? []).flatMap(walk)]
  for (const c of cats) out.set(c.id, walk(c.id))
  return out
}

export async function syncListingsAndPrices(businessLineId: string) {
  const channel = await db.commerceChannel.findUnique({ where: { businessLineId } })
  if (!channel || !channel.isEnabled) throw new Error('Commerce channel is not enabled for this business line')

  // 1. Create missing listings (translated + active products only)
  const created = await db.$executeRaw`
    INSERT INTO "CommerceListing" ("id", "productId", "businessLineId", "slug", "priceSource", "isActive", "createdAt", "updatedAt")
    SELECT gen_random_uuid()::text, p.id, ${businessLineId},
           left(regexp_replace(regexp_replace(lower(translate(p."nameRo", 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT')), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), 90) || '-' || p."supplierCode",
           'rule', true, now(), now()
    FROM "CommerceProduct" p
    WHERE p."isActive" = true AND p."nameRo" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "CommerceListing" l WHERE l."productId" = p.id AND l."businessLineId" = ${businessLineId})
    ON CONFLICT DO NOTHING`

  // 2. Deactivate listings for inactive products; reactivate when product returns
  const deactivated = await db.$executeRaw`
    UPDATE "CommerceListing" l SET "isActive" = p."isActive", "updatedAt" = now()
    FROM "CommerceProduct" p
    WHERE l."productId" = p.id AND l."businessLineId" = ${businessLineId} AND l."isActive" IS DISTINCT FROM p."isActive"`

  // 3. Prices
  const fx = await getFxRates()
  if (!fx.EUR) throw new Error('No EUR exchange rate available (BNR unreachable and none stored)')
  const desc = await categoryDescendants()
  const rulesRaw = await db.commercePricingRule.findMany({
    where: { businessLineId, isActive: true },
    orderBy: { priority: 'desc' },
  })
  const rules: PricingRuleInput[] = rulesRaw.map((r) => ({
    id: r.id,
    priority: r.priority,
    categoryIds: r.categoryId ? desc.get(r.categoryId) ?? [r.categoryId] : null,
    brand: r.brand,
    quality: r.quality,
    costMin: r.costMin != null ? Number(r.costMin) : null,
    costMax: r.costMax != null ? Number(r.costMax) : null,
    markupPct: Number(r.markupPct),
    minMarginRon: r.minMarginRon != null ? Number(r.minMarginRon) : null,
    bulkySurchargeRon: Number(r.bulkySurchargeRon),
    competitorUndercutRon: r.competitorUndercutRon != null ? Number(r.competitorUndercutRon) : null,
  }))
  const ch = {
    vatRate: Number(channel.vatRate),
    transportPct: Number(channel.transportPct),
    defaultMarkupPct: Number(channel.defaultMarkupPct),
    minMarginRon: Number(channel.minMarginRon),
    roundingMode: channel.roundingMode,
  }

  const rows = await db.$queryRaw<Array<{
    id: string; costPrice: string; costCurrency: string; categoryId: string | null; brand: string | null
    quality: string | null; bulkyClass: string | null; manualPriceRon: string | null; priceRon: string | null
    priceSource: string; appliedRuleId: string | null; competitorMin: string | null
  }>>`
    SELECT l.id, p."costPrice"::text, p."costCurrency", p."categoryId", p.brand, p.quality, p."bulkyClass",
           l."manualPriceRon"::text, l."priceRon"::text, l."priceSource", l."appliedRuleId",
           (SELECT MIN(c."priceRon")::text FROM "CommerceCompetitorPrice" c
             WHERE c."productId" = p.id AND c."checkedAt" > now() - interval '14 days' AND COALESCE(c."inStock", true)) AS "competitorMin"
    FROM "CommerceListing" l JOIN "CommerceProduct" p ON p.id = l."productId"
    WHERE l."businessLineId" = ${businessLineId} AND l."isActive" = true`

  const upd: { id: string[]; price: number[]; source: string[]; rule: (string | null)[] } = { id: [], price: [], source: [], rule: [] }
  let skipped = 0
  for (const r of rows) {
    const res = computePrice(
      {
        costPrice: Number(r.costPrice),
        costCurrency: r.costCurrency,
        categoryId: r.categoryId,
        brand: r.brand,
        quality: r.quality,
        bulkyClass: r.bulkyClass,
        manualPriceRon: r.manualPriceRon != null ? Number(r.manualPriceRon) : null,
        competitorMinRon: r.competitorMin != null ? Number(r.competitorMin) : null,
      },
      ch,
      rules,
      fx,
    )
    if (!res || res.priceRon <= 0) { skipped++; continue }
    const cur = r.priceRon != null ? Number(r.priceRon) : null
    if (cur === res.priceRon && r.priceSource === res.priceSource && r.appliedRuleId === res.ruleId) continue
    upd.id.push(r.id); upd.price.push(res.priceRon); upd.source.push(res.priceSource); upd.rule.push(res.ruleId)
  }

  for (let i = 0; i < upd.id.length; i += CHUNK) {
    await db.$executeRaw`
      UPDATE "CommerceListing" l
      SET "priceRon" = u.price, "priceSource" = u.source, "appliedRuleId" = u.rule, "priceUpdatedAt" = now(), "updatedAt" = now()
      FROM unnest(${upd.id.slice(i, i + CHUNK)}::text[], ${upd.price.slice(i, i + CHUNK)}::numeric[],
                  ${upd.source.slice(i, i + CHUNK)}::text[], ${upd.rule.slice(i, i + CHUNK)}::text[]) AS u(id, price, source, rule)
      WHERE l.id = u.id`
  }

  return { created, statusChanged: deactivated, priced: rows.length, priceUpdates: upd.id.length, skipped, eurRate: fx.EUR }
}

export function listingSlug(nameRo: string, supplierCode: string): string {
  return `${slugify(nameRo).slice(0, 90)}-${supplierCode}`
}
