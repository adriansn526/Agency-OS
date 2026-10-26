/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema incl. website_rules.sql and website_requests.sql (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../service')
const CAT = 'instalatii-sanitare'
const sent: { to: string; subject: string; text: string }[] = []
const notifier = { email: async (to: string, subject: string, _h: string, text: string) => { sent.push({ to, subject, text }) }, sms: async () => {} }
const body = (o: object = {}) => ({ type: 'general', category: CAT, county: 'Mureș', city: 'Târgu Mureș', description: 'Schimb țevi baie, apartament 3 camere', name: 'Ion Client', email: `c${Math.random().toString(36).slice(2)}@mail.ro`, phone: `07${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`, consent: true, ...o })
const rule = (id: string, kind: string, priority: number, conditions: object[], action: object) => db.websiteRule.create({ data: { id, businessLineId: 'bl', kind, name: id, priority, isActive: true, conditions, action } })
const entry = (id: string, o: object = {}) => db.websiteEntry.create({ data: { id, businessLineId: 'bl', collectionId: 'col', slug: id, title: id.toUpperCase(), status: 'published', county: 'Mureș', city: 'Târgu Mureș', email: `${id}@firma.ro`, phone: '0740000000', ratingAvg: 4, ratingCount: 2, data: { servicii: [CAT] }, ...o } })
const as = (id: string) => db.websiteEntry.findUnique({ where: { id } })
const wait = () => new Promise((r) => setTimeout(r, 50))

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../service')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteRequestDelivery","WebsiteRequest","WebsiteRule","WebsiteFoundingSlot","WebsiteEntry","WebsiteCollection","WebsiteChannel","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteCollection.create({ data: { id: 'col', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  await entry('a', { ratingAvg: 4.9, ratingCount: 12 }); await entry('b', { ratingAvg: 4.0, ratingCount: 6 }); await entry('c'); await entry('d', { county: 'Cluj' }); await entry('e', { status: 'draft' })
})
after(async () => { if (db) await db.$disconnect() })

test('general request: default routing sends to one firm; a regional rule with review filter narrows it; other county/unpublished never receive', { skip }, async () => {
  const r1 = await S.createRequest('bl', body(), { notifier }); assert.equal(r1.firms, 1)
  await rule('multi', 'routing', 10, [{ field: 'county', op: 'eq', value: 'Mureș' }], { mode: 'multi', maxFirms: 3, maxAcceptances: 2, selection: 'rating', minReviews: 0, minRating: 0 })
  const r2 = await S.createRequest('bl', body(), { notifier }); await wait()
  const ds = await db.websiteRequestDelivery.findMany({ where: { requestId: r2.id }, orderBy: { entryId: 'asc' } })
  assert.deepEqual(ds.map((d: any) => d.entryId), ['a', 'b', 'c']); assert.ok(!ds.some((d: any) => ['d', 'e'].includes(d.entryId)))
  assert.equal((await db.websiteRequest.findUnique({ where: { id: r2.id } })).maxAcceptances, 2)
  // regional + category rule placed first: one firm with enough reviews
  await rule('single', 'routing', 1, [{ field: 'county', op: 'eq', value: 'Mureș' }, { field: 'category', op: 'eq', value: CAT }], { mode: 'single', maxFirms: 1, maxAcceptances: 1, selection: 'rating', minReviews: 10, minRating: 0 })
  const r3 = await S.createRequest('bl', body(), { notifier })
  assert.equal(r3.firms, 1); assert.equal((await db.websiteRequestDelivery.findFirst({ where: { requestId: r3.id } })).entryId, 'a')
  // nobody qualifies → stored as unrouted
  await db.websiteRule.update({ where: { id: 'single' }, data: { action: { mode: 'single', maxFirms: 1, maxAcceptances: 1, selection: 'rating', minReviews: 500, minRating: 0 } } })
  const r4 = await S.createRequest('bl', body(), { notifier }); assert.equal(r4.firms, 0)
  assert.equal((await db.websiteRequest.findUnique({ where: { id: r4.id } })).status, 'unrouted')
  await db.websiteRule.deleteMany({})
})

test('firm sees a teaser with the price; accepting reveals the customer and records the fee (first requests free)', { skip }, async () => {
  await rule('p', 'pricing', 1, [], { amountRon: 29, freeFirstN: 1 })
  const a = await S.createRequest('bl', body({ type: 'direct', companySlug: 'c', description: 'Sunați la 0745 111 222 pentru baie' }), { notifier })
  const e = await as('c')
  const list = await S.listForPartner('bl', e)
  const item = list.items.find((i: any) => i.id === a.id)!
  assert.equal(item.status, 'sent'); assert.equal(item.customer, null); assert.equal(item.offerRon, 0)   // first request free
  assert.ok(!/0745/.test(item.description))
  const acc = await S.respond('bl', e, a.id, { action: 'accept' }, { notifier })
  assert.equal(acc.state, 'accepted'); assert.equal(acc.request.chargedRon, 0); assert.ok(acc.request.customer?.phone)
  await wait(); assert.ok(sent.some((m) => m.subject.includes('a acceptat cererea')))
  const b = await S.createRequest('bl', body({ type: 'direct', companySlug: 'c' }), { notifier })
  const it2 = (await S.listForPartner('bl', e)).items.find((i: any) => i.id === b.id)!
  assert.equal(it2.offerRon, 29)
  const acc2 = await S.respond('bl', e, b.id, { action: 'accept' }); assert.deepEqual([acc2.state, acc2.request.chargedRon, acc2.request.chargeReason], ['accepted', 29, 'tarif'])
  assert.equal((await S.respond('bl', e, b.id, { action: 'accept' })).state, 'accepted')   // idempotent, no second charge
  assert.equal(await db.websiteRequestDelivery.count({ where: { entryId: 'c', status: 'accepted' } }), 2)
  const adm = await S.adminOverview('bl', {}); assert.equal(adm.owed.find((o: any) => o.entryId === 'c')?.totalRon, 29)
})

