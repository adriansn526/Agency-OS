/** GET /api/storefront/meta — what the storefront needs to label prices correctly (controlled from the ERP). */
import { db } from '@repo/db'
import { parsePriceSyncSettings } from './settings'

export interface StorefrontMeta {
  currency: 'RON'
  vatIncluded: boolean
  priceUpdatedAt: string | null
  fxRate: number | null
  fxRateDate: string | null
}

const TTL_MS = 60_000
const cache = new Map<string, { until: number; data: StorefrontMeta }>()

export async function getStorefrontMeta(businessLineId: string): Promise<StorefrontMeta> {
  const hit = cache.get(businessLineId)
  if (hit && hit.until > Date.now()) return hit.data
  const channel = await db.commerceChannel.findUnique({ where: { businessLineId }, select: { config: true } })
  const s = parsePriceSyncSettings(channel?.config)
  const last = await db.commerceListing.aggregate({ where: { businessLineId, isActive: true }, _max: { priceUpdatedAt: true } })
  const lastChange = last._max.priceUpdatedAt?.toISOString() ?? null
  const data: StorefrontMeta = {
    currency: 'RON',
    // Prices are computed as cost × fx × (1 + VAT%): VAT is included whenever the formula adds any, unless the ERP overrides the label.
    vatIncluded: s.vatIncludedLabel ?? s.vatPct > 0,
    priceUpdatedAt: lastChange ?? s.applied?.at ?? null,
    // The rate the live prices were computed with. Null until the first repricing: the legacy prices have no recorded rate.
    fxRate: s.applied?.fxRate ?? null,
    fxRateDate: s.applied?.fxDate ?? null,
  }
  cache.set(businessLineId, { until: Date.now() + TTL_MS, data })
  return data
}
