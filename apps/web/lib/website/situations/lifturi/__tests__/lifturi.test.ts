import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { SITUATIONS } from '../../index'
import { lifturi } from '../../../services/lifturi'
import { liftCasaExterior } from '../lift-casa-exterior'
import { liftBlocDizabilitati } from '../lift-bloc-dizabilitati'

const CAT = 'lifturi'
const ALL = [liftCasaExterior, liftBlocDizabilitati]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const own = new Set(ALL.map((s) => s.slug))

test('every lifturi situation is valid and its slug is lifturi--<situație>', () => {
  for (const s of ALL) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, CAT), s.slug); assert.equal(s.categorie, CAT) }
  assert.equal(new Set(ALL.map((s) => s.slug)).size, ALL.length)
})
test('block ids are unique, "situations" is not used, firms come before the CTA, required blocks exist', () => {
  for (const s of ALL) {
    const ids = s.blocks.map((b) => b.id), types = s.blocks.map((b) => b.type)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
    assert.ok(types.indexOf('firms_list') >= 0 && types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    for (const t of ['hero', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(s.intrebari.length >= 5, s.slug)
    const cta = s.blocks.find((b) => b.type === 'request_cta')!
    for (const k of ['title', 'text', 'buttonLabel']) assert.ok(String((cta.props as Record<string, unknown>)[k] ?? '').length > 0, `${s.slug}: cta ${k}`)
  }
})
test('no invented amounts and no placeholder', () => {
  for (const s of ALL) {
    const text = JSON.stringify(s.blocks) + s.intrebari.join(' ')
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
})
test('one page per group of terms: no term in two pages of mine, in a guide or in an existing situation', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of SITUATIONS) if (!own.has(s.slug)) for (const k of s.sinonime) seen.set(norm(k), s.slug)
  for (const s of [...ALL, lifturi]) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
})
test('SEO title and description are within limits', () => {
  for (const s of ALL) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: ${s.seoDescription.length}`) }
  assert.ok(lifturi.seoTitle.length <= 60 && lifturi.seoDescription.length <= 160)
})
test('pillar lifturi: hub, no prices, required blocks, no amounts or fixed periods', () => {
  const p = lifturi, types = p.blocks.map((b) => b.type), ids = p.blocks.map((b) => b.id)
  assert.equal(p.hub, true); assert.deepEqual(p.preturi, []); assert.equal(p.slug, CAT)
  assert.equal(types[0], 'hero'); assert.ok(!types.includes('price_table'))
  for (const t of ['situation_links', 'guide_links', 'price_links', 'faq_list', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), t)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'))
  assert.ok(p.intrebari.length >= 6)
  const sit = p.blocks.find((b) => b.id === 'situations'); assert.ok(sit && sit.type === 'cards')
  assert.equal(((sit!.props as { items: unknown[] }).items).length, ALL.length)
  const text = JSON.stringify(p.blocks) + p.intrebari.join(' ') + p.seoTitle + p.seoDescription + p.summary
  assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text))
  for (const re of [/\d[\d.,]*\s*[–-]?\s*[\d.,]*\s*(lei|ron|€|euro|eur)\b/i, /\d+\s*[–-]\s*\d+\s*(ani|zile|ore|mp|ml|%)/i, /\d+\s?%/, /\b\d+\s*(ani|zile|ore)\b/i]) assert.ok(!re.test(text), String(re))
  assert.ok(!text.includes('[DE COMPLETAT]'))
})
