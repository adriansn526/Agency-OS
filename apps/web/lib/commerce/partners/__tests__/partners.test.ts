/** Run with: npx tsx --test lib/commerce/partners/__tests__/*.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanWebsite, inferLocation, normalizePhone, parseCsv, parsePartnersCsv } from '../csv'
import { haversineKm, nearest } from '../geo'
import { PartnerFields, RatesBody } from '../schemas'

test('csv: delimiters, quotes, BOM, embedded newline', () => {
  assert.deepEqual(parseCsv('﻿a;b\n"x;1";"he said ""hi"""\n'), [['a', 'b'], ['x;1', 'he said "hi"']])
  assert.deepEqual(parseCsv('a,b\r\n1,"two\nlines"\r\n'), [['a', 'b'], ['1', 'two\nlines']])
  assert.deepEqual(parseCsv('a\tb\n1\t2'), [['a', 'b'], ['1', '2']])
})
test('phones are normalised to +40', () => {
  assert.equal(normalizePhone('0721 123 456'), '+40721123456')
  assert.equal(normalizePhone('+40 721-123-456'), '+40721123456')
  assert.equal(normalizePhone('0040721123456'), '+40721123456')
  assert.equal(normalizePhone('403 12'), null)
  assert.equal(normalizePhone(undefined), null)
})
test('Bucharest addresses get city/county', () => {
  assert.deepEqual(inferLocation('Str. X 5, Sector 3, București', null, null), { city: 'București', county: 'București' })
  assert.deepEqual(inferLocation('Str. X, Voluntari, Ilfov', null, 'Ilfov'), { city: null, county: 'Ilfov' })
})
test('google-maps style export is mapped and validated', () => {
  const csv = [
    'title,address,phone,website,latitude,longitude,place id,rating,reviews,url,category',
    '"Auto Caroserie Rapid","Str. Test 1, Sector 2, București","0722 111 222",rapid.ro,44.45,26.12,ChIJabc,4.6,"(120)",https://maps.google.com/?cid=1,Body shop',
    ',"fara nume",,,,,,,,,',
    'Vopsitorie Alfa,"Bd. Y 9, București",nu-e-telefon,javascript:alert(1),95,26.1,,,,,',
  ].join('\n')
  const r = parsePartnersCsv(csv)
  assert.equal(r.partners.length, 1)
  assert.equal(r.invalid.length, 2) // no name; latitude 95
  const a = r.partners[0]!.data
  assert.equal(a.phone, '+40722111222')
  assert.equal(a.website, 'https://rapid.ro')
  assert.equal(a.county, 'București')
  assert.equal(a.rating, 4.6)
  assert.equal(a.ratingCount, 120)
  assert.equal(a.status, 'prospect')
})
test('websites: only plain http(s) with a real host', () => {
  assert.equal(cleanWebsite('rapid.ro'), 'https://rapid.ro')
  assert.equal(cleanWebsite('http://x.ro/a'), 'http://x.ro/a')
  assert.equal(cleanWebsite('javascript:alert(1)'), null)
  assert.equal(cleanWebsite('https://javascript:alert(1)'), null)
  assert.equal(cleanWebsite('ftp://x.ro'), null)
  assert.equal(cleanWebsite('https://user:pw@x.ro'), null)
  assert.equal(cleanWebsite('localhost'), null)
})
test('csv without a name column is refused', () => {
  assert.deepEqual(parsePartnersCsv('foo,bar\n1,2').missingHeaders, ['name'])
})
test('control characters are stripped from text', () => {
  assert.equal(PartnerFields.parse({ name: 'A\u0000B\nC' }).name, 'A B C')
})
test('rates: validation', () => {
  assert.ok(RatesBody.safeParse({ rates: [{ service: 'paint', settlementRon: 200 }] }).success)
  assert.ok(!RatesBody.safeParse({ rates: [{ service: 'wash', settlementRon: 1 }] }).success)
  assert.ok(!RatesBody.safeParse({ rates: [{ service: 'paint', settlementRon: -1 }] }).success)
})
test('haversine: Bucharest–Cluj ≈ 325 km; nearest sorts and skips partners without coordinates', () => {
  const buc = { lat: 44.4268, lng: 26.1025 }, cluj = { lat: 46.7712, lng: 23.6236 }
  const d = haversineKm(buc, cluj)
  assert.ok(d > 315 && d < 335, String(d))
  const list = [{ n: 'far', lat: 46.77, lng: 23.62 }, { n: 'near', lat: 44.43, lng: 26.1 }, { n: 'none', lat: null, lng: null }]
  assert.deepEqual(nearest(list, buc, 3).map((x) => x.n), ['near', 'far'])
  assert.deepEqual(nearest(list, buc, 3, 50).map((x) => x.n), ['near'])
})
