/** Rule resolution (pure). First matching rule wins; ordered by priority, then creation time. */
import { DEFAULT_ACTIONS, type ActionByKind } from './actions'
import { failedConditions } from './conditions'
import type { Condition, Facts, RuleKind, RuleLike } from './types'

export type TraceStatus = 'inactive' | 'not_started' | 'expired' | 'no_match' | 'matched' | 'not_evaluated'
export interface TraceEntry { ruleId: string; name: string; status: TraceStatus; failed?: Condition[] }
export interface Resolution<K extends RuleKind> {
  kind: K
  via: 'rule' | 'default'
  rule: { id: string; name: string } | null
  action: ActionByKind[K]
  /** Every rule of this kind in evaluation order, with why it did or did not apply (for the simulator). */
  trace: TraceEntry[]
}

export function orderRules<T extends Pick<RuleLike, 'priority' | 'createdAt' | 'id'>>(rules: T[]): T[] {
  return [...rules].sort((a, b) => a.priority - b.priority || (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) || a.id.localeCompare(b.id))
}

export function resolveRule<K extends RuleKind>(kind: K, facts: Facts, rules: RuleLike[], now: Date = new Date()): Resolution<K> {
  const ordered = orderRules(rules.filter((r) => r.kind === kind))
  const trace: TraceEntry[] = []
  let winner: RuleLike | null = null

  for (const r of ordered) {
    if (winner) { trace.push({ ruleId: r.id, name: r.name, status: 'not_evaluated' }); continue }
    if (!r.isActive) { trace.push({ ruleId: r.id, name: r.name, status: 'inactive' }); continue }
    if (r.validFrom && now < r.validFrom) { trace.push({ ruleId: r.id, name: r.name, status: 'not_started' }); continue }
    if (r.validTo && now >= r.validTo) { trace.push({ ruleId: r.id, name: r.name, status: 'expired' }); continue }
    const failed = failedConditions(r.conditions, facts)
    if (failed.length) { trace.push({ ruleId: r.id, name: r.name, status: 'no_match', failed }); continue }
    winner = r
    trace.push({ ruleId: r.id, name: r.name, status: 'matched' })
  }

  return winner
    ? { kind, via: 'rule', rule: { id: winner.id, name: winner.name }, action: winner.action as ActionByKind[K], trace }
    : { kind, via: 'default', rule: null, action: DEFAULT_ACTIONS[kind], trace }
}
