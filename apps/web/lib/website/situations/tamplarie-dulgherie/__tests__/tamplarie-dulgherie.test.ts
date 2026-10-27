import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { SITUATIONS } from '../../index'
import { validateContent } from '../../../services/seed'
import { tamplarieDulgherie } from '../../../services/tamplarie-dulgherie'
import { usiInterior } from '../usi-interior'
import { usiExteriorIntrare } from '../usi-exterior-intrare'
import { usiGaraj } from '../usi-garaj'

const ALL = [usiInterior, usiExteriorIntrare, usiGaraj]
const mine = new Set(ALL.map((s) => s.slug))
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

test('every tamplarie-dulgherie situation is valid and its slug is tamplarie-dulgherie--<situație>', () => {
  for (const s of ALL) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, 'tamplarie-dulgherie'), s.slug); assert.equal(s.categorie, 'tamplarie-dulgherie') }
  assert.equal(new Set(ALL.map((s) => s.slug)).size, ALL.length)
})
test('block ids are unique, "situations" is not used, firms come before the CTA, required blocks exist', () => {
  for (const s of ALL) {
    const ids = s.blocks.map((b) => b.id), types = s.blocks.map((b) => b.type)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
    assert.equal(types[0], 'hero')
    assert.ok(types.indexOf('firms_list') >= 0 && types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    for (const t of ['hero', 'facts', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(s.intrebari.length >= 5, s.slug)
    const cta = s.blocks.find((b) => b.type === 'request_cta')!
    assert.ok(JSON.stringify(cta).includes('buttonLabel'), s.slug)
  }
})
test('no invented amounts and no placeholder', () => {
  for (const s of ALL) {
    const text = JSON.stringify(s.blocks) + s.intrebari.join(' ')
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
})
test('one page per group of terms: no term in two tamplarie-dulgherie situations, in a guide or in another situation', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const o of SITUATIONS) if (!mine.has(o.slug)) for (const k of o.sinonime) seen.set(norm(k), o.slug)
  for (const s of ALL) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
  for (const k of tamplarieDulgherie.sinonime) { const o = seen.get(norm(k)); assert.ok(!o, `pilon: „${k}” este în ${o}`) }
})
test('SEO title and description are within limits', () => {
  for (const s of ALL) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: ${s.seoDescription.length}`) }
})
test('pillar: valid hub without prices, with the required blocks and no amounts or fixed durations', () => {
  assert.deepEqual(validateContent(tamplarieDulgherie), [])
  assert.equal(tamplarieDulgherie.hub, true)
  assert.deepEqual(tamplarieDulgherie.preturi, [])
  const types = tamplarieDulgherie.blocks.map((b) => b.type)
  assert.equal(types[0], 'hero')
  assert.ok(!types.includes('price_table'))
  for (const t of ['situation_links', 'guide_links', 'price_links', 'faq_list', 'request_form']) assert.ok(types.includes(t), t)
  assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'))
  const ids = tamplarieDulgherie.blocks.map((b) => b.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes('situations'))
  assert.ok(tamplarieDulgherie.intrebari.length >= 6)
  const text = JSON.stringify(tamplarieDulgherie)
  assert.ok(!text.includes('[DE COMPLETAT]'))
  for (const re of [/\d\s*(lei|ron|€|euro)/i, /\d[\d.,]*\s*[–-]?\s*[\d.,]*\s*(lei|ron|€|euro|eur)\b/i, /\d+\s*[–-]\s*\d+\s*(ani|zile|ore|mp|ml|%)/i, /\d+\s?%/, /\b\d+\s*(ani|zile|ore)\b/i]) assert.ok(!re.test(text), String(re))
})
