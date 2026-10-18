/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { foundingConfig, profileScore, subscriptionTerms } from '../service'

const cfgOf = (o: object = {}) => foundingConfig({ founding: { enabled: true, perCombo: 3, lockMonths: 12, benefit: 'prioritate la cereri', subscriptionValueRon: 79, subscriptionFounderRon: 49, ...o } })

test('subscriptionTerms: states value, free period, price after and what keeps the place', () => {
  assert.equal(subscriptionTerms(cfgOf()), 'Abonamentul (valoare 79 lei/lună) este gratuit 12 luni, apoi 49 lei/lună, preț garantat. Locul se păstrează dacă profilul să rămână completat (minim 80%) și să răspundeți la cereri.'.replace('dacă profilul să rămână', 'dacă profilul să rămână'))
  assert.equal(subscriptionTerms(cfgOf({ subscriptionValueRon: 0, subscriptionFounderRon: 0, minProfileScore: 0, maxMissedRequests: 0 })), 'Abonamentul este gratuit 12 luni.')
  assert.equal(subscriptionTerms(cfgOf({ includeSubscription: false })), ''); assert.equal(subscriptionTerms(cfgOf({ lockMonths: 0 })), '')
})
test('profileScore uses the same weights as the firm dashboard', () => {
  const full = { logoUrl: 'l', coverUrl: 'c', summary: 'x'.repeat(60), body: 'y'.repeat(200), data: { servicii: ['a'], program: 'L-V', certificari: ['ISO'] }, projectsWithPhotos: 3 }
  assert.equal(profileScore(full), 100); assert.equal(profileScore({ ...full, logoUrl: null, projectsWithPhotos: 2 }), 60)
  assert.equal(profileScore({ logoUrl: null, coverUrl: null, summary: null, body: null, data: null, projectsWithPhotos: 0 }), 0)
})

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, F: typeof import('../service'), O: typeof import('../../preview/offer')
const NOW = new Date('2026-11-02T10:00:00Z'), DAY = 86_400_000
const e = (id: string) => db.websiteEntry.findUnique({ where: { id } })
const setCfg = (o: object) => db.websiteChannel.update({ where: { businessLineId: 'bl' }, data: { config: { founding: { enabled: true, perCombo: 3, lockMonths: 12, benefit: 'prioritate', ...o } } } })
const good = { logoUrl: 'l', coverUrl: 'c', summary: 'x'.repeat(70), body: 'y'.repeat(250) }

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); F = await import('../service'); O = await import('../../preview/offer')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteRequestDelivery","WebsiteRequest","WebsiteFoundingSlot","WebsiteEntry","WebsiteCollection","WebsiteChannel","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteChannel.create({ data: { businessLineId: 'bl' } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  for (const id of ['a', 'b', 'c', 'd']) await db.websiteEntry.create({ data: { id, businessLineId: 'bl', collectionId: 'c', slug: id, title: id.toUpperCase(), status: 'published', county: 'Mureș', ...(id === 'a' ? good : {}), data: { servicii: id === 'b' ? ['instalatii-sanitare', 'climatizare'] : ['instalatii-sanitare'], program: 'L-V', certificari: ['ISO'] } } })
})
after(async () => { if (db) await db.$disconnect() })

test('claiming a place grants the abonament plan until the price lock ends; never shortens a longer plan; off switches respected', { skip }, async () => {
  await setCfg({ perCombo: 5 })
  const r = await F.claimSlots(await e('a'), NOW)
  const until = new Date(NOW); until.setMonth(until.getMonth() + 12)
  assert.equal(r.subscriptionUntil, until.toISOString()); const a = await e('a'); assert.deepEqual([a.plan, a.planUntil.toISOString()], ['abonament', until.toISOString()])
  await F.claimSlots(await e('a'), NOW); assert.equal((await e('a')).planUntil.toISOString(), until.toISOString())   // idempotent
  const longer = new Date(NOW.getTime() + 900 * DAY); await db.websiteEntry.update({ where: { id: 'c' }, data: { plan: 'abonament', planUntil: longer } })
  await F.claimSlots(await e('c'), NOW); assert.equal((await e('c')).planUntil.toISOString(), longer.toISOString())
  await setCfg({ perCombo: 5, includeSubscription: false }); const rd = await F.claimSlots(await e('d'), NOW)
  assert.equal(rd.subscriptionUntil, undefined); assert.equal((await e('d')).plan, 'gratuit')
  await db.websiteFoundingSlot.deleteMany({ where: { entryId: 'd' }, }); await setCfg({ perCombo: 5, lockMonths: 0 }); await F.claimSlots(await e('d'), NOW); assert.equal((await e('d')).plan, 'gratuit')
  await db.websiteFoundingSlot.deleteMany({ where: { entryId: 'd' } })
})

