/** Run with: npx tsx --test lib/website/storefront/__tests__/storefront.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateWebsiteKey, hashWebsiteKey, keyMatches, parseStoredKeys, WEBSITE_KEY_RE } from '../keys'
import { parseListQuery } from '../query'
import { serializeDetail, serializeListItem } from '../serialize'
import { WebsiteInputError } from '../auth'

const sp = (q: string) => new URLSearchParams(q)
const fields = [{ key: 'tip', type: 'select', filterable: true }, { key: 'intern', type: 'text' }]

test('generated keys have the ws_ prefix, match their hash and nothing else', () => {
  const a = generateWebsiteKey('Frontend')
  const b = generateWebsiteKey('Other')
  assert.match(a.key, /^ws_[A-Za-z0-9_-]{43}$/)
  assert.equal(a.stored.hash, hashWebsiteKey(a.key))
  assert.equal(keyMatches([a.stored], a.key), true)
  assert.equal(keyMatches([a.stored], b.key), false)
  assert.equal(keyMatches([], a.key), false)
})

test('the stored record never contains the plain key', () => {
  const g = generateWebsiteKey('x')
  assert.equal(JSON.stringify(g.stored).includes(g.key), false)
})

test('Authorization header only accepts ws_ keys (Commerce sf_ keys are rejected)', () => {
  assert.ok(WEBSITE_KEY_RE.test(`Bearer ${generateWebsiteKey('x').key}`))
  assert.equal(WEBSITE_KEY_RE.test('Bearer sf_abcdefghijklmnopqrstuvwxyz'), false)
  assert.equal(WEBSITE_KEY_RE.test('ws_abcdefghijklmnopqrstuvwxyz'), false)
})

test('parseStoredKeys ignores malformed entries', () => {
  const ok = generateWebsiteKey('ok').stored
  assert.deepEqual(parseStoredKeys([ok, { hash: 'nothex', id: 'a' }, null, 'x', { id: 'b' }]), [ok])
  assert.deepEqual(parseStoredKeys(null), [])
  assert.deepEqual(parseStoredKeys({}), [])
})

test('parseListQuery applies defaults and validates bounds', () => {
  const q = parseListQuery(sp('collection=companii'), fields)
  assert.deepEqual([q.page, q.limit, q.sort, q.verified, q.q], [1, 20, 'featured', false, null])
  assert.throws(() => parseListQuery(sp('collection=companii&limit=51'), fields), WebsiteInputError)
  assert.throws(() => parseListQuery(sp('collection=companii&limit=0'), fields), WebsiteInputError)
  assert.throws(() => parseListQuery(sp('collection=companii&page=abc'), fields), WebsiteInputError)
  assert.throws(() => parseListQuery(sp('collection=companii&sort=price'), fields), WebsiteInputError)
  assert.throws(() => parseListQuery(sp(''), fields), WebsiteInputError)
  assert.throws(() => parseListQuery(sp('collection=../etc'), fields), WebsiteInputError)
})

test('only filterable collection fields can be used as filters', () => {
  assert.deepEqual(parseListQuery(sp('collection=c&f.tip=firma'), fields).fieldFilters, { tip: 'firma' })
  assert.throws(() => parseListQuery(sp('collection=c&f.intern=x'), fields), WebsiteInputError) // not filterable
  assert.throws(() => parseListQuery(sp('collection=c&f.nope=x'), fields), WebsiteInputError) // unknown
})

const entry = {
  slug: 'delta', title: 'Delta', summary: 's', body: '<p>b</p>', city: 'Cluj', county: 'Cluj', address: 'Str. 1', lat: 46.7, lng: 23.6,
  coverUrl: null, logoUrl: null, verified: true, featured: false, ratingAvg: '4.60', ratingCount: 3, data: { tip: 'firma' },
  seoTitle: 't', seoDescription: 'd', phone: '0740', websiteUrl: 'https://d.ro', publishedAt: new Date('2026-01-01'), updatedAt: new Date('2026-02-01'),
  // private columns that must never be serialized
  email: 'secret@delta.ro', leadId: 'lead_1', clientId: 'cl_1', tenantId: 'tn_1', externalId: '7', externalSource: 'wp', status: 'published', businessLineId: 'bl',
}

test('public shapes never include private columns', () => {
  const blob = JSON.stringify([serializeListItem(entry, 'companii'), serializeDetail(entry, 'companii', [], [])])
  for (const secret of ['secret@delta.ro', 'lead_1', 'cl_1', 'tn_1', 'externalId', 'businessLineId', '"email"']) {
    assert.equal(blob.includes(secret), false, `leaked: ${secret}`)
  }
})

test('list items omit phone and body; detail adds them, with ratings as numbers', () => {
  const list = serializeListItem(entry, 'companii') as Record<string, unknown>
  assert.equal('phone' in list || 'body' in list, false)
  assert.equal(list.ratingAvg, 4.6)
  const d = serializeDetail(entry, 'companii', [{ url: 'u', alt: null, kind: 'image', width: null, height: null }], [
    { authorName: 'Ion', rating: 5, title: null, body: 'ok', createdAt: new Date('2026-03-01') },
  ])
  assert.equal(d.phone, '0740')
  assert.equal(d.media.length, 1)
  assert.deepEqual(Object.keys(d.reviews[0]!).sort(), ['authorName', 'body', 'createdAt', 'rating', 'title'])
})
