import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRICE_PAGES } from '../pages'
import { PLACEHOLDER, priceSeedProblems, skeleton } from '../seed'

test('price page list is consistent', () => assert.deepEqual(priceSeedProblems(), []))
test('first wave (31), the pages for the services of the owned sites (6) and the pages for the gaps against the competitor (19)', () => assert.equal(PRICE_PAGES.length, 56))
test('problems are reported: duplicate slug, bad slug, unknown category', () => {
  const p = PRICE_PAGES[0]!
  const probs = priceSeedProblems([p, p, { ...p, slug: 'Bad Slug' }, { ...p, slug: 'ok-slug', serviciu: 'nu-exista' }])
  assert.equal(probs.length, 3)
})
test('every skeleton carries the placeholder marker on its first line', () => {
  for (const p of PRICE_PAGES) assert.ok(skeleton(p).split('\n')[0]!.startsWith(PLACEHOLDER))
})
