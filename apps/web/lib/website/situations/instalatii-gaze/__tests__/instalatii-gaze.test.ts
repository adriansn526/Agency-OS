import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { validateContent } from '../../../services/seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { SITUATIONS } from '../../index'
import { instalatiiGaze } from '../../../services/instalatii-gaze'
import { revizieVerificareInstalatieGaze } from '../revizie-verificare-instalatie-gaze'
import { detectorGaze } from '../detector-gaze'
import { instalatorAutorizatGazeAnre } from '../instalator-autorizat-gaze-anre'

const ALL = [revizieVerificareInstalatieGaze, detectorGaze, instalatorAutorizatGazeAnre]
const PILLAR = instalatiiGaze
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

test('every instalatii-gaze situation is valid and its slug is instalatii-gaze--<situație>', () => {
  for (const s of ALL) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, 'instalatii-gaze'), s.slug); assert.equal(s.categorie, 'instalatii-gaze') }
  assert.equal(new Set(ALL.map((s) => s.slug)).size, ALL.length)
})
test('block ids are unique, "situations" is not used, firms come before the CTA, required blocks exist', () => {
  for (const s of ALL) {
    const ids = s.blocks.map((b) => b.id), types = s.blocks.map((b) => b.type)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
    assert.equal(types[0], 'hero', s.slug)
    assert.ok(types.indexOf('firms_list') >= 0 && types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    for (const t of ['facts', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(s.intrebari.length >= 5, s.slug)
  }
})
test('no invented amounts and no placeholder', () => {
  for (const s of ALL) {
    const text = JSON.stringify(s.blocks) + s.intrebari.join(' ')
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
})
test('one page per group of terms: no term in two of these pages, in a guide or in an existing situation', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  const mine = new Set(ALL.map((s) => s.slug))
  for (const s of SITUATIONS) if (!mine.has(s.slug)) for (const k of s.sinonime) seen.set(norm(k), s.slug)
  for (const s of [...ALL, PILLAR as unknown as { slug: string; sinonime: string[] }]) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
})
test('SEO title and description are within limits', () => {
  for (const s of ALL) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: ${s.seoDescription.length}`) }
})
test('pillar: hub, no prices, no amounts, no fixed periods or percentages', () => {
  assert.deepEqual(validateContent(PILLAR), [])
  assert.equal(PILLAR.hub, true)
  assert.equal(PILLAR.preturi.length, 0)
  const types = PILLAR.blocks.map((b) => b.type)
  assert.equal(types[0], 'hero')
  assert.ok(!types.includes('price_table'))
  for (const t of ['situation_links', 'guide_links', 'faq_list', 'request_form']) assert.ok(types.includes(t), t)
  assert.ok(PILLAR.intrebari.length >= 6)
  assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'))
  const ids = PILLAR.blocks.map((b) => b.id)
  assert.equal(new Set(ids).size, ids.length)
  const text = JSON.stringify(PILLAR)
  for (const re of [/\d[\d.,]*\s*[–-]?\s*[\d.,]*\s*(lei|ron|€|euro|eur)\b/i, /\d+\s*[–-]\s*\d+\s*(ani|zile|ore|mp|ml|%)/i, /\d+\s?%/, /\b\d+\s*(ani|zile|ore)\b/i]) assert.ok(!re.test(text), String(re))
  assert.ok(!text.includes('[DE COMPLETAT]'))
})
test('no gas/security text states a fixed number of years', () => {
  for (const s of ALL) assert.ok(!/\b\d+\s*(ani|zile|ore)\b/i.test(JSON.stringify(s.blocks) + s.intrebari.join(' ')), s.slug)
})
