import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT_CATALOG, contentMediaRefs, effectiveContentLayout, isContentCollection, parseContentLayout } from '../blocks'

const IMG = 'img_0123456789'
const none = new Set<string>()
const node = (id: string, type: string, props: Record<string, unknown> = {}, slots?: Record<string, unknown[]>) => ({ id, type, props, ...(slots ? { slots } : {}) })
const parse = (blocks: unknown[], media: string[] = []) => parseContentLayout({ version: 2, blocks }, new Set(media))

test('catalog: unique types, every select has options, containers have slots', () => {
  const types = CONTENT_CATALOG.map((b) => b.type)
  assert.equal(new Set(types).size, types.length)
  for (const b of CONTENT_CATALOG) for (const f of b.fields) if (f.kind === 'select') assert.ok(f.options?.length, `${b.type}.${f.key}`)
  for (const t of ['hero', 'image', 'gallery', 'faq_list', 'price_table', 'areas']) assert.ok(types.includes(t), t)
})
test('content collections', () => { assert.equal(isContentCollection('preturi'), true); assert.equal(isContentCollection('servicii'), true); assert.equal(isContentCollection('companii'), false); assert.equal(isContentCollection('pagini'), false) })

test('a valid page parses; empty values are dropped', () => {
  const r = parse([node('a1', 'hero', { title: 'Preț rigips', subtitle: '', bg: 'dark' }), node('a2', 'price_table', { title: 'Prețuri' }), node('a3', 'faq_list', {}), node('a4', 'areas', { areas: ['București', 'Cluj'] })])
  assert.ok(r.ok)
  if (r.ok) { assert.equal(r.layout.blocks.length, 4); assert.deepEqual(r.layout.blocks[0]!.props, { title: 'Preț rigips', bg: 'dark' }) }
})
test('firm-only blocks are refused here (services, projects, reviews, buttons)', () => {
  for (const t of ['services', 'projects', 'reviews', 'buttons', 'faq', 'cta']) assert.equal(parse([node('b1', t)]).ok, false, t)
})
test('unknown props, bad select values, duplicate ids are refused', () => {
  assert.equal(parse([node('c1', 'hero', { evil: '<script>' })]).ok, false)
  assert.equal(parse([node('c1', 'hero', { bg: 'rainbow' })]).ok, false)
  assert.equal(parse([node('c1', 'text', { body: 'a' }), node('c1', 'text', { body: 'b' })]).ok, false)
})
test('images must belong to the entry', () => {
  assert.equal(parse([node('d1', 'image', { image: IMG })]).ok, false)
  assert.equal(parse([node('d1', 'image', { image: IMG })], [IMG]).ok, true)
  assert.equal(parse([node('d1', 'gallery', { images: [IMG, 'img_9999999999'] })], [IMG]).ok, false)
  const r = parse([node('d1', 'hero', { image: IMG }), node('d2', 'gallery', { images: [IMG] })], [IMG])
  assert.ok(r.ok); if (r.ok) assert.deepEqual(contentMediaRefs(r.layout), [IMG])
})
test('containers nest blocks; a section cannot sit inside another container', () => {
  assert.equal(parse([node('e1', 'columns', { ratio: '50-50' }, { left: [node('e2', 'text', { body: 'x' })], right: [node('e3', 'price_table')] })]).ok, true)
  assert.equal(parse([node('e1', 'columns', {}, { left: [node('e2', 'section', {}, { content: [] })], right: [] })]).ok, false)
})
test('stored layouts read back; damaged or missing storage becomes an empty page', () => {
  const stored = { version: 2, blocks: [node('f1', 'hero', { image: IMG })] }
  assert.equal(effectiveContentLayout(stored).blocks.length, 1)
  assert.equal(effectiveContentLayout(null).blocks.length, 0)
  assert.equal(effectiveContentLayout({ version: 2, blocks: [node('f1', 'nope')] }).blocks.length, 0)
  assert.equal(effectiveContentLayout('junk').blocks.length, 0)
  assert.ok(none.size === 0)
})
