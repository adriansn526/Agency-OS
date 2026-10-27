import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SITUATIONS } from '../index'
import { validateSituation } from '../seed'
import { GUIDES } from '../../guides/index'
import { situationSlugOk } from '../../glossary/validate'
import { publicPathOf } from '../../content/paths'
import { CONTENT_CATALOG } from '../../content/blocks'

test('every situation is valid and its slug is <categorie>--<situație>', () => {
  for (const s of SITUATIONS) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, s.categorie)) }
  assert.equal(new Set(SITUATIONS.map((s) => s.slug)).size, SITUATIONS.length)
})
test('a situation has the firms, the other situations and the form; the guide pages keep the links to guides', () => {
  for (const s of SITUATIONS) {
    const types = s.blocks.map((b) => b.type)
    for (const t of ['firms_list', 'situation_links', 'guide_links', 'price_links', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'))
  }
})
test('one page per group of terms: no term is served by a situation and by a guide', () => {
  const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of SITUATIONS) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
})
test('situationSlugOk rejects a slug of another category, an empty or odd situation part', () => {
  assert.ok(!situationSlugOk('acoperisuri--baie', 'hidroizolatii')); assert.ok(!situationSlugOk('hidroizolatii--', 'hidroizolatii'))
  assert.ok(!situationSlugOk('hidroizolatii--Baie', 'hidroizolatii')); assert.ok(!situationSlugOk('hidroizolatii--a--b', 'hidroizolatii')); assert.ok(situationSlugOk('hidroizolatii--fundatie-subsol', 'hidroizolatii'))
})
test('public path of a situation is under its category; other entries are unchanged', () => {
  assert.equal(publicPathOf('servicii', 'hidroizolatii--baie', { tip: 'situatie', parinte: 'hidroizolatii' }), '/lucrari/hidroizolatii/baie')
  assert.equal(publicPathOf('servicii', 'hidroizolatii', { tip: 'categorie' }), '/lucrari/hidroizolatii')
  assert.equal(publicPathOf('preturi', 'zugravit', {}), '/preturi/zugravit'); assert.equal(publicPathOf('ghiduri', 'igrasie', {}), '/ghiduri/igrasie')
})
test('the situation_links block is in the catalog', () => { assert.ok(CONTENT_CATALOG.some((d) => d.type === 'situation_links')) })
