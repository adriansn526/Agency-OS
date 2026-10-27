import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import type { SituationContent } from '../../index'
import { reparatiiReglajTermopane } from '../reparatii-reglaj-termopane'
import { usiTermopan } from '../usi-termopan'
import { usiCulisanteGlisante } from '../usi-culisante-glisante'
import { ruloriJaluzeleExterioare } from '../rulouri-jaluzele-exterioare'

const ALL: SituationContent[] = [reparatiiReglajTermopane, usiTermopan, usiCulisanteGlisante, ruloriJaluzeleExterioare]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

test('geamuri situations are valid with unique slugs', () => {
  for (const s of ALL) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, s.categorie)); assert.equal(s.categorie, 'geamuri') }
  assert.equal(new Set(ALL.map((s) => s.slug)).size, ALL.length)
})
test('block ids are unique, "situations" is not used, structure and order are right', () => {
  for (const s of ALL) {
    const ids = s.blocks.map((b) => b.id)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
    const types = s.blocks.map((b) => b.type)
    for (const t of ['hero', 'faq_list', 'firms_list', 'request_cta', 'request_form', 'situation_links', 'guide_links', 'price_links']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
  }
})
test('no invented prices and no placeholder', () => {
  for (const s of ALL) {
    const text = JSON.stringify(s.blocks) + s.intrebari.join(' ')
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
})
test('no term is served by two geamuri situations or by a guide', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of ALL) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
})
test('SEO fields are within limits', () => {
  for (const s of ALL) { assert.ok(s.seoTitle.length <= 60, s.slug); assert.ok(s.seoDescription.length <= 165, s.slug); assert.ok(s.intrebari.length >= 5, s.slug) }
})
