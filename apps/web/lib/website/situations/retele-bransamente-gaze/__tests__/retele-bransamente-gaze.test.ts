import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { SITUATIONS } from '../../index'
import { reteleBransamenteGaze } from '../../../services/retele-bransamente-gaze'
import { bransamentGazeApaCanalizare } from '../bransament-gaze-apa-canalizare'

const CAT = 'retele-bransamente-gaze'
const ALL = [bransamentGazeApaCanalizare]
const PILON = reteleBransamenteGaze
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

test('every retele-bransamente-gaze situation is valid and its slug is retele-bransamente-gaze--<situație>', () => {
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
    for (const t of ['hero', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(s.intrebari.length >= 5, s.slug)
  }
})
test('no invented amounts and no placeholder (situations and pillar)', () => {
  for (const s of ALL) {
    const text = JSON.stringify(s.blocks) + s.intrebari.join(' ')
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
  const p = JSON.stringify(PILON)
  assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(p) && !p.includes('[DE COMPLETAT]'))
})
test('one page per group of terms: no term in two of these pages, in a guide or in an existing situation', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const x of SITUATIONS) if (x.categorie !== CAT) for (const k of x.sinonime) seen.set(norm(k), x.slug)
  for (const s of ALL) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
  for (const k of PILON.sinonime) { const o = seen.get(norm(k)); assert.ok(!o, `pilon: „${k}” este în ${o}`) }
})
test('SEO title and description are within limits', () => {
  for (const s of [...ALL, PILON]) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: ${s.seoDescription.length}`) }
})
test('pillar: hub, no prices, required blocks, no figures', () => {
  assert.equal(PILON.hub, true)
  assert.equal(PILON.slug, CAT)
  assert.deepEqual(PILON.preturi, [])
  const types = PILON.blocks.map((b) => b.type)
  assert.equal(types[0], 'hero')
  assert.ok(!types.includes('price_table'))
  for (const t of ['situation_links', 'guide_links', 'faq_list', 'request_form', 'firms_list', 'request_cta', 'price_links']) assert.ok(types.includes(t), t)
  assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'))
  assert.ok(PILON.intrebari.length >= 6)
  const ids = PILON.blocks.map((b) => b.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes('situations'))
  const text = JSON.stringify(PILON)
  for (const re of [/\d[\d.,]*\s*[–-]?\s*[\d.,]*\s*(lei|ron|€|euro|eur)\b/i, /\d+\s*[–-]\s*\d+\s*(ani|zile|ore|mp|ml|%)/i, /\d+\s?%/, /\b\d+\s*(ani|zile|ore)\b/i]) assert.ok(!re.test(text), String(re))
})
