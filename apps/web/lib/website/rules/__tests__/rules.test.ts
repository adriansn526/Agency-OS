/** Run with: npx tsx --test lib/website/rules/__tests__/rules.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchCondition } from '../conditions'
import { resolveRule, orderRules } from '../engine'
import { DEFAULT_ACTIONS, conditionSchema, conditionsSchema, parseAction } from '../actions'
import type { Condition, RuleLike } from '../types'

const c = (field: string, op: Condition['op'], value?: Condition['value']): Condition => ({ field, op, value })
let n = 0
const rule = (over: Partial<RuleLike> & Pick<RuleLike, 'kind' | 'action'>): RuleLike => ({
  id: `r${++n}`, name: over.name ?? `Regula ${n}`, priority: 10, isActive: true, conditions: [], createdAt: new Date(2026, 0, n), ...over,
})

// ─── conditions ───────────────────────────────────────────────────

test('eq / in are case- and diacritics-insensitive', () => {
  assert.equal(matchCondition(c('county', 'eq', 'Iași'), { county: 'iasi' }), true)
  assert.equal(matchCondition(c('county', 'in', ['Cluj', 'Timiș']), { county: 'TIMIS' }), true)
  assert.equal(matchCondition(c('county', 'in', ['Cluj']), { county: 'Iași' }), false)
  assert.equal(matchCondition(c('verified', 'eq', true), { verified: true }), true)
  assert.equal(matchCondition(c('verified', 'eq', true), { verified: false }), false)
})

test('unknown or empty facts never match (except exists:false)', () => {
  for (const op of ['eq', 'in', 'contains', 'gte', 'lte'] as const) {
    assert.equal(matchCondition(c('budget', op, op === 'in' ? ['x'] : op === 'contains' ? 'x' : 5), {}), false, op)
  }
  assert.equal(matchCondition(c('budget', 'exists', true), { budget: undefined }), false)
  assert.equal(matchCondition(c('budget', 'exists', false), {}), true)
  assert.equal(matchCondition(c('budget', 'exists'), { budget: 0 }), true) // 0 is a value, not missing
})

test('list facts: eq / in / contains look at any element', () => {
  const f = { specialization: ['Instalații sanitare', 'Termoizolații'] }
  assert.equal(matchCondition(c('specialization', 'eq', 'termoizolatii'), f), true)
  assert.equal(matchCondition(c('specialization', 'in', ['Zidărie', 'Termoizolații']), f), true)
  assert.equal(matchCondition(c('specialization', 'contains', 'Instalații sanitare'), f), true)
  assert.equal(matchCondition(c('specialization', 'eq', 'Zidărie'), f), false)
  assert.equal(matchCondition(c('specialization', 'eq', 'x'), { specialization: [] }), false)
})

test('numeric comparisons accept numeric strings, reject junk', () => {
  assert.equal(matchCondition(c('budget', 'gte', 10000), { budget: '12500' }), true)
  assert.equal(matchCondition(c('budget', 'gte', 10000), { budget: '9.999,5' }), false)
  assert.equal(matchCondition(c('budget', 'lte', 5000), { budget: 5000 }), true)
  assert.equal(matchCondition(c('budget', 'gte', 1), { budget: 'mult' }), false)
})

// ─── resolution ───────────────────────────────────────────────────

test('no rules: the built-in default applies and says so', () => {
  const r = resolveRule('billing', {}, [])
  assert.deepEqual([r.via, r.rule, r.action], ['default', null, DEFAULT_ACTIONS.billing])
  assert.equal(r.action.chargeAt, 'acceptance')
})

test('first matching rule in priority order wins; a catch-all sits last', () => {
  const rules = [
    rule({ kind: 'pricing', name: 'Implicit', priority: 100, action: { amountRon: 20 } }),
    rule({ kind: 'pricing', name: 'Cluj instalatori', priority: 10, conditions: [c('county', 'eq', 'Cluj'), c('specialization', 'contains', 'instalatii')], action: { amountRon: 35 } }),
    rule({ kind: 'pricing', name: 'Firma X', priority: 1, conditions: [c('entry', 'eq', 'e_X')], action: { amountRon: 0 } }),
  ]
  const price = (facts: Record<string, string | string[]>) => (resolveRule('pricing', facts, rules).action as { amountRon: number }).amountRon
  assert.equal(price({ entry: 'e_X', county: 'Cluj', specialization: ['Instalații'] }), 0) // negotiated price beats the category
  assert.equal(price({ entry: 'e_Y', county: 'Cluj', specialization: ['Instalații'] }), 35)
  assert.equal(price({ entry: 'e_Y', county: 'Iași' }), 20) // falls through to the catch-all
})

test('equal priority is decided by creation time, then id (deterministic)', () => {
  const a = rule({ kind: 'billing', priority: 5, action: { chargeAt: 'delivery' }, createdAt: new Date(2026, 5, 1) })
  const b = rule({ kind: 'billing', priority: 5, action: { chargeAt: 'acceptance' }, createdAt: new Date(2026, 1, 1) })
  assert.deepEqual(orderRules([a, b]).map((r) => r.id), [b.id, a.id])
  assert.equal(resolveRule('billing', {}, [a, b]).rule?.id, b.id)
})

test('inactive, not-yet-valid and expired rules are skipped, with reasons in the trace', () => {
  const now = new Date('2026-06-15T12:00:00Z')
  const rules = [
    rule({ kind: 'billing', priority: 1, isActive: false, action: { chargeAt: 'delivery' }, name: 'oprită' }),
    rule({ kind: 'billing', priority: 2, validFrom: new Date('2026-07-01'), action: { chargeAt: 'delivery' }, name: 'viitoare' }),
    rule({ kind: 'billing', priority: 3, validTo: new Date('2026-06-15T12:00:00Z'), action: { chargeAt: 'delivery' }, name: 'expirată' }), // end is exclusive
    rule({ kind: 'billing', priority: 4, validFrom: new Date('2026-06-01'), validTo: new Date('2026-07-01'), action: { chargeAt: 'delivery' }, name: 'promoție' }),
  ]
  const r = resolveRule('billing', {}, rules, now)
  assert.deepEqual(r.trace.map((t) => t.status), ['inactive', 'not_started', 'expired', 'matched'])
  assert.equal(r.rule?.name, 'promoție')
})

test('rules of other kinds are ignored; the trace explains non-matches', () => {
  const rules = [
    rule({ kind: 'routing', priority: 1, action: { mode: 'multi' } }),
    rule({ kind: 'pricing', priority: 2, conditions: [c('county', 'eq', 'Cluj'), c('verified', 'eq', true)], action: { amountRon: 50 } }),
  ]
  const r = resolveRule('pricing', { county: 'Cluj', verified: false }, rules)
  assert.equal(r.via, 'default')
  assert.equal(r.trace.length, 1)
  assert.equal(r.trace[0]?.status, 'no_match')
  assert.deepEqual(r.trace[0]?.failed?.map((f) => f.field), ['verified'])
})

test('rules after the winner are reported as not evaluated', () => {
  const rules = [rule({ kind: 'billing', priority: 1, action: { chargeAt: 'delivery' } }), rule({ kind: 'billing', priority: 2, action: { chargeAt: 'acceptance' } })]
  assert.deepEqual(resolveRule('billing', {}, rules).trace.map((t) => t.status), ['matched', 'not_evaluated'])
})

// ─── actions & condition schemas ──────────────────────────────────

test('pricing: bounded by the line limit, max 2 decimals, free-first-N defaults to 0', () => {
  assert.deepEqual(parseAction('pricing', { amountRon: 35.5 }), { amountRon: 35.5, freeFirstN: 0 })
  assert.throws(() => parseAction('pricing', { amountRon: -1 }))
  assert.throws(() => parseAction('pricing', { amountRon: 501 }))
  assert.equal(parseAction('pricing', { amountRon: 900 }, { maxPriceRon: 1000 }).amountRon, 900)
  assert.throws(() => parseAction('pricing', { amountRon: 10.123 }))
  assert.throws(() => parseAction('pricing', { amountRon: 10, extra: 1 })) // strict
})

test('routing: single means one firm; multi needs 2+ firms and acceptances ≤ firms', () => {
  assert.deepEqual(parseAction('routing', { mode: 'single' }), { mode: 'single', maxFirms: 1, maxAcceptances: 1, selection: 'nearest', minReviews: 0, minRating: 0 })
  assert.deepEqual(parseAction('routing', { mode: 'multi', maxFirms: 5, maxAcceptances: 3, selection: 'rating' }), { mode: 'multi', maxFirms: 5, maxAcceptances: 3, selection: 'rating', minReviews: 0, minRating: 0 })
  assert.throws(() => parseAction('routing', { mode: 'single', maxFirms: 3, maxAcceptances: 1 }))
  assert.throws(() => parseAction('routing', { mode: 'multi', maxFirms: 1, maxAcceptances: 1 }))
  assert.throws(() => parseAction('routing', { mode: 'multi', maxFirms: 3, maxAcceptances: 4 }))
})

test('billing and recommendation actions', () => {
  assert.deepEqual(parseAction('billing', { chargeAt: 'delivery' }), { chargeAt: 'delivery' })
  assert.throws(() => parseAction('billing', { chargeAt: 'never' }))
  assert.deepEqual(parseAction('recommendation', { minReviews: 5, minRating: 4.5 }), { minReviews: 5, minRating: 4.5, requireVerified: true })
  assert.throws(() => parseAction('recommendation', { minReviews: 5, minRating: 6 }))
})

test('conditions: field whitelist, operator per fact, value types', () => {
  const ok = (x: unknown) => conditionSchema.safeParse(x).success
  assert.equal(ok({ field: 'county', op: 'in', value: ['Cluj', 'Iași'] }), true)
  assert.equal(ok({ field: 'budget', op: 'gte', value: 10000 }), true)
  assert.equal(ok({ field: 'data.cui', op: 'eq', value: 'RO1' }), true) // custom fields
  assert.equal(ok({ field: 'budget', op: 'exists' }), true)
  assert.equal(ok({ field: 'password', op: 'eq', value: 'x' }), false) // not a known fact
  assert.equal(ok({ field: 'data.Bad Key', op: 'eq', value: 'x' }), false)
  assert.equal(ok({ field: 'verified', op: 'in', value: ['a'] }), false) // operator not allowed for this fact
  assert.equal(ok({ field: 'county', op: 'in', value: 'Cluj' }), false) // needs a list
  assert.equal(ok({ field: 'budget', op: 'gte', value: '10000' }), false) // needs a number
  assert.equal(ok({ field: 'verified', op: 'eq', value: 'da' }), false) // wrong value type
  assert.equal(ok({ field: 'county', op: 'eq', value: 'x', extra: 1 }), false)
  assert.equal(conditionsSchema.safeParse(Array.from({ length: 13 }, () => ({ field: 'county', op: 'eq', value: 'x' }))).success, false)
})
