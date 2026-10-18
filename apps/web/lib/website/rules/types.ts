/**
 * Website rules: one mechanism for pricing, routing, billing and "recommended" thresholds.
 * A rule = kind + ordered position + conditions (all must match) + an action validated per kind.
 * The first matching rule wins (like firewall rules); built-in defaults apply when nothing matches.
 */
export const RULE_KINDS = ['pricing', 'routing', 'billing', 'recommendation'] as const
export type RuleKind = (typeof RULE_KINDS)[number]

export const OPS = ['eq', 'in', 'contains', 'gte', 'lte', 'exists'] as const
export type Op = (typeof OPS)[number]

export type ConditionValue = string | number | boolean | string[]
export interface Condition { field: string; op: Op; value?: ConditionValue }

/** A value known about the situation a rule is evaluated for ("facts"). Unknown facts never match. */
export type FactValue = string | number | boolean | string[] | null | undefined
export type Facts = Record<string, FactValue>

/** Facts every rule may use, with the operators that make sense for each. `data.<key>` adds the entry's custom fields. */
export const FACT_CATALOG: Record<string, { label: string; type: 'string' | 'number' | 'boolean'; list?: boolean; ops: Op[] }> = {
  collection:     { label: 'Colecție', type: 'string', ops: ['eq', 'in'] },
  entry:          { label: 'Firma (profil)', type: 'string', ops: ['eq', 'in'] },
  account:        { label: 'Contul partenerului', type: 'string', ops: ['eq', 'in'] },
  tip:            { label: 'Tip (firmă / specialist)', type: 'string', ops: ['eq', 'in'] },
  county:         { label: 'Județ', type: 'string', ops: ['eq', 'in'] },
  city:           { label: 'Oraș', type: 'string', ops: ['eq', 'in'] },
  verified:       { label: 'Verificat', type: 'boolean', ops: ['eq'] },
  founding:       { label: 'Partener fondator', type: 'boolean', ops: ['eq'] },
  plan:           { label: 'Plan (gratuit / PRO)', type: 'string', ops: ['eq', 'in'] },
  requestType:    { label: 'Tip cerere (direct / general)', type: 'string', ops: ['eq'] },
  category:       { label: 'Categorie (serviciu cerut)', type: 'string', ops: ['eq', 'in'] },
  specialization: { label: 'Specializare', type: 'string', list: true, ops: ['eq', 'in', 'contains'] },
  budget:         { label: 'Buget (RON)', type: 'number', ops: ['gte', 'lte', 'exists'] },
  urgency:        { label: 'Urgență', type: 'string', ops: ['eq', 'in', 'exists'] },
}
export const FIELD_RE = /^(collection|entry|account|tip|county|city|verified|founding|plan|requestType|category|specialization|budget|urgency|data\.[a-z0-9_]{1,40})$/

export interface RuleLike {
  id: string
  kind: RuleKind
  name: string
  priority: number
  isActive: boolean
  conditions: Condition[]
  action: unknown
  validFrom?: Date | null
  validTo?: Date | null
  createdAt?: Date
}
