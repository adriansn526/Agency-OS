/** Action shapes per rule kind (strict: unknown keys are rejected) and the built-in defaults used when no rule matches. */
import { z } from 'zod'
import { FACT_CATALOG, FIELD_RE, OPS, type Condition, type RuleKind } from './types'

export const DEFAULT_MAX_PRICE_RON = 500

const money = (max: number) => z.number().min(0).max(max).refine((n) => Math.round(n * 100) === n * 100 || Math.abs(Math.round(n * 100) - n * 100) < 1e-9, 'Maxim 2 zecimale')

export const pricingAction = (maxPriceRon = DEFAULT_MAX_PRICE_RON) =>
  z.strictObject({ amountRon: money(maxPriceRon), freeFirstN: z.number().int().min(0).max(1000).default(0) })

export const routingAction = z.strictObject({
  mode: z.enum(['single', 'multi']),
  maxFirms: z.number().int().min(1).max(10).default(1),
  maxAcceptances: z.number().int().min(1).max(10).default(1),
  selection: z.enum(['nearest', 'rating', 'round_robin']).default('nearest'),
  /** Only firms with at least this many approved reviews / this average receive requests (0 = no filter) */
  minReviews: z.number().int().min(0).max(1000).default(0),
  minRating: z.number().min(0).max(5).default(0),
}).superRefine((a, ctx) => {
  if (a.mode === 'single' && (a.maxFirms !== 1 || a.maxAcceptances !== 1)) ctx.addIssue({ code: 'custom', message: 'O singură firmă: numărul de firme și de acceptări trebuie să fie 1' })
  if (a.mode === 'multi' && a.maxFirms < 2) ctx.addIssue({ code: 'custom', message: 'Mai multe firme: minim 2' })
  if (a.maxAcceptances > a.maxFirms) ctx.addIssue({ code: 'custom', message: 'Acceptările nu pot depăși numărul de firme' })
})

export const billingAction = z.strictObject({ chargeAt: z.enum(['delivery', 'acceptance']) })

export const recommendationAction = z.strictObject({
  minReviews: z.number().int().min(0).max(1000), minRating: z.number().min(0).max(5), requireVerified: z.boolean().default(true),
})

export type PricingAction = z.infer<ReturnType<typeof pricingAction>>
export type RoutingAction = z.infer<typeof routingAction>
export type BillingAction = z.infer<typeof billingAction>
export type RecommendationAction = z.infer<typeof recommendationAction>
export interface ActionByKind { pricing: PricingAction; routing: RoutingAction; billing: BillingAction; recommendation: RecommendationAction }

export { DEFAULT_ACTIONS } from './defaults'

export function parseAction<K extends RuleKind>(kind: K, raw: unknown, limits: { maxPriceRon?: number } = {}): ActionByKind[K] {
  const schema = kind === 'pricing' ? pricingAction(limits.maxPriceRon) : kind === 'routing' ? routingAction : kind === 'billing' ? billingAction : recommendationAction
  return schema.parse(raw) as ActionByKind[K]
}

// ─── conditions ───────────────────────────────────────────────────

const value = z.union([z.string().max(120), z.number(), z.boolean(), z.array(z.string().max(120)).min(1).max(50)])
export const conditionSchema = z.strictObject({
  field: z.string().regex(FIELD_RE, 'Câmp necunoscut'), op: z.enum(OPS), value: value.optional(),
}).superRefine((c, ctx) => {
  const meta = FACT_CATALOG[c.field] // custom fields (data.*) accept every operator
  if (meta && !meta.ops.includes(c.op)) ctx.addIssue({ code: 'custom', message: `„${meta.label}” nu poate folosi operatorul ${c.op}` })
  if (c.op === 'exists') { if (c.value !== undefined && typeof c.value !== 'boolean') ctx.addIssue({ code: 'custom', message: '„exists” cere true/false' }) }
  else if (c.op === 'in') { if (!Array.isArray(c.value)) ctx.addIssue({ code: 'custom', message: '„în listă” cere o listă de valori' }) }
  else if (c.op === 'gte' || c.op === 'lte') { if (typeof c.value !== 'number') ctx.addIssue({ code: 'custom', message: 'Comparația cere un număr' }) }
  else if (c.op === 'contains') { if (typeof c.value !== 'string') ctx.addIssue({ code: 'custom', message: '„conține” cere un text' }) }
  else if (c.value === undefined || Array.isArray(c.value)) ctx.addIssue({ code: 'custom', message: '„egal” cere o singură valoare' })
  if (meta && c.value !== undefined && c.op !== 'exists' && c.op !== 'in') {
    const ok = meta.type === 'number' ? typeof c.value === 'number' : meta.type === 'boolean' ? typeof c.value === 'boolean' : typeof c.value === 'string'
    if (!ok) ctx.addIssue({ code: 'custom', message: `Valoare de tip greșit pentru „${meta.label}”` })
  }
})
export const conditionsSchema = z.array(conditionSchema).max(12)
export type ParsedCondition = z.infer<typeof conditionSchema> & Condition