test('subscription: direct requests arrive complete and free; general requests still follow the rules', { skip }, async () => {
  await db.websiteEntry.update({ where: { id: 'b' }, data: { plan: 'abonament' } })
  const r = await S.createRequest('bl', body({ type: 'direct', companySlug: 'b' }), { notifier }); await wait()
  const d = await db.websiteRequestDelivery.findFirst({ where: { requestId: r.id } })
  assert.deepEqual([d.status, Number(d.chargedRon), d.chargeReason], ['accepted', 0, 'abonament'])
  assert.ok((await S.listForPartner('bl', await as('b'))).items.find((i: any) => i.id === r.id)!.customer)
  assert.ok(sent.some((m) => m.to === 'b@firma.ro' && /Client: Ion Client/.test(m.text)))
  await db.websiteEntry.update({ where: { id: 'b' }, data: { planUntil: new Date(Date.now() - 1000) } })   // expired subscription = free plan
  const r2 = await S.createRequest('bl', body({ type: 'direct', companySlug: 'b' }), { notifier })
  assert.equal((await db.websiteRequestDelivery.findFirst({ where: { requestId: r2.id } })).status, 'sent')
  await db.websiteEntry.update({ where: { id: 'b' }, data: { plan: 'gratuit', planUntil: null } })
})

test('acceptances are capped atomically; expired and declined requests cannot be accepted', { skip }, async () => {
  await rule('m', 'routing', 1, [], { mode: 'multi', maxFirms: 3, maxAcceptances: 1, selection: 'rating', minReviews: 0, minRating: 0 })
  const r = await S.createRequest('bl', body(), { notifier })
  const es = await Promise.all(['a', 'b', 'c'].map(as))
  const out = await Promise.all(es.map((e: any) => S.respond('bl', e, r.id, { action: 'accept' })))
  assert.deepEqual(out.map((o: any) => o.state).sort(), ['accepted', 'full', 'full'])
  assert.equal(await db.websiteRequestDelivery.count({ where: { requestId: r.id, status: 'accepted' } }), 1)
  const r2 = await S.createRequest('bl', body(), { notifier })
  assert.equal((await S.respond('bl', es[0], r2.id, { action: 'decline' })).state, 'declined')
  assert.equal((await S.respond('bl', es[0], r2.id, { action: 'accept' })).state, 'declined')
  const r3 = await S.createRequest('bl', body(), { notifier })
  await assert.rejects(S.respond('bl', es[0], r3.id, { action: 'accept' }, { now: new Date(Date.now() + 80 * 3_600_000) }), /expirat/)
  await assert.rejects(S.respond('bl', es[0], 'nope', { action: 'accept' }), /nu există/)
})

test('validation: unknown category, firm not offering the service, contact flood', { skip }, async () => {
  await assert.rejects(S.createRequest('bl', body({ category: 'nu-exista' })), /Categorie/)
  await assert.rejects(S.createRequest('bl', body({ type: 'direct', companySlug: 'c', category: 'climatizare' })), /nu oferă/)
  await assert.rejects(S.createRequest('bl', body({ type: 'direct', companySlug: 'e' })), /nu există/)   // draft firm
  await assert.rejects(S.createRequest('bl', body({ phone: '123' })), /Telefon/)
  const fixed = body()
  for (let i = 0; i < 5; i++) await S.createRequest('bl', { ...fixed })
  await assert.rejects(S.createRequest('bl', { ...fixed }), /mai multe cereri/)
})

test('admin overview: the source of a request (page + attribution) is returned and parsed', { skip }, async () => {
  const withSrc = await S.createRequest('bl', body({ email: 'sursa1@x.ro', phone: '0745 000 111', sourcePage: '/preturi/zugravit?utm_source=hidropro&utm_medium=referral&utm_campaign=pas-urmator&ref=hidropro.ro' }))
  const plain = await S.createRequest('bl', body({ email: 'sursa2@x.ro', phone: '0745 000 222', sourcePage: '/lucrari/instalatii-sanitare' }))
  const none = await S.createRequest('bl', body({ email: 'sursa3@x.ro', phone: '0745 000 333' }))
  const items = (await S.adminOverview('bl', {})).items as any[]
  const find = (id: string) => items.find((i) => i.id === id)
  assert.equal(find(withSrc.id).source.label, 'hidropro'); assert.equal(find(withSrc.id).source.campaign, 'pas-urmator'); assert.equal(find(withSrc.id).source.page, '/preturi/zugravit')
  assert.equal(find(plain.id).source.label, null); assert.equal(find(plain.id).source.page, '/lucrari/instalatii-sanitare')
  assert.equal(find(none.id).source, null); assert.equal(find(none.id).sourcePage, null)
})
