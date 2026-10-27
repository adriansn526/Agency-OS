import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SERVICE_CONTENT, NEW_CATEGORIES } from '../index'
import { validateContent } from '../seed'
import { CATEGORIES, GROUPS } from '../../glossary/taxonomy'

test('pilot pages are valid blocks, have no unfinished marker and keep SEO fields in range', () => {
  for (const c of SERVICE_CONTENT) assert.deepEqual(validateContent(c), [], c.slug)
})
test('pilot pages have prices, FAQ and the full section order', () => {
  for (const c of SERVICE_CONTENT) {
    if (!c.hub) assert.ok(c.preturi.length >= 8, c.slug)
    assert.ok(c.intrebari.length >= 6, c.slug)
    const types = c.blocks.map((b) => b.type)
    // a hub pillar has no price table of its own: it leads to the guides and to the dedicated price pages
    for (const t of c.hub ? ['hero', 'facts', 'steps', 'faq_list', 'firms_list', 'request_form', 'guide_links', 'situation_links', 'price_links'] : ['hero', 'facts', 'steps', 'price_table', 'faq_list', 'firms_list', 'request_form']) assert.ok(types.includes(t), `${c.slug}: ${t}`)
    if (c.hub) assert.ok(!types.includes('price_table'), `${c.slug}: a hub pillar does not repeat the prices`)
    assert.equal(types[0], 'hero')
    assert.equal(new Set(c.blocks.map((b) => b.id)).size, c.blocks.length)
  }
})
test('new categories: unique, not already built in, known groups', () => {
  const slugs = NEW_CATEGORIES.map((c) => c.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  for (const c of NEW_CATEGORIES) { assert.ok(!CATEGORIES.some((x) => x.slug === c.slug), c.slug); assert.ok(GROUPS.some((g) => g.slug === c.group), c.group) }
})
