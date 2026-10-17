/**
 * Database-backed checks of the admin services. Skipped unless WEBSITE_TEST_DATABASE_URL points at a SCRATCH database with
 * website_module.sql applied and stub "BusinessLine"(id, name, slug), "Lead"(id), "Client"(id) tables. It truncates tables: never production.
 *
 *   WEBSITE_TEST_DATABASE_URL=postgresql://.../scratch npx tsx --test lib/website/admin/__tests__/admin.integration.test.ts
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.WEBSITE_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_

let db: any, svc: typeof import('../service'), AdminError: any, DataValidationError: any
let collectionId = ''

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db'))
  svc = await import('../service')
  ;({ AdminError } = await import('../errors'))
  ;({ DataValidationError } = await import('../entry-data'))
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteReview","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Lead","BusinessLine" CASCADE`)
  for (const [id, name] of [['A', 'Linia A'], ['B', 'Linia B']] as [string, string][]) await db.businessLine.create({ data: { id, slug: id.toLowerCase(), name, icon: 'x', color: '#000', config: { entityTypes: [] } } })
})
after(async () => { if (db) await db.$disconnect() })

const rejects = async (p: Promise<unknown>, cls: any, status?: number) => {
  await assert.rejects(p, (e: any) => e instanceof cls && (status === undefined || e.status === status))
}

test('a line must be chosen and must exist', { skip }, async () => {
  await rejects(svc.getOverview('all'), AdminError, 400)
  await rejects(svc.getOverview('nope'), AdminError, 404)
})

test('channel: not enabled by default, enabling is idempotent, keys never expose hashes', { skip }, async () => {
  assert.equal((await svc.getOverview('A')).channel, null)
  await svc.enableChannel('A', { siteUrl: 'https://a.ro' })
  await svc.enableChannel('A', {})
  assert.equal(await db.websiteChannel.count({ where: { businessLineId: 'A' } }), 1)
  const k = await svc.createApiKey('A', { label: 'Frontend' })
  assert.match(k.key, /^ws_/)
  const overview = JSON.stringify(await svc.getOverview('A'))
  assert.equal(overview.includes(k.key), false)
  assert.equal(/"hash"/.test(overview), false)
  assert.equal((await svc.getOverview('A') as any).channel.keys.length, 1)
})

test('a key issued from the admin works on the public API, and stops working when revoked', { skip }, async () => {
  const { key, id } = await svc.createApiKey('A', { label: 'Test' })
  const route = await import('../../../../app/api/storefront/website/collections/route')
  const call = (k: string) => route.GET(new Request('http://x/c', { headers: { authorization: `Bearer ${k}` } }), { params: Promise.resolve({}) })
  assert.equal((await call(key)).status, 200)
  await svc.revokeApiKey('A', id)
  assert.equal((await call(key)).status, 401)
  await rejects(svc.revokeApiKey('A', 'doesnotexist'), AdminError, 404)
})

test('key limit and missing channel', { skip }, async () => {
  await rejects(svc.createApiKey('B', { label: 'x' }), AdminError, 404) // B has no channel
  await svc.enableChannel('B', {})
  for (let i = 0; i < 10; i++) await svc.createApiKey('B', { label: `k${i}` })
  await rejects(svc.createApiKey('B', { label: 'one too many' }), AdminError, 409)
})

test('collections: create, duplicate key, bad field definitions, delete blocked while entries exist', { skip }, async () => {
  const c = await svc.createCollection('A', { key: 'companii', name: 'Companie', namePlural: 'Companii', fields: [{ key: 'cui', label: 'CUI', type: 'text', required: true }, { key: 'tip', label: 'Tip', type: 'select', options: ['General', 'Instalații'], filterable: true }] })
  collectionId = c.id
  await rejects(svc.createCollection('A', { key: 'companii', name: 'x', namePlural: 'x' }), AdminError, 409)
  await svc.createCollection('B', { key: 'companii', name: 'x', namePlural: 'x' }) // same key on another line is fine
  await rejects(svc.createCollection('A', { key: 'rau', name: 'x', namePlural: 'x', fields: [{ key: 'Bad Key', label: 'x', type: 'text' }] }), AdminError, 422)
  await rejects(svc.createCollection('A', { key: 'Rau Key', name: 'x', namePlural: 'x' }), Error) // zod: invalid key
})

test('entries: drafts may be incomplete, publishing enforces required fields and sets publishedAt', { skip }, async () => {
  const draft = await svc.createEntry('A', { collectionId, title: 'Delta Construct', data: {} })
  assert.equal(draft.status, 'draft')
  assert.equal(draft.slug, 'delta-construct')
  assert.equal(draft.publishedAt, null)
  await rejects(svc.updateEntry('A', draft.id, { status: 'published' }), DataValidationError) // CUI missing
  const pub = await svc.updateEntry('A', draft.id, { status: 'published', data: { cui: 'RO1', tip: 'General', hack: 'x' } })
  assert.equal(pub.status, 'published')
  assert.ok(pub.publishedAt)
  assert.deepEqual(pub.data, { cui: 'RO1', tip: 'General' }) // unknown key dropped
  await rejects(svc.updateEntry('A', draft.id, { data: { cui: 'RO1', tip: 'Altceva' } }), DataValidationError)
})

test('entries: same title gets a unique slug; explicit duplicate slug is a 409', { skip }, async () => {
  const e2 = await svc.createEntry('A', { collectionId, title: 'Delta Construct' })
  assert.equal(e2.slug, 'delta-construct-2')
  await rejects(svc.createEntry('A', { collectionId, title: 'Altul', slug: 'delta-construct' }), AdminError, 409)
})

test('entries: nothing crosses lines', { skip }, async () => {
  const e = await svc.createEntry('A', { collectionId, title: 'Privat A' })
  await rejects(svc.getEntry('B', e.id), AdminError, 404)
  await rejects(svc.updateEntry('B', e.id, { title: 'Hijack' }), AdminError, 404)
  await rejects(svc.deleteEntry('B', e.id), AdminError, 404)
  await rejects(svc.createEntry('B', { collectionId, title: 'Titlu valid' }), AdminError, 404) // A's collection on line B
  assert.equal((await svc.listEntries('B', {})).items.some((i: any) => i.id === e.id), false)
})

test('collection with entries cannot be deleted', { skip }, async () => {
  await rejects(svc.deleteCollection('A', collectionId), AdminError, 409)
})

test('reviews: approving recomputes the entry rating; rejecting and deleting update it again', { skip }, async () => {
  const entry = (await svc.listEntries('A', { q: 'Delta Construct' })).items.find((i: any) => i.slug === 'delta-construct')!
  const mk = (rating: number, name: string) => db.websiteReview.create({ data: { entryId: entry.id, businessLineId: 'A', authorName: name, rating } })
  const [r5, r4, r1] = [await mk(5, 'a'), await mk(4, 'b'), await mk(1, 'spam')]
  const rating = async () => { const e = await db.websiteEntry.findUnique({ where: { id: entry.id } }); return [Number(e.ratingAvg), e.ratingCount] }
  await svc.moderateReview('A', r5.id, null, { status: 'approved' })
  await svc.moderateReview('A', r4.id, null, { status: 'approved' })
  assert.deepEqual(await rating(), [4.5, 2])
  await svc.moderateReview('A', r1.id, null, { status: 'rejected' })
  assert.deepEqual(await rating(), [4.5, 2]) // rejected does not count
  await svc.deleteReview('A', r5.id)
  assert.deepEqual(await rating(), [4, 1])
  await svc.moderateReview('A', r4.id, null, { status: 'rejected' })
  const e = await db.websiteEntry.findUnique({ where: { id: entry.id } })
  assert.equal(e.ratingAvg, null)
  assert.equal(e.ratingCount, 0)
  await rejects(svc.moderateReview('B', r1.id, null, { status: 'approved' }), AdminError, 404) // other line
})

// ─── CRM link ─────────────────────────────────────────────────────

const mkLead = (businessLineId: string, over: Record<string, unknown> = {}) =>
  db.lead.create({ data: { businessLineId, entityType: 'parteneri', companyName: 'Alfa Instalații SRL', contactPerson: 'Ion', email: 'ion@alfa.ro', status: 'prospect', ...over } })

test('from-lead: creates a DRAFT prefilled from the lead and links it', { skip }, async () => {
  const lead = await mkLead('A', { phone: '0722 111 222', city: 'Iași', county: 'Iași', address: 'Str. Lăpușneanu 1', website: 'alfa-instalatii.ro', cui: 'RO999' })
  const e = await svc.createEntryFromLead('A', { leadId: lead.id, collectionId })
  assert.equal(e.status, 'draft')
  assert.equal(e.publishedAt, null)
  assert.equal(e.leadId, lead.id)
  assert.equal(e.title, 'Alfa Instalații SRL')
  assert.equal(e.slug, 'alfa-instalatii-srl')
  assert.deepEqual([e.email, e.phone, e.city, e.county, e.websiteUrl], ['ion@alfa.ro', '0722 111 222', 'Iași', 'Iași', 'https://alfa-instalatii.ro'])
  assert.deepEqual(e.data, { cui: 'RO999' }) // collection has a text field "cui"
  const full = await svc.getEntry('A', e.id)
  assert.equal(full.lead?.companyName, 'Alfa Instalații SRL')
  assert.deepEqual((await svc.listEntries('A', { leadId: lead.id })).items.map((i: any) => i.id), [e.id])
})

test('from-lead: a lead links to one entry only; other lines and unknown leads are 404', { skip }, async () => {
  const lead = await mkLead('A', { companyName: 'Beta SRL' })
  await svc.createEntryFromLead('A', { leadId: lead.id, collectionId })
  await rejects(svc.createEntryFromLead('A', { leadId: lead.id, collectionId }), AdminError, 409)
  const other = await mkLead('B', { companyName: 'Gamma SRL' })
  await rejects(svc.createEntryFromLead('A', { leadId: other.id, collectionId }), AdminError, 404) // lead of line B
  await rejects(svc.createEntryFromLead('A', { leadId: 'nope', collectionId }), AdminError, 404)
})

test('from-lead: CRM placeholder email and unusable website are dropped', { skip }, async () => {
  const lead = await mkLead('A', { companyName: 'Delta Formular SRL', email: 'necunoscut@formular.ro', website: 'nu este un site' })
  const e = await svc.createEntryFromLead('A', { leadId: lead.id, collectionId })
  assert.equal(e.email, null)
  assert.equal(e.websiteUrl, null)
})

test('link / unlink through updateEntry validates the lead', { skip }, async () => {
  const entry = await svc.createEntry('A', { collectionId, title: 'Epsilon Construct' })
  const lead = await mkLead('A', { companyName: 'Epsilon' })
  assert.equal((await svc.updateEntry('A', entry.id, { leadId: lead.id })).leadId, lead.id)
  const entry2 = await svc.createEntry('A', { collectionId, title: 'Epsilon Doi' })
  await rejects(svc.updateEntry('A', entry2.id, { leadId: lead.id }), AdminError, 409) // already linked elsewhere
  await rejects(svc.updateEntry('A', entry2.id, { leadId: (await mkLead('B')).id }), AdminError, 404) // other line
  assert.equal((await svc.updateEntry('A', entry.id, { leadId: null })).leadId, null)
  assert.equal((await svc.updateEntry('A', entry2.id, { leadId: lead.id })).leadId, lead.id) // free again
})
