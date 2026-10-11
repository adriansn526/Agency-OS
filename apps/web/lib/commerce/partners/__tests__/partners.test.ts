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

// ─── storefront selection ───
import { parseNearbyQuery, selectNearby, type ActivePartner } from '../storefront'
const P = (id: string, name: string, lat: number | null, lng: number | null, county: string | null, rates: ActivePartner['rates']): ActivePartner => ({ id, name, city: county, county, address: 'Str. X 1', lat, lng, rates })
const q = (s: string) => parseNearbyQuery(new URLSearchParams(s))
const partners = [
  P('far', 'Cluj Auto', 46.77, 23.62, 'Cluj', [{ service: 'paint', bulkyClass: null, salePriceRon: 500, leadTimeDays: 5 }]),
  P('near', 'Buc Rapid', 44.44, 26.1, 'București', [{ service: 'paint', bulkyClass: null, salePriceRon: 400, leadTimeDays: 3 }, { service: 'paint', bulkyClass: 'large', salePriceRon: 650, leadTimeDays: 4 }, { service: 'mount', bulkyClass: null, salePriceRon: 150, leadTimeDays: 1 }]),
  P('mid', 'Buc Alfa', 44.5, 26.2, 'București', [{ service: 'mount', bulkyClass: null, salePriceRon: 170, leadTimeDays: 2 }]),
  P('nocoord', 'Buc Fara Coord', null, null, 'București', [{ service: 'mount', bulkyClass: null, salePriceRon: 160, leadTimeDays: null }]),
  P('noprice', 'Fara Pret', 44.43, 26.09, 'București', [{ service: 'mount', bulkyClass: null, salePriceRon: null, leadTimeDays: 1 }]),
]
test('nearby: sorted by distance, far partners cut by maxKm, no price = not offered', () => {
  const r = selectNearby(partners, q('lat=44.4268&lng=26.1025&limit=10'))
  assert.equal(r.mode, 'distance')
  assert.deepEqual(r.items.map((i) => i.id), ['near', 'mid'])
  assert.ok(r.items[0]!.distanceKm! < r.items[1]!.distanceKm!)
  assert.equal(selectNearby(partners, q('lat=44.4268&lng=26.1025&maxKm=500&limit=10')).items.at(-1)!.id, 'far')
})
test('nearby: size class picks the specific price, otherwise the any-size one', () => {
  const large = selectNearby(partners, q('lat=44.4268&lng=26.1025&service=paint&bulky=large')).items[0]!
  assert.deepEqual(large.services, [{ service: 'paint', priceRon: 650, leadTimeDays: 4 }])
  const std = selectNearby(partners, q('lat=44.4268&lng=26.1025&service=paint&bulky=small')).items[0]!
  assert.equal(std.services[0]!.priceRon, 400)
})
test('nearby: partners without coordinates follow the measured ones in the same county only', () => {
  const r = selectNearby(partners, q('lat=44.4268&lng=26.1025&county=Bucure%C8%99ti&service=mount&limit=10'))
  assert.deepEqual(r.items.map((i) => i.id), ['near', 'mid', 'nocoord'])
  assert.equal(r.items[2]!.distanceKm, null)
  assert.ok(!selectNearby(partners, q('lat=44.4268&lng=26.1025&service=mount&limit=10')).items.some((i) => i.id === 'nocoord'))
})
test('area and all modes, diacritics-insensitive county', () => {
  assert.equal(selectNearby(partners, q('county=Bucuresti&limit=10')).mode, 'area')
  assert.deepEqual(selectNearby(partners, q('county=Bucuresti&service=mount&limit=10')).items.map((i) => i.id), ['mid', 'near', 'nocoord'].sort((a, b) => partners.find((p) => p.id === a)!.name.localeCompare(partners.find((p) => p.id === b)!.name, 'ro')))
  assert.equal(selectNearby(partners, q('')).mode, 'all')
  assert.equal(selectNearby(partners, q('limit=2')).items.length, 2)
})
test('response never carries internal fields', () => {
  const item = selectNearby(partners, q('lat=44.4268&lng=26.1025')).items[0]! as Record<string, unknown>
  for (const k of ['phone', 'email', 'settlementRon', 'notes', 'lat', 'lng', 'rating']) assert.ok(!(k in item), k)
})
test('query validation', () => {
  for (const bad of ['lat=44', 'lat=abc&lng=1', 'lat=95&lng=1', 'service=wash', 'bulky=huge', 'limit=0', 'limit=99', 'maxKm=0']) assert.throws(() => q(bad), bad)
  assert.equal(q('').limit, 3)
})

