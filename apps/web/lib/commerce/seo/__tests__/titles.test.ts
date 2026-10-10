/** Run: npx tsx --test lib/commerce/seo/__tests__/*.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSeo, disambiguate, TITLE_MAX, yearRange } from '../titles'

const v = (make: string, model: string, yearFrom: number | null, yearTo: number | null) => ({ make, model, yearFrom, yearTo })

test('single vehicle: full title with side and years', () => {
  const r = buildSeo({ sku: '021600822', nameRo: 'Carenaj aripă interior plastic față', side: 'L', oeMain: null, vehicles: [v('Mitsubishi', 'Lancer', 2004, 2008)] })
  assert.equal(r.title, 'Carenaj aripă interior plastic față stânga Mitsubishi Lancer 2004-2008')
  assert.equal(r.level, 0); assert.ok(r.title.length <= TITLE_MAX)
  assert.equal(r.slug, 'carenaj-aripa-interior-plastic-fata-stanga-mitsubishi-lancer-2004-2008-021600822')
})

test('open-ended generation reads "din YYYY"', () => {
  const r = buildSeo({ sku: '745400652', nameRo: 'Aripă față', side: 'L', oeMain: '5E3821105', vehicles: [v('Skoda', 'Superb', 2024, null)] })
  assert.equal(r.title, 'Aripă față stânga Skoda Superb din 2024')
  assert.ok(r.description.includes('cod OE 5E3821105'))
})

test('2-3 models of one make are listed, years merged', () => {
  const r = buildSeo({ sku: '1', nameRo: 'Far', side: null, oeMain: null, vehicles: [v('BMW', 'Seria 3', 1999, 2002), v('BMW', 'Seria 3', 2002, 2005), v('BMW', 'Seria 5', 2003, 2010)] })
  assert.equal(r.title, 'Far BMW Seria 3, Seria 5 1999-2010'); assert.equal(r.modelCount, 2)
})

test('different makes are listed with their make', () => {
  const r = buildSeo({ sku: '2', nameRo: 'Macara', side: null, oeMain: null, vehicles: [v('Iveco', 'Daily', 2000, 2007), v('Nissan', 'Interstar', 2002, 2009), v('Opel', 'Movano', 1998, 2009)] })
  assert.ok(r.title.startsWith('Macara Iveco Daily, Nissan Interstar, Opel Movano') || r.level > 0)
  assert.ok(r.title.length <= TITLE_MAX)
})

test('many models: make + count, never longer than the limit', () => {
  const vs = Array.from({ length: 12 }, (_, i) => v('Dacia', `Model${i}`, 2010, 2020))
  const r = buildSeo({ sku: '3', nameRo: 'Bară spate', side: null, oeMain: null, vehicles: vs })
  assert.equal(r.title, 'Bară spate Dacia (12 modele) 2010-2020')
})

test('long name drops the years first, then the model, and stays within the limit', () => {
  const a = buildSeo({ sku: '4', nameRo: 'Bandă ornamentală bară spate inferior negru', side: 'R', oeMain: null, vehicles: [v('Mitsubishi', 'Pajero', 2007, 2012)] })
  assert.equal(a.level, 1); assert.equal(a.title, 'Bandă ornamentală bară spate inferior negru dreapta Mitsubishi Pajero')
  const b = buildSeo({ sku: '6', nameRo: 'Bandă ornamentală bară spate inferior negru cu suport metalic', side: 'R', oeMain: null, vehicles: [v('Mitsubishi', 'Pajero', 2007, 2012)] })
  assert.ok(b.title.length <= TITLE_MAX); assert.equal(b.level, 4) // the name alone already uses the room
})

test('technical parentheses are dropped from the title (not from the slug/description) to keep make and model', () => {
  const r = buildSeo({ sku: '024406355', nameRo: 'Radiator 1.2-1.4 benzină automat +/- A/C (380x448) JAPAN (NRF)', side: null, oeMain: null, vehicles: [v('Nissan', 'Micra', 2002, 2010)] })
  assert.equal(r.shortened, true); assert.ok(r.title.includes('Nissan Micra')); assert.ok(r.title.length <= TITLE_MAX)
  assert.ok(r.slug.includes('380x448'))
})

test('parentheses before the side are dropped too, and a stray trailing year hint is removed', () => {
  const a = buildSeo({ sku: '526007597', nameRo: 'Oglindă electrică încălzită rabatabilă (calitate A) (sticlă asferică)', side: 'L', oeMain: null, vehicles: [v('Mercedes', 'Vito', 2010, 2015)] })
  assert.ok(a.title.includes('Mercedes Vito')); assert.ok(a.title.includes('stânga')); assert.ok(a.title.length <= TITLE_MAX)
  const b = buildSeo({ sku: '058203375', nameRo: 'Bară față grunduită (proiector rotund) 2000-', side: null, oeMain: null, vehicles: [v('BMW', 'Series 5', 1996, 2002)] })
  assert.equal(b.title, 'Bară față grunduită (proiector rotund) BMW Series 5 1996-2002')
})

test('disambiguate adds the OE code only to shared titles and only when it fits', () => {
  assert.deepEqual(disambiguate(['A', 'A', 'B'], ['111', '222', '333']), ['A (111)', 'A (222)', 'B'])
  const long = 'x'.repeat(66); assert.equal(disambiguate([long, long], ['12345', '67890'])[0], long)
})

test('side already in the name is not repeated; no vehicle keeps the name', () => {
  const a = buildSeo({ sku: '5', nameRo: 'Aripă față stânga', side: 'L', oeMain: null, vehicles: [] })
  assert.equal(a.title, 'Aripă față stânga'); assert.equal(a.hasVehicle, false); assert.equal(a.slug, 'aripa-fata-stanga-5')
})

test('slug is URL-safe, ends with -SKU and fits the storefront limit', () => {
  const r = buildSeo({ sku: '123456789', nameRo: 'Proiector (LED) față / ceață & lumină "specială" ' + 'x'.repeat(200), side: 'R', oeMain: null, vehicles: [v('Škoda', 'Octavia', 2020, null)] })
  assert.match(r.slug, /^[a-z0-9-]{1,140}-123456789$/)
})

test('yearRange', () => {
  assert.equal(yearRange([{ yearFrom: 2004, yearTo: 2008 }]), '2004-2008')
  assert.equal(yearRange([{ yearFrom: 2005, yearTo: 2005 }]), '2005')
  assert.equal(yearRange([{ yearFrom: 2010, yearTo: 2012 }, { yearFrom: 2019, yearTo: null }]), 'din 2010')
  assert.equal(yearRange([{ yearFrom: null, yearTo: null }]), '')
})
