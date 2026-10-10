/**
 * Supplier price → shop price (RON, VAT included):
 *
 *   gross = cost × fx × (1 + markup%) × (1 + VAT%)      one single rounding at the end
 *   price = max(round(gross), minPriceRon)
 *
 * Exact decimal arithmetic (no binary floats). Markup is 0 unless the owner approved it.
 */
import Decimal from 'decimal.js'
import type { PriceSyncSettings } from './settings'

export class MarkupNotApprovedError extends Error {
  constructor() { super('Markup above 0 requires an explicit approval (markupApprovedAt) before it can be applied') }
}

export function assertFormulaUsable(s: PriceSyncSettings): void {
  const hasMarkup = s.markupPct > 0 || s.markupOverrides.some((o) => o.markupPct > 0)
  if (hasMarkup && !s.markupApprovedAt) throw new MarkupNotApprovedError()
}

export function markupFor(s: PriceSyncSettings, p: { categorySlug: string | null; brand: string | null }): number {
  for (const o of s.markupOverrides) {
    if (o.categorySlug && o.categorySlug !== p.categorySlug) continue
    if (o.brand && o.brand.toLowerCase() !== (p.brand ?? '').toLowerCase()) continue
    if (!o.categorySlug && !o.brand) continue // an override without a filter would be a second default
    return o.markupPct
  }
  return s.markupPct
}

function roundGross(g: Decimal, mode: PriceSyncSettings['rounding']): Decimal {
  switch (mode) {
    case '99': return g.ceil().minus(0.01)
    case '90': return g.ceil().minus(0.1)
    case 'integer': return g.ceil()
    default: return g.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  }
}

/** `fx` = RON per 1 unit of the source currency (1 for RON). Returns 0 for a non-positive cost. */
export function priceFromCost(
  cost: number | string,
  fx: number,
  s: PriceSyncSettings,
  p: { categorySlug: string | null; brand: string | null } = { categorySlug: null, brand: null },
): number {
  const c = new Decimal(cost)
  if (!c.isFinite() || c.lte(0) || !(fx > 0)) return 0
  const markup = markupFor(s, p)
  const gross = c.times(fx).times(new Decimal(1).plus(new Decimal(markup).div(100))).times(new Decimal(1).plus(new Decimal(s.vatPct).div(100)))
  let price = roundGross(gross, s.rounding)
  if (price.lt(s.minPriceRon)) price = new Decimal(s.minPriceRon)
  return price.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
}

/** Percentage change from `oldPrice` to `newPrice`, 2 decimals. */
export function changePct(oldPrice: number, newPrice: number): number {
  if (!(oldPrice > 0)) return 0
  return Math.round(((newPrice - oldPrice) / oldPrice) * 10_000) / 100
}
