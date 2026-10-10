/**
 * Pure planning: (supplier files, DB snapshot, settings, fx) → what to write. No I/O, fully unit-testable.
 * Rows are compared against the live DB values (not a stored hash), so a row is written only if it really differs.
 */
import { availabilityFromFlags, type Availability } from '../availability'
import { changePct, priceFromCost } from './formula'
import type { PriceSyncSettings } from './settings'
import type { BaseItem } from './parse'

export interface SnapshotProduct {
  id: string
  code: string
  cost: number
  isActive: boolean
  brand: string | null
  categorySlug: string | null
  /** true if the sync deactivated it because it vanished from the price list */
  missing: boolean
  listing: { id: string; priceRon: number | null; priceSource: string; manual: boolean; isActive: boolean } | null
  /** warehouse → flag, as currently stored */
  stock: Map<string, number>
}

export interface ReviewState {
  /** supplierCode → newCost (in cents) of the pending price_change review */
  pending: Map<string, number>
  /** supplierCode → newCost (in cents) the owner already rejected (not flagged again until the supplier price moves) */
  rejected: Map<string, number>
}

export interface PricePlanRow {
  productId: string
  listingId: string | null
  code: string
  oldCost: number
  newCost: number
  oldPrice: number | null
  newPrice: number | null
  pct: number | null
}

export interface StockPlanRow { productId: string; warehouse: string; flag: 0 | 1 }

export interface FeedPlan {
  costOnly: PricePlanRow[] // cost changes with no sellable price attached (or a manual price) → cost only
  priceUpdates: PricePlanRow[] // cost + price
  reviewPrice: PricePlanRow[] // above threshold → queue, nothing applied
  stockUpserts: StockPlanRow[]
  /** listing ids whose updatedAt must move (price or public availability changed) */
  touchListingIds: Set<string>
  deactivate: { productId: string; code: string; listingId: string | null }[]
  reactivate: { productId: string; code: string; listingId: string | null }[]
  deactivationBlocked: string | null
  newItems: BaseItem[]
  stats: {
    feedBase: number
    dbProducts: number
    matched: number
    unchanged: number
    costChanged: number
    priceApplied: number
    costOnly: number
    queuedForReview: number
    alreadyQueued: number
    suppressedRejected: number
    manualOrOtherSource: number
    newProducts: number
    wouldDeactivate: number
    wouldReactivate: number
    stockRowsRead: number
    stockProductsMatched: number
    stockRowsChanged: number
    stockCodesNotInPricelist: number
    stockCodesNotInPricelistSample: string[]
    stockMissingForProducts: number
    availabilityChanged: number
    proposedMapping: Record<Availability, number>
    currentMapping: Record<Availability, number>
  }
  top: PricePlanRow[]
  /** supplier codes with a pending review whose price went back to the current one — the review is moot */
  revertedPending: string[]
}

export interface FeedPlanInput {
  products: SnapshotProduct[]
  base: Map<string, BaseItem> | null // null = pricelist not processed this run
  stock: Map<string, Map<string, 0 | 1>> | null // null = stock file not processed this run
  reviews: ReviewState
  settings: PriceSyncSettings
  /** RON per 1 unit of the source currency used for newly computed prices */
  fx: number
  /** every item code of the price list (base + similar); stock rows for codes outside it are reported and ignored */
  knownCodes?: Set<string>
  /** stockFlagMeaning currently stored on the feed (what the storefront uses right now) */
  currentMeaning: string
}

const cents = (n: number) => Math.round(n * 100)

