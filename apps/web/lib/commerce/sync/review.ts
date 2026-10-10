/** Decisions on the review queue (price moves above the threshold, new supplier articles). */
import { db } from '@repo/db'
import { priceFromCost } from './formula'
import { parsePriceSyncSettings } from './settings'

export type ReviewAction = 'approve' | 'reject'

export async function decideReview(id: string, action: ReviewAction, decidedBy: string, businessLineSlug = process.env.COMMERCE_SYNC_BUSINESS_LINE || 'ecaroseria'): Promise<{ ok: boolean; message: string }> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; kind: string; productId: string | null; supplierCode: string; newCost: string | null; status: string }>>`
      SELECT id, kind, "productId", "supplierCode", "newCost"::text AS "newCost", status FROM "CommerceSyncReview" WHERE id = ${id} FOR UPDATE`
    const r = rows[0]
    if (!r) return { ok: false, message: 'Not found' }
    if (r.status !== 'pending') return { ok: false, message: `Already ${r.status}` }

    if (action === 'reject') {
      await tx.$executeRaw`UPDATE "CommerceSyncReview" SET status = 'rejected', "decidedAt" = now(), "decidedBy" = ${decidedBy}, "updatedAt" = now() WHERE id = ${id}`
      return { ok: true, message: 'Rejected' }
    }

    if (r.kind === 'new_product') {
      if (!r.productId) return { ok: false, message: 'Product is gone' }
      await tx.$executeRaw`UPDATE "CommerceProduct" SET "isActive" = true, "updatedAt" = now() WHERE id = ${r.productId}`
      await tx.$executeRaw`UPDATE "CommerceSyncReview" SET status = 'approved', "decidedAt" = now(), "decidedBy" = ${decidedBy}, "updatedAt" = now() WHERE id = ${id}`
      return { ok: true, message: 'Activated (a listing is created by the next pipeline run once the product has a Romanian name)' }
    }

    // price_change: apply the new cost and the price the formula gives for it, at the rate the live prices use
    if (!r.productId || r.newCost == null) return { ok: false, message: 'Review has no product/cost' }
    const bl = await tx.businessLine.findUnique({ where: { slug: businessLineSlug }, select: { id: true } })
    const channel = bl ? await tx.commerceChannel.findUnique({ where: { businessLineId: bl.id } }) : null
    if (!bl || !channel) return { ok: false, message: 'Channel not found' }
    const settings = parsePriceSyncSettings(channel.config)
    const fx = settings.applied?.fxRate ?? Number((await tx.commerceExchangeRate.findFirst({ where: { currency: settings.sourceCurrency }, orderBy: { date: 'desc' } }))?.rate ?? 0)
    const prod = await tx.commerceProduct.findUnique({ where: { id: r.productId }, select: { brand: true, category: { select: { slug: true } } } })
    const price = priceFromCost(r.newCost, settings.sourceCurrency === 'RON' ? 1 : fx, settings, { categorySlug: prod?.category?.slug ?? null, brand: prod?.brand ?? null })
    await tx.$executeRaw`UPDATE "CommerceProduct" SET "costPrice" = ${r.newCost}::numeric, "updatedAt" = now() WHERE id = ${r.productId}`
    if (price > 0) {
      await tx.$executeRaw`
        UPDATE "CommerceListing" SET "priceRon" = ${price}::numeric, "priceUpdatedAt" = now(), "updatedAt" = now()
        WHERE "productId" = ${r.productId} AND "businessLineId" = ${bl.id} AND "manualPriceRon" IS NULL AND "priceSource" = 'rule'`
    }
    await tx.$executeRaw`UPDATE "CommerceSyncReview" SET status = 'approved', "decidedAt" = now(), "decidedBy" = ${decidedBy}, "updatedAt" = now() WHERE id = ${id}`
    return { ok: true, message: `Applied: cost ${r.newCost}, price ${price} RON` }
  }, { timeout: 30_000 })
}
