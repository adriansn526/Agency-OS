import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SituationContent } from '../../index'
import { validateSituation } from '../../seed'
import { GUIDES } from '../../../guides/index'
import { situationSlugOk } from '../../../glossary/validate'
import { pardosealaEpoxidica } from '../pardoseala-epoxidica'
import { montajParchet } from '../montaj-parchet'
import { montajGresieFaianta } from '../montaj-gresie-faianta'
import { microcimentPoliuretan } from '../microciment-poliuretan'

const ALL: SituationContent[] = [pardosealaEpoxidica, montajParchet, montajGresieFaianta, microcimentPoliuretan]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

test('every situation is valid, with a correct slug and category', () => {
  for (const s of ALL) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, s.categorie), s.slug); assert.equal(s.categorie, 'pardoseli-placari') }
  assert.equal(new Set(ALL.map((s) => s.slug)).size, ALL.length)
})
test('block ids are unique and the reserved id "situations" is not used', () => {
  for (const s of ALL) { const ids = s.blocks.map((b) => b.id); assert.equal(new Set(ids).size, ids.length, s.slug); assert.ok(!ids.includes('situations'), s.slug) }
})
test('has the required blocks; firms before the request cta', () => {
  for (const s of ALL) {
    const types = s.blocks.map((b) => b.type)
    for (const t of ['hero', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    assert.equal(types[0], 'hero')
  }
})
test('no invented amounts and no placeholders', () => {
  for (const s of ALL) {
    const text = JSON.stringify([s.blocks, s.intrebari])
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
})
test('one page per group of terms: no term in two of these situations nor in a guide', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of ALL) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
})
test('SEO fields are within limits', () => {
  for (const s of ALL) { assert.ok(s.seoTitle.length <= 60, s.slug); assert.ok(s.seoDescription.length <= 165, s.slug); assert.ok(s.intrebari.length >= 5, s.slug) }
})
