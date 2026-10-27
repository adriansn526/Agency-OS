import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GUIDES } from '../index'
import { validateGuide } from '../seed'
import { CATEGORIES } from '../../glossary/taxonomy'
import { EXTRA_CATEGORY_SLUGS } from '../../services/categories'

test('every guide is valid (blocks, SEO lengths, FAQ format, no unwritten marker)', () => { for (const g of GUIDES) assert.deepEqual(validateGuide(g), [], g.slug) })
test('six guides for the hub, unique slugs, all in hidroizolatii', () => {
  assert.equal(GUIDES.length, 6); assert.equal(new Set(GUIDES.map((g) => g.slug)).size, 6)
  for (const g of GUIDES) assert.equal(g.serviciu, 'hidroizolatii')
})
test('the guides belong to categories that exist', () => { const ok = new Set([...CATEGORIES.map((c) => c.slug), ...EXTRA_CATEGORY_SLUGS]); for (const g of GUIDES) assert.ok(ok.has(g.serviciu), g.slug) })
test('one page per group of terms: no search term is served by two guides', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of [g.keyword, ...g.keywords]) { const key = k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); if (seen.has(key) && seen.get(key) !== g.slug) assert.fail(`„${k}” este în ${seen.get(key)} și în ${g.slug}`); seen.set(key, g.slug) }
})
test('a guide without the form, the FAQ or with a too long SEO title is reported', () => {
  const g = GUIDES[0]!
  assert.ok(validateGuide({ ...g, blocks: g.blocks.filter((b) => b.type !== 'request_form') }).some((x) => x.includes('request_form')))
  assert.ok(validateGuide({ ...g, seoTitle: 'x'.repeat(61) }).some((x) => x.includes('titlul SEO')))
  assert.ok(validateGuide({ ...g, intrebari: ['fără separator'] }).length > 0)
})
test('no invented prices: guides state no lei amounts', () => {
  for (const g of GUIDES) assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(JSON.stringify(g.blocks) + g.intrebari.join(' ')), g.slug)
})
