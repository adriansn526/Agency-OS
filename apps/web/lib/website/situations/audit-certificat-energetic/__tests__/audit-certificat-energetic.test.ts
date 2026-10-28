import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import { SITUATIONS } from '../../index'
import { auditCertificatEnergetic } from '../../../services/audit-certificat-energetic'
import { certificatEnergetic } from '../certificat-energetic'

const CAT = 'audit-certificat-energetic'
const ALL = [certificatEnergetic]
const PILLAR = auditCertificatEnergetic
const norm = (k: string) => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

test('every situation is valid and its slug is audit-certificat-energetic--<situație>', () => {
  for (const s of ALL) { assert.deepEqual(validateSituation(s), [], s.slug); assert.ok(situationSlugOk(s.slug, CAT), s.slug); assert.equal(s.categorie, CAT) }
  assert.equal(new Set(ALL.map((s) => s.slug)).size, ALL.length)
})
test('block ids are unique, "situations" is not used, firms come before the CTA, required blocks exist', () => {
  for (const s of ALL) {
    const ids = s.blocks.map((b) => b.id), types = s.blocks.map((b) => b.type)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
    assert.ok(types.indexOf('firms_list') >= 0 && types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    assert.equal(types[0], 'hero', s.slug)
    for (const t of ['hero', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
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
test('one page per group of terms: no term in two pages or in an existing guide/situation', () => {
  const mine = new Set(ALL.map((s) => s.slug))
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of SITUATIONS) if (!mine.has(s.slug)) for (const k of s.sinonime) seen.set(norm(k), s.slug)
  for (const s of ALL) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
  for (const k of PILLAR.sinonime) { const o = seen.get(norm(k)); assert.ok(!o, `pilon: „${k}” este în ${o}`) }
})
test('SEO title and description are within limits', () => {
  for (const s of [...ALL, PILLAR]) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: ${s.seoDescription.length}`) }
})
test('pillar is a hub with required blocks and no amounts, percentages or fixed durations', () => {
  assert.equal(PILLAR.slug, CAT)
  assert.equal(PILLAR.hub, true)
  assert.deepEqual(PILLAR.preturi, [])
  const types = PILLAR.blocks.map((b) => b.type), ids = PILLAR.blocks.map((b) => b.id)
  assert.equal(types[0], 'hero')
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(!types.includes('price_table'))
  assert.ok(ids.includes('situations') && ids.includes('situation-links'))
  assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'))
  for (const t of ['situation_links', 'guide_links', 'price_links', 'faq_list', 'request_form', 'request_cta']) assert.ok(types.includes(t), t)
  assert.ok(PILLAR.intrebari.length >= 6)
  const all = JSON.stringify(PILLAR)
  assert.ok(!all.includes('[DE COMPLETAT]'))
  for (const re of [/\d[\d.,]*\s*[–-]?\s*[\d.,]*\s*(lei|ron|€|euro|eur)\b/i, /\d+\s*[–-]\s*\d+\s*(ani|zile|ore|mp|ml|%)/i, /\d+\s?%/, /\b\d+\s*(ani|zile|ore)\b/i]) assert.ok(!re.test(all), String(re))
})
