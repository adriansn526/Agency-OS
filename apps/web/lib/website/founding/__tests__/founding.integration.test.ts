/** DB-backed checks of founding-partner places. Needs FOUNDING_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.FOUNDING_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, F: typeof import('../service'), P: typeof import('../../preview/service'), Q: typeof import('../../storefront/queries'), C: typeof import('../../preview/campaign')

const entry = (id: string) => db.websiteEntry.findUnique({ where: { id } })
const cfg = (o: object) => db.websiteChannel.update({ where: { businessLineId: 'bl' }, data: { config: { founding: { enabled: true, perCombo: 2, lockMonths: 12, benefit: 'preț de lansare garantat 12 luni', ...o } } } })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); F = await import('../service'); P = await import('../../preview/service'); Q = await import('../../storefront/queries'); C = await import('../../preview/campaign')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteFoundingSlot","WebsiteLayoutVersion","WebsitePartnerSession","WebsitePartnerLogin","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteChannel.create({ data: { businessLineId: 'bl' } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  const lead = (id: string) => db.lead.create({ data: { id, businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: id, contactPerson: 'N/A', email: 'N/A' } })
  for (const [id, county, servicii] of [['a', 'Mureș', ['instalatii-sanitare', 'climatizare']], ['b', 'Mureș', ['instalatii-sanitare']], ['c', 'Mureș', ['instalatii-sanitare']], ['d', 'Cluj', ['instalatii-sanitare']], ['e', null, ['instalatii-sanitare']]] as const) {
    await lead('l' + id)
    await db.websiteEntry.create({ data: { id, businessLineId: 'bl', collectionId: col.id, slug: id, title: id.toUpperCase(), status: 'preview', leadId: 'l' + id, county, partnerAccess: false, data: { servicii } } })
  }
})
after(async () => { if (db) await db.$disconnect() })

test('the programme is off by default: accepting claims nothing', { skip }, async () => {
  assert.equal(F.foundingConfig(null).enabled, false)
  const r = await F.claimSlots(await entry('a'))
  assert.deepEqual([r.enabled, r.claimed.length, r.full.length], [false, 0, 0]); assert.equal(await db.websiteFoundingSlot.count(), 0)
})

test('first come, first served per county × service; full places are reported, never over-filled; idempotent', { skip }, async () => {
  await cfg({})
  const a = await F.claimSlots(await entry('a'))
  assert.deepEqual(a.claimed.map((c) => [c.category, c.taken, c.left]), [['instalatii-sanitare', 1, 1], ['climatizare', 1, 1]])   // one place per service the firm offers
  const b = await F.claimSlots(await entry('b')); assert.deepEqual(b.claimed.map((c) => c.taken), [2])
  const c = await F.claimSlots(await entry('c')); assert.equal(c.claimed.length, 0); assert.deepEqual(c.full.map((x) => [x.category, x.taken, x.total]), [['instalatii-sanitare', 2, 2]])
  const again = await F.claimSlots(await entry('a')); assert.equal(again.claimed.length, 2); assert.equal(await db.websiteFoundingSlot.count({ where: { entryId: 'a' } }), 2) // re-accepting changes nothing
  assert.equal((await F.claimSlots(await entry('d'))).claimed.length, 1)    // another county has its own places
  assert.deepEqual((await F.claimSlots(await entry('e'))).claimed, [])      // no county → nothing to claim
  const s = await db.websiteFoundingSlot.findFirst({ where: { entryId: 'a' } }); assert.ok(s.lockUntil > new Date(Date.now() + 300 * 86_400_000))   // price lock ≈ 12 months
})

test('simultaneous acceptances cannot overshoot the capacity', { skip }, async () => {
  const col = await db.websiteCollection.findFirst({ where: { key: 'companii' } })
  const ids = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']
  for (const id of ids) { await db.lead.create({ data: { id: 'l' + id, businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: id, contactPerson: 'N/A', email: 'N/A' } }); await db.websiteEntry.create({ data: { id, businessLineId: 'bl', collectionId: col.id, slug: id, title: id, status: 'preview', leadId: 'l' + id, county: 'Brașov', data: { servicii: ['demolari'] } } }) }
  await Promise.all(ids.map(async (id) => F.claimSlots(await entry(id))))
  assert.equal(await db.websiteFoundingSlot.count({ where: { county: 'Brașov', category: 'demolari' } }), 2) // capacity 2, six at once
})

test('accepting a preview claims places and says so; the public API shows the founder flag', { skip }, async () => {
  await db.websiteEntry.update({ where: { id: 'e' }, data: { county: 'Iași' } })
  await db.websiteEntry.update({ where: { id: 'e' }, data: { status: 'preview' } })
  const { token } = await P.issuePreview('bl', 'e')
  const r: any = await P.respondPreview('bl', token, { action: 'accept', acceptTerms: true, acceptGdpr: true, contactName: 'Ion Popescu', termsVersion: 'v1' })
  assert.equal(r.state, 'ok'); assert.deepEqual(r.founder.claimed.map((c: any) => c.category), ['instalatii-sanitare'])
  assert.equal((await entry('e')).partnerAccess, true)
  await db.websiteEntry.update({ where: { id: 'e' }, data: { status: 'published', publishedAt: new Date() } })
  await db.websiteEntry.update({ where: { id: 'a' }, data: { status: 'published', publishedAt: new Date() } })
  const ctx = { businessLineId: 'bl', channelId: 'x' }
  const list: any = await Q.listEntries(ctx, new URLSearchParams('collection=companii&limit=20'))
  const flag = Object.fromEntries(list.items.map((i: any) => [i.slug, i.founder])); assert.equal(flag.e, true); assert.equal(flag.a, true)
  assert.equal(((await Q.getEntry(ctx, 'companii', 'e')) as any).founder, true)
  await db.websiteEntry.update({ where: { id: 'b' }, data: { status: 'published', publishedAt: new Date() } })
  assert.equal(((await Q.getEntry(ctx, 'companii', 'b')) as any).founder, true)   // b took a place earlier
  await db.websiteEntry.update({ where: { id: 'c' }, data: { status: 'published', publishedAt: new Date() } })
  assert.equal(((await Q.getEntry(ctx, 'companii', 'c')) as any).founder, false)  // c found the places full
})

test('the campaign sentence is computed from real counts and disappears when it would not be true', { skip }, async () => {
  await db.websiteFoundingSlot.deleteMany({}); await cfg({ perCombo: 3 })
  const ch = await db.websiteChannel.findUnique({ where: { businessLineId: 'bl' } })
  const conf = F.foundingConfig(ch.config)
  const a = await entry('a')
  assert.equal(await F.founderOffer('bl', a, conf), 'Acum mai sunt 3 din 3 locuri de partener fondator pentru instalații sanitare în Mureș: preț de lansare garantat 12 luni')
  await F.claimSlots(await entry('b')); assert.match(await F.founderOffer('bl', a, conf), /mai sunt 2 din 3/)
  assert.equal(await F.founderOffer('bl', a, { ...conf, benefit: '' }), '')           // no benefit text → no claim
  assert.equal(await F.founderOffer('bl', a, { ...conf, enabled: false }), '')
  assert.equal(await F.founderOffer('bl', { county: null, data: a.data }, conf), '')
  await cfg({ perCombo: 1 }); const full = F.foundingConfig((await db.websiteChannel.findUnique({ where: { businessLineId: 'bl' } })).config)
  assert.match(await F.founderOffer('bl', { county: 'Mureș', data: { servicii: ['instalatii-sanitare', 'climatizare'] } }, full), /climatizare/) // sanitare is full → the next service with a free place
  await db.websiteEntry.update({ where: { id: 'a' }, data: { status: 'preview' } }) // previews are for firms that are not published yet
  const vars = await C.previewVarsFor('bl', ['la'], { siteUrl: 'https://intraconstruct.ro', now: new Date('2026-11-02T08:00:00Z') })
  assert.match(vars.get('la')!.founder_offer, /locuri de partener fondator/)
})

test('overview, settings and freeing a place', { skip }, async () => {
  const o = await F.overview('bl'); assert.ok(o.totalSlots >= 1); assert.equal(o.config.perCombo, 1)
  assert.deepEqual(Object.keys(o.combos[0]!.firms[0]!).sort(), ['claimedAt', 'entryId', 'lockUntil', 'slotId', 'title'])
  const saved = await F.saveConfig('bl', { enabled: true, perCombo: 4, lockMonths: 0, benefit: ' test ' }); assert.deepEqual(saved, { enabled: true, perCombo: 4, lockMonths: 0, benefit: 'test', includeSubscription: true, subscriptionValueRon: 0, subscriptionFounderRon: 0, graceDays: 30, minProfileScore: 80, maxMissedRequests: 3 })
  await assert.rejects(F.saveConfig('bl', { enabled: true, perCombo: 0 }), /too_small|Too small|>=1|Number must/i)
  assert.equal(await F.saveConfig('nope', { enabled: true }), null)
  const slot = o.combos[0]!.firms[0]!
  assert.deepEqual(await F.removeSlot('other', slot.slotId), { removed: 0 })       // another line cannot free it
  assert.equal((await F.removeSlot('bl', slot.slotId)).removed, 1)
})
