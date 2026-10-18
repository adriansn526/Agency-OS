import { test } from 'node:test'
import assert from 'node:assert/strict'
import { builtInTaxonomy, taxonomyFromEntries, unknownCategories } from '../live'
import { categoryTitles } from '../taxonomy'

const row = (slug: string, title: string, data: object) => ({ slug, title, data })

test('taxonomy from entries: groups in the known order first, categories grouped and sorted, orphans ignored', () => {
  const t = taxonomyFromEntries([
    row('finisaje', 'Finisaje', { tip: 'grup' }), row('instalatii', 'Instalații', { tip: 'grup' }), row('altele', 'Altele', { tip: 'grup' }),
    row('zugraveli', 'Zugrăveli', { tip: 'categorie', parinte: 'finisaje' }), row('apa', 'Apă', { tip: 'categorie', parinte: 'instalatii' }), row('curatenie', 'Curățenie după construcție', { tip: 'categorie', parinte: 'altele' }),
    row('orfana', 'Orfană', { tip: 'categorie', parinte: 'nu-exista' }), row('fara-tip', 'Fără tip', {}), row('fara-data', 'Fără date', null as never),
  ])
  assert.deepEqual(t.groups.map((g) => g.slug), ['instalatii', 'finisaje', 'altele'])       // built-in order first, then the new group
  assert.deepEqual(t.categories.map((c) => c.slug), ['apa', 'zugraveli', 'curatenie'])
  assert.deepEqual(unknownCategories(t, ['apa', 'inexistent', 'orfana']), ['inexistent', 'orfana'])
})
test('titles come from the list that is passed in, so a new service is named correctly', () => {
  const t = taxonomyFromEntries([row('g', 'G', { tip: 'grup' }), row('curatenie', 'Curățenie după construcție', { tip: 'categorie', parinte: 'g' })])
  assert.deepEqual(categoryTitles(['curatenie', 'x'], t.categories), [{ slug: 'curatenie', title: 'Curățenie după construcție' }])
  assert.deepEqual(categoryTitles(['demolari']), [{ slug: 'demolari', title: 'Demolări' }])   // default: the built-in list
})
test('the built-in taxonomy is a valid fallback', () => {
  const b = builtInTaxonomy(); assert.ok(b.groups.length >= 5 && b.categories.length >= 20)
  assert.ok(b.categories.every((c) => b.groups.some((g) => g.slug === c.group)))
})
