import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { SITUATIONS } from '../../index'
import { izolatieFatadaTermosistem } from '../izolatie-fatada-termosistem'
import { izolatiePodSpumaPoliuretanica } from '../izolatie-pod-spuma-poliuretanica'
import { izolatiePeretiInterior } from '../izolatie-pereti-interior'
import { izolatiiTermice } from '../../../services/izolatii-termice'
import { polistirenSauVataBazaltica } from '../../../guides/polistiren-sau-vata-bazaltica'

const ALL = [izolatieFatadaTermosistem, izolatiePodSpumaPoliuretanica, izolatiePeretiInterior]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MONEY = /\d\s*(lei|ron|€|euro)/i
const pages = [
  ...ALL.map((s) => ({ id: s.slug, terms: s.sinonime, text: JSON.stringify(s.blocks) + s.intrebari.join(' ') })),
  { id: izolatiiTermice.slug, terms: izolatiiTermice.sinonime, text: JSON.stringify(izolatiiTermice.blocks) + izolatiiTermice.intrebari.join(' ') },
  { id: polistirenSauVataBazaltica.slug, terms: polistirenSauVataBazaltica.keywords, text: JSON.stringify(polistirenSauVataBazaltica.blocks) + polistirenSauVataBazaltica.intrebari.join(' ') },
]

test('every izolatii-termice situation is valid and its slug is izolatii-termice--<situație>', () => {
  for (const s of ALL) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, 'izolatii-termice'), s.slug); assert.equal(s.categorie, 'izolatii-termice') }
  assert.equal(new Set(ALL.map((s) => s.slug)).size, ALL.length)
})
test('block ids are unique, "situations" is not used, firms come before the CTA, required blocks exist', () => {
  for (const s of ALL) {
    const ids = s.blocks.map((b) => b.id), types = s.blocks.map((b) => b.type)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
    assert.ok(types.indexOf('firms_list') >= 0 && types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    assert.equal(types[0], 'hero')
    for (const t of ['hero', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(s.intrebari.length >= 5, s.slug)
  }
})
test('no invented amounts and no placeholder (situations, pillar, guide)', () => {
  for (const p of pages) { assert.ok(!MONEY.test(p.text), `${p.id}: sumă`); assert.ok(!p.text.includes('[DE COMPLETAT]'), p.id) }
})
test('one page per group of terms: no term in two of our pages or in an existing guide/situation', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of SITUATIONS) if (!ALL.some((a) => a.slug === s.slug)) for (const k of s.sinonime) seen.set(norm(k), s.slug)
  for (const p of pages) for (const k of p.terms) { const o = seen.get(norm(k)); assert.ok(!o || o === p.id, `„${k}” este în ${o} și în ${p.id}`); seen.set(norm(k), p.id) }
})
test('SEO title and description are within limits', () => {
  for (const s of [...ALL, izolatiiTermice, polistirenSauVataBazaltica]) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: ${s.seoDescription.length}`) }
})
test('pillar: hub, no prices, hero first, situations card, links, faq, form', () => {
  const types = izolatiiTermice.blocks.map((b) => b.type), ids = izolatiiTermice.blocks.map((b) => b.id)
  assert.equal(izolatiiTermice.hub, true)
  assert.deepEqual(izolatiiTermice.preturi, [])
  assert.equal(types[0], 'hero')
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes('situations'))
  assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'))
  for (const t of ['situation_links', 'guide_links', 'price_links', 'steps', 'faq_list', 'firms_list', 'request_form']) assert.ok(types.includes(t), t)
  assert.ok(izolatiiTermice.intrebari.length >= 6)
})
test('guide: serviciu, >=5 questions, hero first, request form, unique ids', () => {
  const g = polistirenSauVataBazaltica, types = g.blocks.map((b) => b.type), ids = g.blocks.map((b) => b.id)
  assert.equal(g.serviciu, 'izolatii-termice')
  assert.ok(g.intrebari.length >= 5)
  assert.equal(types[0], 'hero')
  assert.ok(types.includes('request_form'))
  assert.equal(new Set(ids).size, ids.length)
})
