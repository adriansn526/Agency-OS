import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { validateContent } from '../../../services/seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { SITUATIONS } from '../../index'
import { panouriFotovoltaiceCasa } from '../panouri-fotovoltaice-casa'
import { panouriSolareApaCalda } from '../panouri-solare-apa-calda'
import { bateriiStocareInvertor } from '../baterii-stocare-invertor'
import { fotovoltaiceEnergieRegenerabila as pilon } from '../../../services/fotovoltaice-energie-regenerabila'
import { prosumatorCumFunctioneaza as ghid } from '../../../guides/prosumator-cum-functioneaza'

const CAT = 'fotovoltaice-energie-regenerabila'
const ALL = [panouriFotovoltaiceCasa, panouriSolareApaCalda, bateriiStocareInvertor]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const SUM = /\d\s*(lei|ron|€|euro)/i

test('every situation is valid and its slug is fotovoltaice-energie-regenerabila--<situație>', () => {
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
  }
})
test('no invented amounts and no placeholder (situations, pillar, guide)', () => {
  const items: [string, string][] = [
    ...ALL.map((s) => [s.slug, JSON.stringify(s.blocks) + s.intrebari.join(' ')] as [string, string]),
    [pilon.slug, JSON.stringify(pilon.blocks) + pilon.intrebari.join(' ')],
    [ghid.slug, JSON.stringify(ghid.blocks) + ghid.intrebari.join(' ')],
  ]
  for (const [slug, text] of items) { assert.ok(!SUM.test(text), `${slug}: sumă`); assert.ok(!text.includes('[DE COMPLETAT]'), slug) }
})
test('one page per group of terms: none in two of these pages, in a guide or in an existing situation', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) if (g.slug !== ghid.slug) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of SITUATIONS) if (!ALL.some((a) => a.slug === s.slug)) for (const k of s.sinonime) seen.set(norm(k), s.slug)
  const check = (slug: string, terms: string[]) => { for (const k of terms) { const o = seen.get(norm(k)); assert.ok(!o || o === slug, `„${k}” este în ${o} și în ${slug}`); seen.set(norm(k), slug) } }
  for (const s of ALL) check(s.slug, s.sinonime)
  check(ghid.slug, ghid.keywords)
  check(pilon.slug, pilon.sinonime)
})
test('SEO title and description are within limits', () => {
  for (const s of ALL) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: ${s.seoDescription.length}`) }
  for (const x of [pilon, ghid]) { assert.ok(x.seoTitle.length <= 60, `${x.slug}: ${x.seoTitle.length}`); assert.ok(x.seoDescription.length <= 160, `${x.slug}: ${x.seoDescription.length}`) }
})
test('pillar: hub, no own prices, required blocks, valid content', () => {
  assert.deepEqual(validateContent(pilon), [])
  assert.equal(pilon.hub, true)
  assert.equal(pilon.preturi.length, 0)
  const types = pilon.blocks.map((b) => b.type), ids = pilon.blocks.map((b) => b.id)
  assert.equal(types[0], 'hero')
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes('situations') && ids.includes('situation-links') && ids.includes('firms'))
  for (const t of ['situation_links', 'guide_links', 'price_links', 'faq_list', 'firms_list', 'request_form']) assert.ok(types.includes(t), t)
  assert.ok(pilon.intrebari.length >= 6)
})
test('guide: informative, ≥5 questions, hero first, request form, in the category', () => {
  assert.equal(ghid.serviciu, CAT)
  assert.ok(ghid.intrebari.length >= 5)
  const types = ghid.blocks.map((b) => b.type)
  assert.equal(types[0], 'hero')
  assert.ok(types.includes('request_form'))
  assert.equal(new Set(ghid.blocks.map((b) => b.id)).size, ghid.blocks.length)
  assert.ok(!/casa verde/i.test(JSON.stringify(ghid.blocks) + ghid.intrebari.join(' ')))
})
