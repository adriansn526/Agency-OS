import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickFirms, teaserText, type Candidate } from '../routing'

const c = (id: string, o: Partial<Candidate> = {}): Candidate => ({ id, city: 'Cluj-Napoca', ratingAvg: null, ratingCount: 0, lastDeliveryAt: null, ...o })
const A = { maxFirms: 3, selection: 'rating' as const }

test('rating: best average first, ties by review count; review filters drop firms', () => {
  const l = [c('a', { ratingAvg: 4.2, ratingCount: 3 }), c('b', { ratingAvg: 4.8, ratingCount: 10 }), c('d', { ratingAvg: 4.8, ratingCount: 20 }), c('e')]
  assert.deepEqual(pickFirms(l, A, null).map((x) => x.id), ['d', 'b', 'a'])
  assert.deepEqual(pickFirms(l, { ...A, minReviews: 5 }, null).map((x) => x.id), ['d', 'b'])
  assert.deepEqual(pickFirms(l, { ...A, minRating: 4.5, maxFirms: 1 }, null).map((x) => x.id), ['d'])
  assert.deepEqual(pickFirms(l, { ...A, minReviews: 50 }, null), [])
})
test('nearest: same city first (diacritics ignored), then rating', () => {
  const l = [c('far', { city: 'Turda', ratingAvg: 5, ratingCount: 9 }), c('near', { city: 'Târgu Mureș', ratingAvg: 3, ratingCount: 1 })]
  assert.deepEqual(pickFirms(l, { maxFirms: 2, selection: 'nearest' }, 'Targu Mures').map((x) => x.id), ['near', 'far'])
})
test('round robin: least recently served first, never served before served', () => {
  const l = [c('x', { lastDeliveryAt: new Date('2026-10-02') }), c('y', { lastDeliveryAt: new Date('2026-10-01') }), c('z')]
  assert.deepEqual(pickFirms(l, { maxFirms: 2, selection: 'round_robin' }, null).map((x) => x.id), ['z', 'y'])
})
test('result is capped and deterministic', () => {
  const l = ['c', 'a', 'b', 'd'].map((id) => c(id))
  assert.deepEqual(pickFirms(l, { maxFirms: 2, selection: 'rating' }, null).map((x) => x.id), ['a', 'b'])
})
test('teaser hides phones and emails and caps length', () => {
  const t = teaserText('Sunați la 0745 123 456 sau scrieți la ion@mail.ro pentru renovare baie')
  assert.ok(!/0745|ion@/.test(t)); assert.match(t, /\[telefon ascuns\]/); assert.match(t, /\[email ascuns\]/)
  assert.ok(teaserText('x'.repeat(500)).length <= 220)
  assert.match(teaserText('Baie 2 camere, 12 mp, buget 5000 lei'), /12 mp, buget 5000/)
})
