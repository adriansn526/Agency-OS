/** Run with: npx tsx --test lib/website/endorsements/__tests__/rules.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clinicsOf, endorseInput, isCounted, sharesClinic } from '../rules'

test('clinics are compared without case, diacritics or punctuation', () => {
  assert.deepEqual(clinicsOf({ clinici: ['Clinica Sănătatea, Cluj', ' '] }), ['clinica sanatatea cluj'])
  assert.equal(sharesClinic({ clinici: ['Regina Maria – Cluj'] }, { clinici: ['regina maria cluj'] }), true)
  assert.equal(sharesClinic({ clinici: ['A'] }, { clinici: ['B'] }), false)
  assert.equal(sharesClinic({}, { clinici: ['B'] }), false)
})

test('an endorsement counts only with a valid CMR, a different clinic and no endorsement back', () => {
  const r = { endorserId: 'a', endorseeId: 'b', sameClinic: false, endorserCmrActive: true }
  assert.equal(isCounted(r, new Set()), true)
  assert.equal(isCounted({ ...r, sameClinic: true }, new Set()), false)
  assert.equal(isCounted({ ...r, endorserCmrActive: false }, new Set()), false)
  assert.equal(isCounted(r, new Set(['b>a'])), false)
  assert.equal(isCounted(r, new Set(['a>b'])), true)
})

test('input: slug required, note up to 280, unknown keys refused', () => {
  assert.equal(endorseInput.safeParse({ slug: 'dr-ion-popescu' }).success, true)
  assert.equal(endorseInput.safeParse({ slug: 'Dr Ion' }).success, false)
  assert.equal(endorseInput.safeParse({ slug: 'x', note: 'a'.repeat(281) }).success, false)
  assert.equal(endorseInput.safeParse({ slug: 'x', note: 'a'.repeat(280), showName: true }).success, true)
  assert.equal(endorseInput.safeParse({ slug: 'x', extra: 1 }).success, false)
})
