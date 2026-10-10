/**
 * Price & stock sync settings. Stored in CommerceChannel.config.priceSync (JSON) — no schema change.
 *
 * The defaults reproduce the prices that are live today: no markup, VAT 21%, no rounding beyond 2 decimals.
 * A markup above 0 is refused by the price formula until `markupApprovedAt` is set (see priceFromCost).
 */
import { createHash } from 'node:crypto'
import { z } from 'zod'

export const MarkupOverride = z.object({
  categorySlug: z.string().max(80).nullable().default(null),
  brand: z.string().max(80).nullable().default(null),
  markupPct: z.number().min(0).max(500),
})

export const PriceSyncSettings = z.object({
  /** Master switch for writes. While false every run is forced into dry-run. */
  enabled: z.boolean().default(false),
  sourceCurrency: z.enum(['EUR', 'USD', 'RON']).default('EUR'),
  fxSource: z.enum(['BNR']).default('BNR'),
  vatPct: z.number().min(0).max(100).default(21),
  markupPct: z.number().min(0).max(500).default(0),
  /** First match wins; category and brand are both optional filters. */
  markupOverrides: z.array(MarkupOverride).max(200).default([]),
  /** ISO timestamp of the owner's approval of any markup above 0. */
  markupApprovedAt: z.string().nullable().default(null),
  rounding: z.enum(['none', '99', '90', 'integer']).default('none'),
  minPriceRon: z.number().min(0).max(1e6).default(0),
  /**
   * Skip the daily reprice while the BNR rate moved less than this % since the rate the prices were last computed with.
   * 0 (default) = reprice on every rate change, as specified; a small value (e.g. 0.3) avoids rewriting the whole catalog daily.
   */
  fxMinChangePct: z.number().min(0).max(10).default(0),
  /** Price moves above this (vs the current price) go to the review queue instead of being applied. */
  maxChangePct: z.number().min(1).max(1000).default(30),
  /** A feed file below this fraction of the previous run's rows is rejected as truncated. */
  minRowsRatio: z.number().min(0.5).max(1).default(0.9),
  /** More than this share of the active catalog vanishing from the price list blocks deactivation. */
  maxDeactivatePct: z.number().min(0).max(100).default(5),
  /** Shown by /api/storefront/meta. null = derived (VAT is included when vatPct > 0). */
  vatIncludedLabel: z.boolean().nullable().default(null),
  /** Rate and formula the live prices were last computed with. Maintained by the sync, not by hand. */
  applied: z.object({
    fxRate: z.number().positive(),
    fxDate: z.string(),
    formulaHash: z.string(),
    at: z.string(),
  }).nullable().default(null),
})

export type PriceSyncSettings = z.infer<typeof PriceSyncSettings>

export function parsePriceSyncSettings(channelConfig: unknown): PriceSyncSettings {
  const raw = channelConfig && typeof channelConfig === 'object' ? (channelConfig as Record<string, unknown>).priceSync : undefined
  const parsed = PriceSyncSettings.safeParse(raw ?? {})
  // A corrupt block must never silently turn writes on: fall back to the safe defaults (enabled=false).
  return parsed.success ? parsed.data : PriceSyncSettings.parse({})
}

/** Hash of the inputs that change a computed price (not of switches/limits). */
export function formulaHash(s: PriceSyncSettings): string {
  const core = {
    c: s.sourceCurrency, v: s.vatPct, m: s.markupPct, r: s.rounding, p: s.minPriceRon,
    o: s.markupOverrides.map((o) => [o.categorySlug, o.brand, o.markupPct]),
    a: s.markupApprovedAt ? 1 : 0,
  }
  return createHash('sha256').update(JSON.stringify(core)).digest('hex').slice(0, 16)
}

/** Effective stock mapping stored on the feed (CommerceSupplierFeed.stockFlagMeaning). */
export const STOCK_MAPPING_SUPPLIER = 'supplier_confirm'