test('releasing a place takes the founder plan back unless other places or a longer manual plan remain', { skip }, async () => {
  await setCfg({ perCombo: 5 })
  await F.claimSlots(await e('b'), NOW)                                        // two services → two places, one plan
  const slots = await db.websiteFoundingSlot.findMany({ where: { entryId: 'b' }, orderBy: { category: 'asc' } }); assert.equal(slots.length, 2)
  assert.equal((await F.removeSlot('bl', slots[0].id)).planReverted, false); assert.equal((await e('b')).plan, 'abonament')
  assert.deepEqual(await F.removeSlot('bl', slots[1].id), { removed: 1, planReverted: true }); assert.deepEqual([(await e('b')).plan, (await e('b')).planUntil], ['gratuit', null])
  const sa = await db.websiteFoundingSlot.findFirst({ where: { entryId: 'c' } }); assert.equal((await F.removeSlot('bl', sa.id)).planReverted, false); assert.equal((await e('c')).plan, 'abonament')   // longer manual plan stays
  assert.deepEqual(await F.removeSlot('bl', 'nope'), { removed: 0 })
})

test('places to review: after the grace period, incomplete profile or unanswered requests; answered or complete ones are fine', { skip }, async () => {
  await setCfg({ perCombo: 5, graceDays: 30, minProfileScore: 80, maxMissedRequests: 3 })
  await db.websiteFoundingSlot.deleteMany({}); const old = new Date(NOW.getTime() - 40 * DAY), fresh = new Date(NOW.getTime() - 5 * DAY)
  const slot = (entryId: string, claimedAt: Date) => db.websiteFoundingSlot.create({ data: { businessLineId: 'bl', entryId, county: 'Mureș', category: 'instalatii-sanitare', claimedAt } })
  await slot('a', old); await slot('b', old); await slot('c', fresh)
  for (let i = 0; i < 3; i++) { const p = await db.websiteEntry.create({ data: { id: `pa${i}`, businessLineId: 'bl', collectionId: 'c', slug: `pa${i}`, title: `P${i}`, status: 'published', parentId: 'a', data: {} } }); await db.websiteMedia.create({ data: { entryId: p.id, storageKey: `k${i}`, url: `https://x/${i}.webp` } }) }
  const req = await db.websiteRequest.create({ data: { id: 'r', businessLineId: 'bl', type: 'general', category: 'instalatii-sanitare', county: 'Mureș', description: 'x'.repeat(20), customerName: 'n', customerEmail: 'e@e.ro', customerPhone: '0730111111', expiresAt: new Date(NOW.getTime() - 20 * DAY), createdAt: new Date(NOW.getTime() - 30 * DAY) } })
  for (let i = 0; i < 3; i++) { const q = await db.websiteRequest.create({ data: { id: `q${i}`, businessLineId: 'bl', type: 'general', category: 'instalatii-sanitare', county: 'Mureș', description: 'x'.repeat(20), customerName: 'n', customerEmail: 'e@e.ro', customerPhone: '0730111111', expiresAt: new Date(NOW.getTime() - 20 * DAY) } }); await db.websiteRequestDelivery.create({ data: { requestId: q.id, entryId: 'b', businessLineId: 'bl', status: 'sent', sentAt: new Date(NOW.getTime() - 25 * DAY) } }) }
  void req
  const r = await F.inactiveSlots('bl', NOW)
  assert.deepEqual(r.map((x) => x.entryId), ['b'])                                       // a: complete profile; c: still in the grace period
  assert.match(r[0]!.reasons.join(' | '), /Profil completat 30%/); assert.match(r[0]!.reasons.join(' | '), /3 cereri fără răspuns/)
  await db.websiteRequestDelivery.updateMany({ where: { entryId: 'b' }, data: { status: 'declined' } })
  assert.doesNotMatch((await F.inactiveSlots('bl', NOW))[0]!.reasons.join('|'), /fără răspuns/)                    // answering (even declining) counts
  await setCfg({ perCombo: 5, minProfileScore: 0, maxMissedRequests: 0 }); assert.deepEqual(await F.inactiveSlots('bl', NOW), [])
})

test('the accept screen explains the subscription, the price after and what keeps the place', { skip }, async () => {
  await db.websiteFoundingSlot.deleteMany({}); await setCfg({ perCombo: 3, subscriptionValueRon: 79, subscriptionFounderRon: 49 })
  const o = await O.buildOffer('bl', { county: 'Mureș', city: null, data: { servicii: ['instalatii-sanitare'] } })
  const t = o.lines.join(' '); assert.match(t, /Abonamentul \(valoare 79 lei\/lună\) este gratuit 12 luni, apoi 49 lei\/lună/); assert.match(t, /Acum mai sunt 3 din 3 locuri/)
})
