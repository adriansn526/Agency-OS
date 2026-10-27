import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SituationContent } from '../../index'
import { validateSituation } from '../../seed'
import { GUIDES } from '../../../guides/index'
import { situationSlugOk } from '../../../glossary/validate'
import { montajAerConditionat } from '../montaj-aer-conditionat'
import { curatareIgienizareAerConditionat } from '../curatare-igienizare-aer-conditionat'
import { reparatiiServiceAerConditionat } from '../reparatii-service-aer-conditionat'
import { ventilatieRecuperareCaldura } from '../ventilatie-recuperare-caldura'
import { pompaCalduraAerAer } from '../pompa-caldura-aer-aer'

const ALL: SituationContent[] = [montajAerConditionat, curatareIgienizareAerConditionat, reparatiiServiceAerConditionat, ventilatieRecuperareCaldura, pompaCalduraAerAer]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

test('climatizare: valid, slug <categorie>--<situație>, unique block ids, reserved id unused', () => {
  assert.equal(new Set(ALL.map((s) => s.slug)).size, ALL.length)
  for (const s of ALL) {
    assert.deepEqual(validateSituation(s), [], s.slug)
    assert.equal(s.categorie, 'climatizare')
    assert.ok(situationSlugOk(s.slug, s.categorie), s.slug)
    const ids = s.blocks.map((b) => b.id)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
  }
})
test('climatizare: required blocks, firms before the request cta', () => {
  for (const s of ALL) {
    const types = s.blocks.map((b) => b.type)
    for (const t of ['hero', 'faq_list', 'firms_list', 'situation_links', 'guide_links', 'price_links', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    assert.ok(s.blocks.filter((b) => b.type === 'heading').length >= 5, `${s.slug}: secțiuni`)
  }
})
test('climatizare: no invented amounts and no placeholders', () => {
  for (const s of ALL) {
    const text = JSON.stringify(s.blocks) + s.intrebari.join(' ')
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
})
test('climatizare: SEO limits', () => {
  for (const s of ALL) { assert.ok(s.seoTitle.length <= 60, s.slug); assert.ok(s.seoDescription.length <= 165, s.slug); assert.ok(s.intrebari.length >= 5, s.slug) }
})
test('climatizare: one page per group of terms (among mine and against the guides)', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of ALL) for (const k of s.sinonime) { const o = seen.get(norm(k)); assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`); seen.set(norm(k), s.slug) }
})