export function planFeedSync(inp: FeedPlanInput): FeedPlan {
  const { products, base, stock, reviews, settings, fx } = inp
  const plan: FeedPlan = {
    costOnly: [], priceUpdates: [], reviewPrice: [], stockUpserts: [], touchListingIds: new Set(),
    deactivate: [], reactivate: [], deactivationBlocked: null, newItems: [],
    stats: {
      feedBase: base?.size ?? 0, dbProducts: products.length, matched: 0, unchanged: 0, costChanged: 0, priceApplied: 0, costOnly: 0,
      queuedForReview: 0, alreadyQueued: 0, suppressedRejected: 0, manualOrOtherSource: 0, newProducts: 0, wouldDeactivate: 0, wouldReactivate: 0,
      stockRowsRead: 0, stockProductsMatched: 0, stockRowsChanged: 0, stockCodesNotInPricelist: 0, stockCodesNotInPricelistSample: [], stockMissingForProducts: 0,
      availabilityChanged: 0,
      proposedMapping: { in_stock: 0, out_of_stock: 0, confirm_on_order: 0 },
      currentMapping: { in_stock: 0, out_of_stock: 0, confirm_on_order: 0 },
    },
    top: [],
    revertedPending: [],
  }
  const byCode = new Map(products.map((p) => [p.code, p]))

  // ─── prices, new, missing ───
  if (base) {
    for (const item of base.values()) {
      const p = byCode.get(item.code)
      if (!p) { plan.newItems.push(item); continue }
      plan.stats.matched++

      if (p.missing && !p.isActive) {
        plan.reactivate.push({ productId: p.id, code: p.code, listingId: p.listing?.id ?? null })
        if (p.listing) plan.touchListingIds.add(p.listing.id)
      }

      if (cents(item.price) === cents(p.cost)) {
        plan.stats.unchanged++
        if (reviews.pending.has(p.code)) plan.revertedPending.push(p.code)
        continue
      }
      plan.stats.costChanged++

      if (reviews.rejected.get(p.code) === cents(item.price)) { plan.stats.suppressedRejected++; continue }

      const l = p.listing
      const priced = !!l && l.priceSource === 'rule' && !l.manual && l.priceRon != null
      if (!priced) {
        if (l && (l.manual || l.priceSource !== 'rule')) plan.stats.manualOrOtherSource++
        const row: PricePlanRow = { productId: p.id, listingId: l?.id ?? null, code: p.code, oldCost: p.cost, newCost: item.price, oldPrice: l?.priceRon ?? null, newPrice: null, pct: null }
        plan.costOnly.push(row)
        plan.stats.costOnly++
        continue
      }

      const newPrice = priceFromCost(item.price, fx, settings, { categorySlug: p.categorySlug, brand: p.brand })
      if (!(newPrice > 0)) continue
      const pct = changePct(l.priceRon!, newPrice)
      const row: PricePlanRow = { productId: p.id, listingId: l.id, code: p.code, oldCost: p.cost, newCost: item.price, oldPrice: l.priceRon, newPrice, pct }
      if (Math.abs(pct) > settings.maxChangePct) {
        if (reviews.pending.get(p.code) === cents(item.price)) plan.stats.alreadyQueued++
        else plan.stats.queuedForReview++
        plan.reviewPrice.push(row)
        continue
      }
      plan.priceUpdates.push(row)
      plan.stats.priceApplied++
      if (cents(newPrice) !== cents(l.priceRon!)) plan.touchListingIds.add(l.id)
    }
    plan.stats.newProducts = plan.newItems.length

    // Active products that vanished from the price list
    const activeBefore = products.filter((p) => p.isActive).length
    for (const p of products) {
      if (!p.isActive || base.has(p.code)) continue
      plan.deactivate.push({ productId: p.id, code: p.code, listingId: p.listing?.id ?? null })
    }
    plan.stats.wouldDeactivate = plan.deactivate.length
    plan.stats.wouldReactivate = plan.reactivate.length
    if (activeBefore > 0 && (plan.deactivate.length / activeBefore) * 100 > settings.maxDeactivatePct) {
      plan.deactivationBlocked = `${plan.deactivate.length} of ${activeBefore} active products (${((plan.deactivate.length / activeBefore) * 100).toFixed(1)}%) are missing from the price list — above the ${settings.maxDeactivatePct}% limit, nothing deactivated`
      plan.deactivate = []
    }
    for (const d of plan.deactivate) if (d.listingId) plan.touchListingIds.add(d.listingId)
  }

  // ─── stock ───
  if (stock) {
    plan.stats.stockRowsRead = stock.size
    const known = inp.knownCodes ?? new Set(products.map((p) => p.code))
    for (const code of stock.keys()) {
      if (known.has(code)) continue
      plan.stats.stockCodesNotInPricelist++
      if (plan.stats.stockCodesNotInPricelistSample.length < 10) plan.stats.stockCodesNotInPricelistSample.push(code)
    }
    for (const p of products) {
      const feedFlags = stock.get(p.code)
      const merged = new Map(p.stock)
      if (!feedFlags) {
        if (p.isActive) plan.stats.stockMissingForProducts++
      } else {
        plan.stats.stockProductsMatched++
        for (const [wh, flag] of feedFlags) {
          if (p.stock.get(wh) !== flag) { plan.stockUpserts.push({ productId: p.id, warehouse: wh, flag }); plan.stats.stockRowsChanged++ }
          merged.set(wh, flag)
        }
      }
      if (!p.isActive) continue
      const before = [...p.stock.values()]
      const after = [...merged.values()]
      const proposed = availabilityFromFlags(after, 'supplier_confirm')
      plan.stats.proposedMapping[proposed]++
      plan.stats.currentMapping[availabilityFromFlags(after, inp.currentMeaning)]++
      if (feedFlags && p.listing && availabilityFromFlags(before, inp.currentMeaning) !== availabilityFromFlags(after, inp.currentMeaning)) {
        plan.touchListingIds.add(p.listing.id)
        plan.stats.availabilityChanged++
      }
    }
  }

  plan.top = [...plan.priceUpdates, ...plan.reviewPrice]
    .filter((r) => r.pct != null)
    .sort((a, b) => Math.abs(b.pct!) - Math.abs(a.pct!))
    .slice(0, 20)
  return plan
}

// ─── reprice (fx / formula change) ───

export interface RepriceRow { productId: string; listingId: string; code: string; cost: number; oldPrice: number; newPrice: number; pct: number }

export interface RepricePlan {
  updates: RepriceRow[]
  review: RepriceRow[]
  unchanged: number
  skippedNotRule: number
  skippedNoPrice: number
  top: RepriceRow[]
}

export function planReprice(products: SnapshotProduct[], settings: PriceSyncSettings, fx: number): RepricePlan {
  const out: RepricePlan = { updates: [], review: [], unchanged: 0, skippedNotRule: 0, skippedNoPrice: 0, top: [] }
  for (const p of products) {
    const l = p.listing
    if (!l || !l.isActive || !p.isActive) continue
    if (l.manual || l.priceSource !== 'rule') { out.skippedNotRule++; continue }
    if (l.priceRon == null) { out.skippedNoPrice++; continue }
    const newPrice = priceFromCost(p.cost, fx, settings, { categorySlug: p.categorySlug, brand: p.brand })
    if (!(newPrice > 0)) { out.skippedNoPrice++; continue }
    if (cents(newPrice) === cents(l.priceRon)) { out.unchanged++; continue }
    const row: RepriceRow = { productId: p.id, listingId: l.id, code: p.code, cost: p.cost, oldPrice: l.priceRon, newPrice, pct: changePct(l.priceRon, newPrice) }
    if (Math.abs(row.pct) > settings.maxChangePct) out.review.push(row)
    else out.updates.push(row)
  }
  out.top = [...out.updates, ...out.review].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 20)
  return out
}
