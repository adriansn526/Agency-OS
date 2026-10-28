import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { SITUATIONS } from '../../index'
import { tersePergoleFoisoare } from '../../../services/terase-pergole-foisoare'
import { pergolaLemnAluminiu } from '../pergola-lemn-aluminiu'
import { pergolaRetractabilaBioclimatica } from '../pergola-retractabila-bioclimatica'
import { foisorLemnGradina } from '../foisor-lemn-gradina'
import { terasaLemnWpc } from '../terasa-lemn-wpc'
import { inchidereTerasaBalcon } from '../inchidere-terasa-balcon'

const ALL = [pergolaLemnAluminiu, pergolaRetractabilaBioclimatica, foisorLemnGradina, terasaLemnWpc, inchidereTerasaBalcon]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const PRICE = /\d\s*(lei|ron|€|euro)/i

test('every terase-pergole-foisoare situation is valid and its slug is terase-pergole-foisoare--<situație>', () => {
  for (const s of ALL) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, 'terase-pergole-foisoare'), s.slug); assert.equal(s.categorie, 'terase-pergole-foisoare') }
  assert.equal(new Set(ALL.map((s) => s.slug)).size, ALL.length)
})
test('block ids are unique, "situations" is not used, firms come before the CTA, required blocks exist', () => {
  for (const s of ALL) {
    const ids = s.blocks.map((b) => b.id), types = s.blocks.map((b) => b.type)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
    assert.equal(types[0], 'hero', s.slug)
    assert.ok(types.indexOf('firms_list') >= 0 && types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    for (const t of ['hero', 'facts', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(s.intrebari.length >= 5, s.slug)
  }
})
test('no invented amounts and no placeholder', () => {
  for (const s of ALL) {
    const text = JSON.stringify(s.blocks) + s.intrebari.join(' ')
    assert.ok(!PRICE.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
  const p = JSON.stringify(tersePergoleFoisoare.blocks) + tersePergoleFoisoare.intrebari.join(' ')
  assert.ok(!PRICE.test(p), 'pilon: sumă')
  assert.ok(!p.includes('[DE COMPLETAT]'))
})
test('one page per group of terms: no term in two pages of the category, in a guide or in an existing situation', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  const mine = new Set(ALL.map((s) => s.slug))
  for (const s of SITUATIONS) if (!mine.has(s.slug)) for (const k of s.sinonime) seen.set(norm(k), s.slug)
  for (const s of ALL) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
  for (const k of tersePergoleFoisoare.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === tersePergoleFoisoare.slug, `„${k}” (pilon) este în ${o}`) }
})
test('SEO title and description are within limits', () => {
  for (const s of ALL) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: ${s.seoDescription.length}`) }
  assert.ok(tersePergoleFoisoare.seoTitle.length <= 60 && tersePergoleFoisoare.seoDescription.length <= 160)
})
test('pillar: hub with no price table, required blocks', () => {
  const p = tersePergoleFoisoare, types = p.blocks.map((b) => b.type), ids = p.blocks.map((b) => b.id)
  assert.equal(p.hub, true)
  assert.deepEqual(p.preturi, [])
  assert.equal(types[0], 'hero')
  for (const t of ['situation_links', 'faq_list', 'request_form', 'firms_list', 'price_links', 'guide_links']) assert.ok(types.includes(t), t)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes('situations'))
  assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'))
  const cards = p.blocks.find((b) => b.id === 'situations')!
  assert.equal(((cards.props as { items: unknown[] }).items).length, ALL.length + 1)
})
