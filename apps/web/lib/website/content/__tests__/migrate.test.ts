import { test } from 'node:test'
import assert from 'node:assert/strict'
import { upgradeBlocks } from '../migrate'
import { parseContentLayout } from '../blocks'
import { priceTemplate, serviceTemplate } from '../templates'

const n = (id: string, type: string, props: Record<string, unknown> = {}) => ({ id, type, props })
const types = (b: { type: string }[] | null) => (b ?? []).map((x) => x.type)

test('old layout: hero gets the ticks, the call-to-action banner becomes firms list + form', () => {
  const out = upgradeBlocks([n('hero', 'hero', { buttonLabel: 'Cere' }), n('t', 'text', { body: 'x' }), n('cta', 'request_cta', { title: 'Cere oferte pentru X', text: 'y' })], 'servicii')
  assert.deepEqual(types(out), ['hero', 'text', 'firms_list', 'request_form'])
  assert.deepEqual(out![0]!.props.checks, ['Gratuit', 'Fără obligații', 'Firme verificate'])
  assert.deepEqual(out![3]!.props, {})
})
test('price pages get the form but no firms list; pages without a banner get the blocks at the end', () => {
  assert.deepEqual(types(upgradeBlocks([n('t', 'text', { body: 'x' })], 'preturi')), ['text', 'request_form'])
  assert.deepEqual(types(upgradeBlocks([n('t', 'text', { body: 'x' })], 'servicii')), ['text', 'firms_list', 'request_form'])
})
test('idempotent: a migrated page and an empty page change nothing; a hero without button gets no ticks', () => {
  const once = upgradeBlocks([n('hero', 'hero', { buttonLabel: 'Cere' }), n('cta', 'request_cta', {})], 'servicii')!
  assert.equal(upgradeBlocks(once, 'servicii'), null)
  assert.equal(upgradeBlocks([], 'servicii'), null)
  assert.equal(upgradeBlocks([n('hero', 'hero', {}), n('f', 'firms_list'), n('q', 'request_form')], 'servicii'), null)
})
test('ids stay unique and the result is a valid layout; the templates already carry the new blocks', () => {
  const out = upgradeBlocks([n('form', 'text', { body: 'x' }), n('firms', 'text', { body: 'y' })], 'servicii')!
  assert.equal(new Set(out.map((b) => b.id)).size, out.length)
  assert.ok(parseContentLayout({ version: 2, blocks: out }, new Set()).ok)
  assert.equal(upgradeBlocks(serviceTemplate().blocks, 'servicii'), null)
  assert.equal(upgradeBlocks(priceTemplate().blocks, 'preturi'), null)
})
