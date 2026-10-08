/**
 * Unit tests — run with:  npx tsx --test lib/commerce/__tests__/*.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseVehicleName } from '../vehicles'
import { parseAttributes, parseGroup } from '../attributes'
import { categoryForGroup, categoryForDescription } from '../categories'
import { computePrice, roundPrice, type PricingRuleInput } from '../pricing'
import { normalizeOe, parseDecimalComma, slugify } from '../text'

test('vehicle: Dacia Logan III', () => {
  const p = parseVehicleName('DACIA LOGAN III 2021- (3K)', 'DACIA')!
  assert.equal(p.makeSlug, 'dacia')
  assert.equal(p.modelSlug, 'logan')
  assert.equal(p.yearFrom, 2021)
  assert.equal(p.yearTo, null)
  assert.deepEqual(p.chassisCodes, ['3K'])
  assert.equal(p.generationName, 'Logan III (2021-)')
})

test('vehicle: hyphenated variant LOGAN-MCV/P.UP/VAN', () => {
  const p = parseVehicleName('DACIA LOGAN-MCV/P.UP/VAN I 2005-2012 (KS/LS/US)', 'DACIA')!
  assert.equal(p.modelSlug, 'logan')
  assert.equal(p.variant, 'MCV/P.UP/VAN')
  assert.ok(p.bodyTypes.includes('break'))
  assert.deepEqual(p.chassisCodes, ['KS', 'LS', 'US'])
})

test('vehicle: combined make column (DAEWOO - CHEVROLET)', () => {
  const p = parseVehicleName('DAEWOO NUBIRA 1997-1999 (J100)', 'DAEWOO - CHEVROLET')!
  assert.equal(p.makeSlug, 'daewoo')
  assert.equal(p.modelSlug, 'nubira')
})

test('vehicle: unclosed parenthesis + two-word family', () => {
  const p = parseVehicleName('BMW SERIES 2 ACTIVE/GRAN TOURER 2014-2017 (F45/F46', 'BMW')!
  assert.equal(p.modelSlug, 'series-2')
  assert.deepEqual(p.chassisCodes, ['F45', 'F46'])
})

test('vehicle: multiple paren groups (VW Transporter T5)', () => {
  const p = parseVehicleName('VW TRANSPORTER 2003-2010 (T5) (7HA/7HH/7EA/7EH)', 'VW')!
  assert.equal(p.modelSlug, 'transporter')
  assert.ok(p.generationName.startsWith('Transporter T5'))
  assert.deepEqual(p.chassisCodes, ['7HA', '7HH', '7EA', '7EH'])
})

test('vehicle: Mercedes E CLASS and Tesla MODEL X without space', () => {
  assert.equal(parseVehicleName('MERCEDES E CLASS 2013-2016 (W212)', 'MERCEDES')!.modelSlug, 'e-class')
  const t = parseVehicleName('TESLA MODEL X 2016-(5YJX)', 'TESLA')!
  assert.equal(t.modelSlug, 'model-x')
  assert.deepEqual(t.chassisCodes, ['5YJX'])
})

test('vehicle: electric prefix (CITROEN e JUMPER III)', () => {
  const p = parseVehicleName('CITROEN e JUMPER III 2020-2023', 'CITROEN')!
  assert.equal(p.modelSlug, 'jumper')
  assert.equal(p.variant, 'e')
})

test('vehicle: non-vehicle strings return null', () => {
  assert.equal(parseVehicleName('Snow Socks', 'ΑΞΕΣΟΥΑΡ'), null)
  assert.equal(parseVehicleName('UNIVERSAL DOOR MIRROR-SWITCH', 'UNIVERSAL ITEMS'), null)
})

test('attributes: bumper with PDC & washer holes and trim', () => {
  const { attributes: a, quality } = parseAttributes('FRONT BUMPER PRIMED (W/2 PDC & WASHER HOLES) (F-SPORT) (A QUALITY)')
  assert.equal(a.primed, true)
  assert.equal(a.pdcHoles, 2)
  assert.equal(a.washerHoles, true)
  assert.deepEqual(a.trim, ['F-SPORT'])
  assert.equal(quality, 'A')
})

test('attributes: mirror', () => {
  const { attributes: a } = parseAttributes('DOOR MIRROR ELECTRICAL HEATED FOLDABLE PRIMED (W/SIDE LAMP) (CONVEX GLASS)')
  assert.equal(a.electric, true)
  assert.equal(a.heated, true)
  assert.equal(a.foldable, true)
  assert.equal(a.sideLamp, true)
  assert.equal(a.glass, 'convex')
})

test('attributes: year limit and fog holes', () => {
  const { attributes: a } = parseAttributes('FRONT BUMPER -2006 (W/CUTTING MARKS FOR FOG LAMP HOLES)')
  assert.equal(a.yearUntil, 2006)
  assert.equal(a.fogLampHoles, true)
  assert.equal(parseAttributes('REAR BUMPER (W/O PDC)').attributes.pdcHoles, false)
})

test('groups: brand/quality and category mapping', () => {
  assert.deepEqual(parseGroup('HEAD LAMPS DEPO'), { brand: 'Depo', quality: null })
  assert.equal(parseGroup('ORIGINAL HYUNDAI KAT 27').quality, 'OE')
  assert.equal(categoryForGroup('FRONT BUMPERS'), 'bare-fata')
  assert.equal(categoryForGroup('PLASTIC INNER FENDERS'), 'aparatori-noroi')
  assert.equal(categoryForGroup('FRONT FENDERS'), 'aripi')
  assert.equal(categoryForGroup('DOOR MIRROR GLASSES AFTER MARKET'), 'sticle-oglinda')
  assert.equal(categoryForGroup('HEAD-SIGNAL LAMP-WIPER SWITCHES'), 'butoane-comutatoare')
  assert.equal(categoryForGroup('ORIGINAL KIA KAT 27'), null)
  assert.equal(categoryForDescription('FRONT BUMPER PRIMED'), 'bare-fata')
})

test('text helpers', () => {
  assert.equal(normalizeOe('58300-60A30'), '5830060A30')
  assert.equal(parseDecimalComma('5,59'), 5.59)
  assert.equal(slugify('Bară față grunduită (W/2 PDC)'), 'bara-fata-grunduita-w-2-pdc')
})

const ch = { vatRate: 21, transportPct: 10, defaultMarkupPct: 30, minMarginRon: 15, roundingMode: '99' }
const rule = (o: Partial<PricingRuleInput>): PricingRuleInput => ({
  id: 'r', priority: 100, categoryIds: null, brand: null, quality: null, costMin: null, costMax: null,
  markupPct: 30, minMarginRon: null, bulkySurchargeRon: 0, competitorUndercutRon: null, ...o,
})
const prod = { costPrice: 10, costCurrency: 'EUR', categoryId: null, brand: null, quality: null, bulkyClass: 'standard', manualPriceRon: null, competitorMinRon: null }

test('pricing: rounding', () => {
  assert.equal(roundPrice(123.4, '99'), 123.99)
  assert.equal(roundPrice(123, '99'), 122.99) // exact integers round down by 1 cent — acceptable (.99 pricing)
  assert.equal(roundPrice(10.01, 'integer'), 11)
})

test('pricing: min margin dominates for cheap parts', () => {
  // landed = 10 * 5 * 1.1 = 55; markup 30% → 71.5; min margin 15 → 70 → 71.5 wins; *1.21 = 86.5 → 86.99
  const r = computePrice(prod, ch, [rule({})], { EUR: 5 })!
  assert.equal(r.landedRon, 55)
  assert.equal(r.priceRon, 86.99)
  assert.equal(r.priceSource, 'rule')
  // min margin 40 → 95 net → 114.95 → 114.99
  const r2 = computePrice(prod, ch, [rule({ minMarginRon: 40 })], { EUR: 5 })!
  assert.equal(r2.priceRon, 114.99)
})

test('pricing: rule matching by cost band and priority', () => {
  const rules = [rule({ id: 'cheap', priority: 200, costMax: 50, markupPct: 80 }), rule({ id: 'default', priority: 1 })]
  assert.equal(computePrice(prod, ch, rules, { EUR: 5 })!.ruleId, 'default') // landed 55 ≥ 50
  assert.equal(computePrice({ ...prod, costPrice: 5 }, ch, rules, { EUR: 5 })!.ruleId, 'cheap')
})

test('pricing: competitor positioning never goes below floor', () => {
  const rules = [rule({ competitorUndercutRon: 1 })]
  // competitor very cheap → floor = (55 + 15) * 1.21 = 84.7 → 84.99
  const low = computePrice({ ...prod, competitorMinRon: 60 }, ch, rules, { EUR: 5 })!
  assert.equal(low.priceRon, 84.99)
  assert.equal(low.priceSource, 'competitor')
  // competitor expensive → we price just under it
  const high = computePrice({ ...prod, competitorMinRon: 150 }, ch, rules, { EUR: 5 })!
  assert.equal(high.priceRon, 148.99)
})

test('pricing: manual price wins; missing FX returns null', () => {
  assert.equal(computePrice({ ...prod, manualPriceRon: 199 }, ch, [], { EUR: 5 })!.priceSource, 'manual')
  assert.equal(computePrice(prod, ch, [], {}), null)
})
