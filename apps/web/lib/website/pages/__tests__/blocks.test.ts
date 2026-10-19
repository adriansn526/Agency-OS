import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countBlocks, mediaRefs, parsePageLayout, PAGE_CATALOG, LIMITS, type PageNode } from '../blocks'

const M1 = 'cmvmedia0001abc', M2 = 'cmvmedia0002abc'
const media = new Set([M1, M2])
const n = (id: string, type: string, props: Record<string, unknown> = {}, slots?: Record<string, PageNode[]>): PageNode => ({ id, type, props, ...(slots ? { slots } : {}) })
const parse = (blocks: unknown) => parsePageLayout({ version: 2, blocks }, { mediaIds: media })

test('a normal page is accepted and canonicalised (empty values dropped, slots completed)', () => {
  const r = parse([n('a', 'heading', { text: 'Despre noi', level: 'h2', align: '' }), n('b', 'text', { body: 'Paragraf' }), n('c', 'image', { image: M1, alt: 'x' }), n('d', 'columns', { ratio: '33-67' }, { left: [n('e', 'text', { body: 'st' })] })])
  assert.ok(r.ok); if (!r.ok) return
  assert.deepEqual(r.layout.blocks[0]!.props, { text: 'Despre noi', level: 'h2' })
  assert.deepEqual(Object.keys(r.layout.blocks[3]!.slots!), ['left', 'right']); assert.deepEqual(r.layout.blocks[3]!.slots!.right, [])
  assert.equal(countBlocks(r.layout), 5); assert.deepEqual(mediaRefs(r.layout), [M1])
})
test('blocks can repeat and be in any order (unlike the home page)', () => assert.ok(parse([n('a', 'cta'), n('b', 'cta'), n('c', 'heading', { text: 'x' }), n('d', 'cta')]).ok))
test('the same catalog block can be reused from the home page (services, projects, reviews, faq, cta)', () => {
  for (const t of ['services', 'projects', 'reviews', 'faq', 'cta']) assert.ok(PAGE_CATALOG.some((b) => b.type === t), t)
  assert.equal(PAGE_CATALOG.some((b) => b.type === 'hero'), false)   // the banner belongs to the home page
})
test('nesting: section > columns > blocks fits the depth limit; deeper or wrong containers are refused', () => {
  assert.ok(parse([n('s', 'section', { bg: 'dark' }, { content: [n('c', 'columns', {}, { left: [n('t', 'text', { body: 'x' })], right: [n('h', 'heading', { text: 'y' })] })] })]).ok)
  assert.equal(parse([n('c', 'columns', {}, { left: [n('s', 'section', {}, { content: [] })] })]).ok, false)               // section only at the top
  assert.equal(parse([n('c', 'columns', {}, { left: [n('c2', 'columns', {}, {})] })]).ok, false)                           // columns in columns
  assert.equal(parse([n('s', 'section', {}, { content: [n('c', 'columns', {}, { left: [n('c3', 'columns', {}, {})] })] })]).ok, false)
})
test('hostile or malformed content is rejected', () => {
  const bad: unknown[] = [
    [n('a', 'script', { src: 'https://evil.example' })], [n('a', 'text', { body: 'x', dangerouslySetInnerHTML: { __html: '<img onerror=1>' } })], [n('a', 'heading', { text: 'x'.repeat(500) })],
    [n('a', 'heading', { level: 'h1' })], [n('a', 'buttons', { primaryLabel: 'Click', primaryTarget: 'https://evil.example' })], [n('a', 'buttons', { primaryTarget: 'javascript:alert(1)' })],
    [n('a', 'image', { image: 'https://evil.example/x.png' })], [n('a', 'image', { image: 'cmvother0000abc' })],                            // a URL, or another firm's media
    [n('a', 'gallery', { images: [M1, 'cmvother0000abc'] })], [n('a', 'gallery', { images: Array.from({ length: 13 }, () => M1) })],
    [n('a', 'text', { body: 'x' }, { left: [n('b', 'text')] })],                                                                        // slots on a leaf
    [n('a', 'columns', {}, { middle: [n('b', 'text')] })],                                                                              // unknown slot
    [n('dup', 'text'), n('dup', 'text')], [n('bad id!', 'text')], [{ type: 'text' }], [{ id: 'a' }], ['x'], [null],
    [n('a', 'cards', { items: [{ title: 'x', text: 'y', extra: 'z' }] })], [n('a', 'cards', { items: Array.from({ length: 7 }, () => ({ title: 'x', text: 'y' })) })],
    Array.from({ length: LIMITS.maxBlocks + 1 }, (_, i) => n(`b${i}`, 'text')),
  ]
  for (const b of bad) assert.equal(parse(b).ok, false, JSON.stringify(b).slice(0, 90))
  for (const raw of [null, 'x', 5, { version: 1, blocks: [] }, { version: 2 }, { version: 2, blocks: 'x' }, { blocks: [] }]) assert.equal(parsePageLayout(raw, { mediaIds: media }).ok, false, JSON.stringify(raw))
  assert.equal(parse(Array.from({ length: 45 }, (_, i) => n(`c${i}`, 'text', { body: 'z'.repeat(3000) }))).ok, false)   // too big overall
})
test('every problem is listed at once', () => {
  const r = parse([n('a', 'script'), n('b', 'heading', { level: 'h9' }), n('c', 'image', { image: 'cmvother0000abc' })])
  assert.ok(!r.ok); if (!r.ok) assert.ok(r.issues.length >= 3)
})

test('media_text on a custom page: repeatable, the image must be the firm\'s own', () => {
  assert.ok(parse([n('a', 'media_text', { image: M1, title: 'Unu', side: 'left' }), n('b', 'media_text', { image: M2, title: 'Doi', side: 'right' }), n('c', 'section', {}, { content: [n('d', 'media_text', { title: 'în secțiune' })] })]).ok)
  assert.equal(parse([n('a', 'media_text', { image: 'cmvother0000abc' })]).ok, false)
  assert.deepEqual(mediaRefs((parse([n('a', 'media_text', { image: M1 })]) as { ok: true; layout: never }).layout), [M1])
})
