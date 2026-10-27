import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSituation } from '../../seed'
import { situationSlugOk } from '../../../glossary/validate'
import { GUIDES } from '../../../guides/index'
import type { SituationContent } from '../../index'
import { fundatieCasa } from '../fundatie-casa'
import { sapaMecanizata } from '../sapa-mecanizata'
import { sapaAutonivelanta } from '../sapa-autonivelanta'
import { placaBetonArmat } from '../placa-beton-armat'

const MINE: SituationContent[] = [fundatieCasa, sapaMecanizata, sapaAutonivelanta, placaBetonArmat]
const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

test('fundatii-beton: valid, slug ok, unique block ids, reserved id unused, required blocks', () => {
  assert.equal(new Set(MINE.map((s) => s.slug)).size, MINE.length)
  for (const s of MINE) {
    assert.deepEqual(validateSituation(s), [], s.slug)
    assert.ok(situationSlugOk(s.slug, s.categorie), s.slug)
    assert.equal(s.categorie, 'fundatii-beton')
    const ids = s.blocks.map((b) => b.id)
    assert.equal(new Set(ids).size, ids.length, s.slug)
    assert.ok(!ids.includes('situations'), `${s.slug}: id rezervat`)
    const types = s.blocks.map((b) => b.type)
    for (const t of ['hero', 'facts', 'faq_list', 'price_links', 'situation_links', 'guide_links', 'firms_list', 'request_cta', 'request_form']) assert.ok(types.includes(t), `${s.slug}: ${t}`)
    assert.ok(types.indexOf('firms_list') < types.indexOf('request_cta'), s.slug)
    assert.ok(types.filter((t) => t === 'heading').length >= 5, `${s.slug}: sub 5 secțiuni`)
  }
})
test('fundatii-beton: no invented prices, no placeholders', () => {
  for (const s of MINE) {
    const text = JSON.stringify(s.blocks) + s.intrebari.join(' ')
    assert.ok(!/\d\s*(lei|ron|€|euro)/i.test(text), `${s.slug}: sumă`)
    assert.ok(!text.includes('[DE COMPLETAT]'), s.slug)
  }
})
test('fundatii-beton: one page per group of terms (no overlap with siblings or guides)', () => {
  const seen = new Map<string, string>()
  for (const g of GUIDES) for (const k of g.keywords) seen.set(norm(k), g.slug)
  for (const s of MINE) {
    const own = new Set(s.sinonime.map(norm))
    for (const k of own) { const o = seen.get(k); assert.ok(!o, `„${k}” este în ${o} și în ${s.slug}`) }
    for (const k of own) seen.set(k, s.slug)
  }
})
test('fundatii-beton: SEO limits', () => {
  for (const s of MINE) { assert.ok(s.seoTitle.length <= 60, `${s.slug}: seoTitle ${s.seoTitle.length}`); assert.ok(s.seoDescription.length <= 165, `${s.slug}: seoDescription ${s.seoDescription.length}`); assert.ok(s.intrebari.length >= 5) }
})
