import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { SITUATIONS } from '../../index'
import { validateContent } from '../../../services/seed'
import { instalatiiTermice } from '../../../services/instalatii-termice'
import { centralePompeCaldura } from '../../../services/centrale-pompe-caldura'
import { incalzireInPardoseala } from '../incalzire-in-pardoseala'
import { calorifereRadiatoare } from '../calorifere-radiatoare'
import { centralaLemnePeleti } from '../centrala-lemne-peleti'
import { montajCentralaTermicaGaz } from '../../centrale-pompe-caldura/montaj-centrala-termica-gaz'
import { revizieServiceCentralaTermica } from '../../centrale-pompe-caldura/revizie-service-centrala-termica'
import { pompaCalduraAerApa } from '../../centrale-pompe-caldura/pompa-caldura-aer-apa'
const OTHER = [montajCentralaTermicaGaz, revizieServiceCentralaTermica, pompaCalduraAerApa]

const CAT = 'instalatii-termice'
const ALL = [incalzireInPardoseala, calorifereRadiatoare, centralaLemnePeleti]
const MINE = [...ALL, ...OTHER]
const PILLARS = [instalatiiTermice, centralePompeCaldura]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const mine = new Set([...MINE.map((s) => s.slug)])

test('every instalatii-termice situation is valid and its slug is instalatii-termice--<situație>', () => {
  assert.equal(ALL.length, 3)
  for (const s of ALL) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, CAT), s.slug); assert.equal(s.categorie, CAT) }
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
    assert.ok(ids.includes('situation-links'), s.slug)
    assert.ok(s.intrebari.length >= 5, s.slug)
  }
})
test('no invented amounts and no placeholder (situations and pillar)', () => {
  const texts = [...ALL.map((s) => [s.slug, JSON.stringify(s.blocks) + s.intrebari.join(' ')]), ...PILLARS.map((p) => [p.slug, JSON.stringify(p.blocks) + p.intrebari.join(' ') + p.summary])]
  for (const [slug, text] of texts) {
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text!), `${slug}: sumă`)
    assert.ok(!text!.includes('[DE COMPLETAT]'), slug)
  }
})
test('one page per group of terms: no term in two of my pages, in a guide or in an existing situation', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of SITUATIONS) if (!mine.has(s.slug)) for (const k of s.sinonime) seen.set(norm(k), s.slug)
  for (const p of PILLARS) for (const k of p.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === p.slug, `„${k}” este în ${o} și în ${p.slug}`); seen.set(norm(k), p.slug) }
  for (const s of MINE) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
})
test('SEO title and description are within limits', () => {
  for (const s of ALL) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: ${s.seoDescription.length}`) }
})
test('pillar: hub, no prices, hero first, situation links, FAQ, form, situations cards, firms before CTA', () => {
  for (const p of PILLARS.filter((x) => x.slug === CAT)) {
    assert.deepEqual(validateContent(p), [])
    assert.equal(p.hub, true)
    assert.deepEqual(p.preturi, [])
    const types = p.blocks.map((b) => b.type), ids = p.blocks.map((b) => b.id)
    assert.equal(types[0], 'hero')
    assert.equal(new Set(ids).size, ids.length)
    for (const t of ['situation_links', 'faq_list', 'request_form', 'price_links', 'guide_links', 'steps', 'facts']) assert.ok(types.includes(t), t)
    assert.ok(ids.includes('situations') && ids.includes('situation-links') && ids.includes('firms'))
    assert.equal((p.blocks.find((b) => b.id === 'situations')!.props as { items: unknown[] }).items.length, ALL.length)
    assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'))
    assert.ok(p.seoTitle.length <= 60 && p.seoDescription.length <= 165)
  }
})