// ─── Google Places parsing / classification ───
import { classify, locationFromAddress, parsePlace } from '../places'
test('classify: paint/body from names, unknown stays unknown', () => {
  assert.deepEqual(classify('Vopsitorie Auto Alfa', []), { paintLikely: true, bodyLikely: false, relevant: true })
  assert.equal(classify('Tinichigerie și Vopsitorie Rapid', []).bodyLikely, true)
  assert.equal(classify('Caroserie Auto Pro', []).bodyLikely, true)
  const u = classify('Service Auto Popescu', ['car_repair'])
  assert.deepEqual([u.paintLikely, u.bodyLikely, u.relevant], [false, false, true])
  assert.equal(classify('Florăria Bella', ['florist']).relevant, false)
})
test('address → city/county', () => {
  assert.deepEqual(locationFromAddress('Str. X 5, Sector 3, 030167 București, România'), { city: 'București', county: 'București' })
  assert.deepEqual(locationFromAddress('Str. Y 1, 700000 Iași, România'), { city: 'Iași', county: null })
  assert.deepEqual(locationFromAddress(null), { city: null, county: null })
})
test('parsePlace: normalises phone/website, drops bad maps links, ignores incomplete rows', () => {
  const p = parsePlace({ id: 'ChIJ1', displayName: { text: 'Vopsitorie\u0000 Alfa' }, formattedAddress: 'Str. X 5, Sector 3, București', internationalPhoneNumber: '+40 722 111 222', websiteUri: 'https://alfa.ro/', googleMapsUri: 'https://maps.google.com/?cid=1', rating: 4.5, userRatingCount: 80, types: ['car_repair'] })!
  assert.equal(p.name, 'Vopsitorie Alfa')
  assert.equal(p.phone, '+40722111222')
  assert.equal(p.website, 'https://alfa.ro')
  assert.equal(p.county, 'București')
  assert.equal(p.paintLikely, true)
  assert.equal(parsePlace({ id: 'x', displayName: { text: 'A' }, googleMapsUri: 'https://evil.example/x' })!.mapsUrl, null)
  assert.equal(parsePlace({ displayName: { text: 'no id' } }), null)
  assert.equal(parsePlace({ id: 'x' }), null)
})

// ─── coordinates: provenance, expiry, Google/OSM clients ───
import { coordsState } from '../geo'
import { googleLocation, osmGeocode } from '../coords'
const D = (days: number, now = new Date('2026-10-20T00:00:00Z')) => new Date(now.getTime() - days * 86_400_000)
const NOW = new Date('2026-10-20T00:00:00Z')
test('coordsState: google coordinates age out, osm/manual do not', () => {
  const c = (source: string | null, at: Date | null, lat: number | null = 44.4) => ({ lat, lng: lat == null ? null : 26.1, coordsSource: source, coordsFetchedAt: at })
  assert.equal(coordsState(c(null, null, null), NOW), 'missing')
  assert.equal(coordsState(c('google', D(5)), NOW), 'fresh')
  assert.equal(coordsState(c('google', D(20)), NOW), 'refresh')
  assert.equal(coordsState(c('google', D(29.9)), NOW), 'refresh')
  assert.equal(coordsState(c('google', D(30)), NOW), 'expired')
  assert.equal(coordsState(c('google', null), NOW), 'expired')
  assert.equal(coordsState(c('osm', D(400)), NOW), 'permanent')
  assert.equal(coordsState(c('manual', null), NOW), 'permanent')
  assert.equal(coordsState(c(null, null), NOW), 'permanent') // legacy rows typed by hand before provenance existed
})
const json = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
test('googleLocation: asks for the location field only; 404 and malformed bodies give null', async () => {
  process.env.GOOGLE_MAPS_API_KEY = 'test-key-123456789012345'
  let seen: RequestInit | undefined, seenUrl = ''
  const spy = (async (u: string, init: RequestInit) => { seen = init; seenUrl = u; return new Response(JSON.stringify({ location: { latitude: 44.4, longitude: 26.1 } })) }) as unknown as typeof fetch
  assert.deepEqual(await googleLocation('ChIJabcdefghij', spy), { lat: 44.4, lng: 26.1 })
  assert.equal((seen!.headers as Record<string, string>)['X-Goog-FieldMask'], 'location')
  assert.ok(!seenUrl.includes('test-key'), 'key must be in a header, not the URL')
  assert.equal(await googleLocation('ChIJabcdefghij', json({}, 404)), null)
  assert.equal(await googleLocation('ChIJabcdefghij', json({ nothing: 1 })), null)
  assert.equal(await googleLocation('bad id!', json({ location: { latitude: 1, longitude: 1 } })), null)
  await assert.rejects(() => googleLocation('ChIJabcdefghij', json({}, 403)), /403/)
})
test('osmGeocode: identifies the app, accepts Romanian hits only', async () => {
  let ua = ''
  const ok = (async (_u: string, init: RequestInit) => { ua = (init.headers as Record<string, string>)['User-Agent']!; return new Response(JSON.stringify([{ lat: '44.4268', lon: '26.1025' }])) }) as unknown as typeof fetch
  assert.deepEqual(await osmGeocode('Str. Test 1', 'București', ok), { lat: 44.4268, lng: 26.1025 })
  assert.match(ua, /AgencyOS/)
  assert.equal(await osmGeocode('Rue de Rivoli 1', 'Paris', json([{ lat: '48.8566', lon: '2.3522' }])), null)
  assert.equal(await osmGeocode('Str. Test 1', 'București', json([])), null)
  assert.equal(await osmGeocode('x', null, json([{ lat: '44', lon: '26' }])), null) // too short to be an address
  assert.equal(await osmGeocode('Str. Test 1', 'București', json({}, 429)), null)
})
