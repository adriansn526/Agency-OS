/** Run with: npx tsx --test lib/website/rules/__tests__/describe.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildFieldOptions, describeAction, describeCondition, diffSummary } from '../describe'

const collections = [{ key: 'companii', name: 'Companie', fields: [
  { key: 'cui', label: 'CUI', type: 'text' }, { key: 'tip_activitate', label: 'Tip activitate', type: 'select', options: ['General', 'Instalații'] },
  { key: 'angajati', label: 'Angajați', type: 'number' }, { key: 'servicii', label: 'Servicii', type: 'list' },
] }, { name: 'Proiect', fields: [{ key: 'cui', label: 'CUI proiect', type: 'text' }] }]

test('field options: built-in facts without the ones that do not exist yet, plus custom fields typed by their definition', () => {
  const f = buildFieldOptions(collections)
  const keys = f.map((x) => x.key)
  assert.equal(keys.includes('account') || keys.includes('plan'), false)
  assert.ok(['county', 'budget', 'verified', 'specialization', 'entry'].every((k) => keys.includes(k)))
  assert.equal(keys.filter((k) => k === 'data.cui').length, 1) // same key in two collections is listed once
  const sel = f.find((x) => x.key === 'data.tip_activitate')!
  assert.deepEqual([sel.type, sel.options, sel.ops], ['string', ['General', 'Instalații'], ['eq', 'in', 'exists']])
  assert.deepEqual(f.find((x) => x.key === 'data.angajati')!.ops, ['gte', 'lte', 'exists'])
  assert.equal(f.find((x) => x.key === 'data.servicii')!.list, true)
})

test('collection and request type offer their real values', () => {
  const f = buildFieldOptions(collections)
  assert.deepEqual(f.find((x) => x.key === 'requestType')!.options, ['direct', 'general'])
  assert.deepEqual(f.find((x) => x.key === 'collection')!.options, ['companii'])
})

test('conditions read as sentences', () => {
  const f = buildFieldOptions(collections)
  assert.equal(describeCondition({ field: 'county', op: 'eq', value: 'Cluj' }, f), 'Județ este Cluj')
  assert.equal(describeCondition({ field: 'county', op: 'in', value: ['Cluj', 'Iași'] }, f), 'Județ este una dintre Cluj, Iași')
  assert.equal(describeCondition({ field: 'budget', op: 'gte', value: 10000 }, f), 'Buget (RON) ≥ 10000')
  assert.equal(describeCondition({ field: 'verified', op: 'eq', value: true }, f), 'Verificat este Da')
  assert.equal(describeCondition({ field: 'budget', op: 'exists' }, f), 'Buget (RON) este completat')
  assert.equal(describeCondition({ field: 'budget', op: 'exists', value: false }, f), 'Buget (RON) nu este completat')
  assert.match(describeCondition({ field: 'data.cui', op: 'eq', value: 'RO1' }, f), /^CUI \(câmp companie\) este RO1$/)
  assert.equal(describeCondition({ field: 'unknown_now', op: 'eq', value: 'x' }, f), 'unknown_now este x') // never crashes on a removed field
})

test('actions read as sentences', () => {
  assert.equal(describeAction('pricing', { amountRon: 0 }), 'Gratuit')
  assert.equal(describeAction('pricing', { amountRon: 35, freeFirstN: 3 }), '35 RON / cerere · primele 3 gratuite')
  assert.equal(describeAction('routing', { mode: 'single' }), 'O singură firmă')
  assert.equal(describeAction('routing', { mode: 'multi', maxFirms: 5, maxAcceptances: 3, selection: 'rating' }), 'Până la 5 firme, max 3 acceptări · cele mai bine cotate')
  assert.equal(describeAction('billing', { chargeAt: 'delivery' }), 'Taxare la livrare')
  assert.equal(describeAction('billing', { chargeAt: 'acceptance' }), 'Taxare la acceptare')
  assert.equal(describeAction('recommendation', { minReviews: 5, minRating: 4.5, requireVerified: true }), 'Cel puțin 5 recenzii, media ≥ 4.5, doar verificate')
  assert.equal(describeAction('recommendation', { minReviews: 0, minRating: 0, requireVerified: false }), 'Cel puțin 0 recenzii, media ≥ 0')
})

test('diffSummary lists only what changed', () => {
  const d = diffSummary({ name: 'A', action: { amountRon: 10, freeFirstN: 0 }, isActive: true }, { name: 'B', action: { amountRon: 12, freeFirstN: 0 }, isActive: true })
  assert.deepEqual(d.sort(), ['action.amountRon: 10 → 12', 'name: "A" → "B"'])
  assert.deepEqual(diffSummary({ x: 1 }, { x: 1 }), [])
  assert.deepEqual(diffSummary(null, { a: 1 }), ['a: — → 1'])
})
