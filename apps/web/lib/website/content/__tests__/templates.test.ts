import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT_CATALOG, contentReady, layoutHasPlaceholder, parseContentLayout, PLACEHOLDER } from '../blocks'
import { PRICE_FAQ, priceTemplate, serviceTemplate } from '../templates'

test('both templates are valid layouts of the content catalog', () => {
  for (const l of [priceTemplate({ summary: 'Rezumat' }), priceTemplate(), serviceTemplate({ summary: 'x' }), serviceTemplate()]) {
    const r = parseContentLayout(l, new Set())
    assert.ok(r.ok, r.ok ? '' : r.issues.join('; '))
  }
  assert.ok(CONTENT_CATALOG.some((b) => b.type === 'price_links'))
})
test('templates are not ready until the intro is written (the marker blocks them)', () => {
  assert.equal(layoutHasPlaceholder(priceTemplate()), true)
  assert.equal(contentReady(priceTemplate(), null), false)
  const written = priceTemplate(); written.blocks = written.blocks.map((b) => (b.id === 'intro' ? { ...b, props: { body: 'Intro scris.' } } : b))
  assert.equal(contentReady(written, '[DE COMPLETAT] schelet'), true) // with blocks the body does not matter
})
test('without blocks the body decides', () => {
  const none = { version: 2 as const, blocks: [] }
  assert.equal(contentReady(none, null), false); assert.equal(contentReady(none, `${PLACEHOLDER} x`), false); assert.equal(contentReady(none, 'Text real'), true)
})
test('marker inside nested slots and list items is found', () => {
  const l = { version: 2 as const, blocks: [{ id: 's', type: 'section', props: {}, slots: { content: [{ id: 'c', type: 'cards', props: { items: [{ title: 'a', text: `${PLACEHOLDER} b` }] } }] } }] }
  assert.equal(layoutHasPlaceholder(l), true)
})
test('template FAQ lines are "question | answer" with a single separator', () => { for (const f of PRICE_FAQ) assert.equal(f.split('|').length, 2) })
