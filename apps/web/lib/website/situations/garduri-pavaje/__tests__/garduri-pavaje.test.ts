import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SituationContent } from '../../index'
import { validateSituation } from '../../seed'
import { GUIDES } from '../../../guides/index'
import { situationSlugOk } from '../../../glossary/validate'
import { gardMetalic } from '../gard-metalic'
import { gardBeton } from '../gard-beton'
import { betonAmprentat } from '../beton-amprentat'
import { pavajCurte } from '../pavaj-curte'
import { poartaCulisantaAutomatizare } from '../poarta-culisanta-automatizare'

const MINE: SituationContent[] = [gardMetalic, gardBeton, betonAmprentat, pavajCurte, poartaCulisantaAutomatizare]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

test('garduri-pavaje situations are valid with correct slugs', () => {
  for (const s of MINE) {
    assert.deepEqual(validateSituation(s), [], s.slug)
    assert.ok(situationSlugOk(s.slug, s.categorie), s.slug)
    assert.equal(s.categorie, 'garduri-pavaje')
  }
  assert.equal(new Set(MINE.map((s) => s.slug)).size, MINE.length)
})
test('unique block ids, reserved id unused, firms before the CTA, required blocks', () => {
  for (const s of MINE) {
    const ids = s.blocks.map((b) => b.id)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), s.slug)
    const types = s.blocks.map((b) => b.type)
    for (const t of ['hero', 'facts', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
  }
})
test('no invented amounts and no placeholder', () => {
  for (const s of MINE) {
    const text = JSON.stringify(s.blocks) + s.intrebari.join(' ')
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
})
test('one page per group of terms: no overlap between my situations or with guides', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of MINE) for (const k of s.sinonime) {
    const o = seen.get(norm(k))
    assert.ok(!o || o === s.slug, `„${k}” este în ${o} și în ${s.slug}`)
    seen.set(norm(k), s.slug)
  }
})
test('SEO limits', () => {
  for (const s of MINE) { assert.ok(s.seoTitle.length <= 60, s.slug); assert.ok(s.seoDescription.length <= 165, s.slug); assert.ok(s.intrebari.length >= 5) }
})
