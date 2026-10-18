import { test } from 'node:test'
import assert from 'node:assert/strict'
import { offerLines } from '../offer'

const single = { mode: 'single', maxFirms: 1, maxAcceptances: 1, selection: 'nearest' } as const
const multi = { mode: 'multi', maxFirms: 3, maxAcceptances: 3, selection: 'nearest' } as const

test('free by default: nothing to pay now, requests free', () => {
  const l = offerLines({ amountRon: 0, freeFirstN: 0 }, single, { chargeAt: 'acceptance' }, null)
  assert.equal(l.length, 2); assert.match(l[0]!, /Nu plătiți nimic acum/); assert.match(l[1]!, /gratuite/)
})
test('price comes from the rule, with free first requests and charge moment', () => {
  const l = offerLines({ amountRon: 39, freeFirstN: 3 }, multi, { chargeAt: 'acceptance' }, null)
  assert.match(l[1]!, /39 lei \/ cerere, primele 3 fiind gratuite/); assert.match(l[1]!, /doar când acceptați/); assert.match(l[2]!, /cel mult 3 firme/)
  assert.match(offerLines({ amountRon: 12.5, freeFirstN: 0 }, single, { chargeAt: 'delivery' }, null)[1]!, /12,50 lei.*când primiți/)
})
test('founder line shows the founder price and the programme text', () => {
  const l = offerLines({ amountRon: 40, freeFirstN: 0 }, single, { chargeAt: 'acceptance' }, { pricing: { amountRon: 20, freeFirstN: 3 }, text: 'Mai sunt 2 locuri.' })
  assert.match(l[2]!, /Ca partener fondator: 20 lei \/ cerere, primele 3.*Mai sunt 2 locuri/)
  assert.equal(offerLines({ amountRon: 40, freeFirstN: 0 }, single, { chargeAt: 'acceptance' }, { pricing: { amountRon: 40, freeFirstN: 0 }, text: 'Mai sunt 2 locuri.' })[2], 'Mai sunt 2 locuri.')
})
