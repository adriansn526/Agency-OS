/**
 * Pricing engine — "market-based" pricing adapted from the ClimaticPRO repricer.
 *
 *   landed  = cost × FX × (1 + transport%)
 *   rule    = highest-priority matching rule (category / brand / quality / landed-cost band)
 *   net     = max(landed × (1 + markup%), landed + minMargin) + bulky surcharge
 *   market  = if competitor price known and rule allows: max(floor, competitorMin − undercut)
 *   gross   = net × (1 + VAT) → rounding (,99)
 *   manual  = manualPriceRon always wins
 */

export interface PricingChannel {
  vatRate: number
  transportPct: number
  defaultMarkupPct: number
  minMarginRon: number
  roundingMode: string
}

export interface PricingRuleInput {
  id: string
  priority: number
  categoryIds: string[] | null // category + descendants; null = any
  brand: string | null
  quality: string | null
  costMin: number | null
  costMax: number | null
  markupPct: number
  minMarginRon: number | null
  bulkySurchargeRon: number
  competitorUndercutRon: number | null
}

export interface PricingProductInput {
  costPrice: number
  costCurrency: string
  categoryId: string | null
  brand: string | null
  quality: string | null
  bulkyClass: string | null
  manualPriceRon: number | null
  competitorMinRon: number | null
}

export interface PriceResult {
  priceRon: number
  priceSource: 'rule' | 'competitor' | 'manual'
  ruleId: string | null
  landedRon: number
  floorRon: number
}

export function roundPrice(gross: number, mode: string): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0
  switch (mode) {
    case '99': return Math.ceil(gross) - 0.01
    case '90': return Math.ceil(gross) - 0.1
    case 'integer': return Math.ceil(gross)
    default: return Math.round(gross * 100) / 100
  }
}

export function matchRule(rules: PricingRuleInput[], p: PricingProductInput, landed: number): PricingRuleInput | null {
  // rules must be pre-sorted by priority desc
  for (const r of rules) {
    if (r.categoryIds && (!p.categoryId || !r.categoryIds.includes(p.categoryId))) continue
    if (r.brand && r.brand.toLowerCase() !== (p.brand ?? '').toLowerCase()) continue
    if (r.quality && r.quality !== p.quality) continue
    if (r.costMin != null && landed < r.costMin) continue
    if (r.costMax != null && landed >= r.costMax) continue
    return r
  }
  return null
}

export function computePrice(
  p: PricingProductInput,
  ch: PricingChannel,
  rules: PricingRuleInput[],
  fx: Record<string, number>,
): PriceResult | null {
  const rate = p.costCurrency === 'RON' ? 1 : fx[p.costCurrency]
  if (!rate) return null
  const landed = p.costPrice * rate * (1 + ch.transportPct / 100)
  const vat = 1 + ch.vatRate / 100
  const rule = matchRule(rules, p, landed)
  const markup = rule?.markupPct ?? ch.defaultMarkupPct
  const minMargin = rule?.minMarginRon ?? ch.minMarginRon
  const bulky = rule && (p.bulkyClass === 'large' || p.bulkyClass === 'xlarge') ? rule.bulkySurchargeRon : 0

  const floorNet = landed + minMargin + bulky
  const floorGross = roundPrice(floorNet * vat, ch.roundingMode)

  if (p.manualPriceRon != null && p.manualPriceRon > 0) {
    return { priceRon: p.manualPriceRon, priceSource: 'manual', ruleId: rule?.id ?? null, landedRon: round2(landed), floorRon: floorGross }
  }

  const ruleNet = Math.max(landed * (1 + markup / 100), landed + minMargin) + bulky
  let gross = roundPrice(ruleNet * vat, ch.roundingMode)
  let source: PriceResult['priceSource'] = 'rule'

  if (p.competitorMinRon != null && rule?.competitorUndercutRon != null) {
    const target = roundPrice(p.competitorMinRon - rule.competitorUndercutRon, ch.roundingMode)
    gross = Math.max(floorGross, target)
    source = 'competitor'
  }

  return { priceRon: round2(gross), priceSource: source, ruleId: rule?.id ?? null, landedRon: round2(landed), floorRon: floorGross }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
