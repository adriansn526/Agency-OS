import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { electricieniAutorizatiAnre } from '../electricieni-autorizati-anre'
import { tablouElectric } from '../tablou-electric'
import { paratrasnetPrizaDePamant } from '../paratrasnet-priza-de-pamant'
import { instalatieElectricaCasa } from '../instalatie-electrica-casa'
import type { SituationContent } from '../../index'

const MINE: SituationContent[] = [electricieniAutorizatiAnre, tablouElectric, paratrasnetPrizaDePamant, instalatieElectricaCasa]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const texts = (s: SituationContent) => JSON.stringify(s.blocks) + s.intrebari.join(' ')

test('valid situations with correct slugs and unique block ids', () => {
  for (const s of MINE) {
    assert.deepEqual(validateSituation(s), [], s.slug)
    assert.ok(situationSlugOk(s.slug, s.categorie), s.slug)
    assert.equal(s.categorie, 'instalatii-electrice')
    const ids = s.blocks.map((b) => b.id)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
  }
  assert.equal(new Set(MINE.map((s) => s.slug)).size, MINE.length)
})
test('has the required blocks, firms before the request cta', () => {
  for (const s of MINE) {
    const types = s.blocks.map((b) => b.type)
    assert.equal(types[0], 'hero')
    for (const t of ['facts', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    assert.ok(types.filter((t) => t === 'heading').length >= 5, s.slug)
  }
})
test('no invented amounts and no placeholders', () => {
  for (const s of MINE) {
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(texts(s)), s.slug)
    assert.ok(!texts(s).includes('[DE COMPLETAT]'), s.slug)
  }
})
test('no term in two of the situations or in a guide', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of MINE) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
})
test('seo limits', () => {
  for (const s of MINE) { assert.ok(s.seoTitle.length <= 60, s.slug); assert.ok(s.seoDescription.length <= 165, s.slug); assert.ok(s.intrebari.length >= 5, s.slug) }
})
