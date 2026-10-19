import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BLOCK_TYPES, canonical, CATALOG, defaultLayout, effectiveLayout, MAX_BLOCKS, parseLayout } from '../blocks'

const ok = (raw: unknown) => { const r = parseLayout(raw); assert.ok(r.ok, JSON.stringify(r)); return (r as { ok: true; layout: ReturnType<typeof defaultLayout> }).layout }
const bad = (raw: unknown) => { const r = parseLayout(raw); assert.equal(r.ok, false, JSON.stringify(raw)); return (r as { ok: false; issues: string[] }).issues }

test('catalog is consistent: unique types, hero locked and first, field keys unique per block', () => {
  assert.equal(new Set(BLOCK_TYPES).size, BLOCK_TYPES.length); assert.equal(CATALOG[0]!.type, 'hero'); assert.equal(CATALOG[0]!.locked, true)
  for (const b of CATALOG) assert.equal(new Set(b.fields.map((f) => f.key)).size, b.fields.length, b.type)
})
test('the default layout is valid and canonical', () => {
  const d = defaultLayout()
  assert.deepEqual(ok(d), d); assert.equal(d.blocks[0]!.type, 'hero'); assert.ok(d.blocks.every((b) => b.enabled))
})
test('hero is forced first and enabled; empty values are dropped; booleans false mean automatic', () => {
  const l = ok({ blocks: [{ type: 'services', enabled: false, props: { title: '  Ce facem  ', max: 6 } }, { type: 'hero', enabled: false, props: { headline: 'Titlu', subheadline: '', hidePhone: false, hideLogo: true } }] })
  assert.deepEqual(l.blocks.map((b) => b.type), ['hero', 'services'])
  assert.deepEqual(l.blocks[0], { type: 'hero', enabled: true, props: { headline: 'Titlu', hideLogo: true } })
  assert.deepEqual(l.blocks[1], { type: 'services', enabled: false, props: { title: 'Ce facem', max: 6 } })
  assert.deepEqual(ok([]).blocks.map((b) => b.type), ['hero']) // a bare array is accepted; hero is added
})
test('rejects unknown types, duplicates, extra props, wrong types, over-long text and too many items', () => {
  assert.match(bad({ blocks: [{ type: 'script', props: {} }] })[0]!, /tip necunoscut/)
  assert.match(bad({ blocks: [{ type: 'steps', props: {} }, { type: 'steps', props: {} }] })[0]!, /de două ori/)
  assert.ok(bad({ blocks: [{ type: 'steps', props: { html: '<b>x</b>' } }] }).length)
  assert.ok(bad({ blocks: [{ type: 'services', props: { max: 'mulți' } }] }).length)
  assert.ok(bad({ blocks: [{ type: 'services', props: { max: 2 } }] }).length)           // below the minimum
  assert.ok(bad({ blocks: [{ type: 'services', props: { title: 'x'.repeat(101) } }] }).length)
  assert.ok(bad({ blocks: [{ type: 'why', props: { reasons: new Array(4).fill({ title: 'a', text: 'b' }) } }] }).length)
  assert.ok(bad({ blocks: [{ type: 'faq', props: { items: [{ q: 'întrebare', a: 'răspuns', extra: 1 }] } }] }).length)
  assert.ok(bad({ blocks: [{ type: 'steps', enabled: 'da', props: {} }] }).length)
  assert.ok(bad({ blocks: new Array(MAX_BLOCKS + 1).fill({ type: 'steps' }) }).length)
  for (const raw of [null, undefined, 'x', 42, {}, { blocks: 'nu' }]) assert.ok(bad(raw).length)
})
test('text is kept as plain text (markup is data, never interpreted here)', () => {
  const l = ok({ blocks: [{ type: 'about', props: { text: '<script>alert(1)</script> Firma noastră' } }] })
  assert.equal(l.blocks[1]!.props.text, '<script>alert(1)</script> Firma noastră') // rendered by React as text; the length limit is the only rule
})
test('areas, faq and reasons round-trip', () => {
  const raw = { blocks: [{ type: 'areas', props: { areas: ['Târgu Mureș', 'Ungheni'] } }, { type: 'faq', props: { items: [{ q: 'Cât costă?', a: 'Depinde de lucrare.' }] } }, { type: 'why', props: { reasons: [{ title: 'Rapid', text: 'Răspundem în aceeași zi.' }] } }] }
  const l = ok(raw); assert.equal(canonical(ok(l)), canonical(l)) // idempotent
})
test('effective layout falls back to the default for missing or damaged storage', () => {
  assert.equal(canonical(effectiveLayout(null)), canonical(defaultLayout()))
  assert.equal(canonical(effectiveLayout({ blocks: [{ type: 'nope' }] })), canonical(defaultLayout()))
  assert.equal(canonical(effectiveLayout('garbage')), canonical(defaultLayout()))
})

test('media_text (image + text): valid choices are kept; a foreign image, a URL or an unknown choice is rejected', async () => {
  const { parseLayout } = await import('../blocks')
  const own = new Set(['cmvmedia0001abc'])
  const ok = parseLayout([{ type: 'hero' }, { type: 'media_text', props: { image: 'cmvmedia0001abc', eyebrow: 'Despre noi', title: 'Echipa', text: 'Text', buttonLabel: 'Vezi', buttonTarget: 'servicii', side: 'right', decor: 'frame', bg: 'light' } }, { type: 'media_text_alt', props: { side: '' } }], { mediaIds: own })
  assert.ok(ok.ok); if (ok.ok) { assert.equal(ok.layout.blocks[1]!.props.side, 'right'); assert.deepEqual(ok.layout.blocks[2]!.props, {}) }
  for (const props of [{ image: 'cmvother0000abc' }, { image: 'https://evil.example/x.png' }, { buttonTarget: 'https://evil.example' }, { side: 'up' }, { decor: 'glow' }, { text: 'x'.repeat(801) }, { extra: 1 }]) assert.equal(parseLayout([{ type: 'hero' }, { type: 'media_text', props }], { mediaIds: own }).ok, false, JSON.stringify(props))
  assert.ok(parseLayout([{ type: 'hero' }, { type: 'media_text', props: { image: 'cmvother0000abc' } }]).ok)   // reading a stored layout back does not check ownership
})

test('the default layout does not include the statistics strip, but it can still be added', async () => {
  const { defaultLayout, parseLayout } = await import('../blocks')
  assert.deepEqual(defaultLayout().blocks.map((b) => b.type), ['hero', 'services', 'why', 'projects', 'reviews', 'steps', 'cta'])
  assert.ok(parseLayout([{ type: 'hero' }, { type: 'trust' }, { type: 'services' }]).ok)
})
