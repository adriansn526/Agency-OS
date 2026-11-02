import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanTerms, MAX_TERMS } from '../keyword-metrics'

test('cleanTerms trims, dedupes case-insensitively, drops junk and caps the count', () => {
  assert.deepEqual(cleanTerms(['  furt   calificat ', 'Furt calificat', 'a', '', null, 5 as any]), ['furt calificat', '5'].filter(x => x.length >= 2))
  assert.equal(cleanTerms(Array.from({ length: 30 }, (_, i) => `termen ${i}`)).length, MAX_TERMS)
  assert.equal(cleanTerms('x').length, 0)
  assert.equal(cleanTerms(['x'.repeat(200)])[0]!.length, 80)
})
