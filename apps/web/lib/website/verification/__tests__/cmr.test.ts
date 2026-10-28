/** Run with: npx tsx --test lib/website/verification/__tests__/cmr.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activeCmr, cmrInput, decodeCmr, encodeCmr } from '../cmr-data'

const base = { name: 'Popescu Ion', county: 'Cluj', specialities: ['Cardiologie'], practiceUntil: '2027-03-31', hasPracticeRight: true as const, hasRestrictions: false as const }

test('a verification round-trips through its stored string and drops separators typed by the team', () => {
  const v = { name: 'Popescu | Ion', county: 'Cluj', specialities: ['Cardiologie', 'Medicină internă'], practiceUntil: '2027-03-31', parafa: 'A12345', verifiedAt: '2026-10-28T10:00:00.000Z', verifiedBy: 'Echipa' }
  const [back] = decodeCmr([encodeCmr(v)])
  assert.equal(back?.name, 'Popescu Ion')
  assert.deepEqual(back?.specialities, ['Cardiologie', 'Medicină internă'])
  assert.equal(back?.verifiedAt, '2026-10-28')
  assert.deepEqual(decodeCmr(['ANRE|x|1|2026-01-01|2027-01-01|2026-01-01|a|b']), [])
  assert.deepEqual(decodeCmr('nope'), [])
})

test('a verification stops counting on the day after the practice right ends', () => {
  const [v] = decodeCmr([encodeCmr({ name: 'A B', county: '', specialities: [], practiceUntil: '2026-12-31', parafa: '', verifiedAt: '2026-10-01', verifiedBy: 'x' })])
  assert.equal(activeCmr([v!], new Date('2026-12-31T12:00:00Z')).length, 1)
  assert.equal(activeCmr([v!], new Date('2027-01-01T00:00:00Z')).length, 0)
})

test('input needs a practice right, no restrictions and a real date', () => {
  assert.equal(cmrInput.safeParse(base).success, true)
  assert.equal(cmrInput.safeParse({ ...base, hasPracticeRight: false }).success, false)
  assert.equal(cmrInput.safeParse({ ...base, hasRestrictions: true }).success, false)
  assert.equal(cmrInput.safeParse({ ...base, practiceUntil: '31.03.2027' }).success, false)
  assert.equal(cmrInput.safeParse({ ...base, parafa: 'A-1' }).success, false)
  assert.equal(cmrInput.safeParse({ ...base, extra: 1 }).success, false)
})
