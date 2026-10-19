/** DB-backed checks of the pilot setup. Needs PILOT_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.PILOT_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../setup')

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../setup')
  await db.$executeRawUnsafe(`TRUNCATE "MarketingSegment","WebsiteLayoutVersion","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: { entityTypes: [{ id: 'parteneri', name: 'Partener', namePlural: 'Parteneri', icon: 'x', financialFlow: 'income', customFields: [{ key: 'cui', type: 'text', label: 'CUI' }], pipeline: [{ key: 'prospect', label: 'Prospect', color: 'info' }] }] } } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  const mk = async (id: string, lead: object, entry: object = {}) => {
    await db.lead.create({ data: { id: 'l' + id, businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: id.toUpperCase(), contactPerson: 'N/A', email: 'N/A', customFields: { regiune: 'X' }, ...lead } })
    await db.websiteEntry.create({ data: { id, businessLineId: 'bl', collectionId: col.id, slug: id, title: id, status: 'preview', leadId: 'l' + id, county: 'Mureș', data: { servicii: ['demolari', 'foraj-sondaj'] }, ...entry } })
  }
  await mk('b', { phone: '0730222222', phone2: '0740222222', county: 'Mureș', city: 'Târgu Mureș', contactPerson: 'Ion Pop', email: 'b@b.ro', cui: '2' })
  await mk('a', { phone: '0730111111', county: 'Cluj', city: 'Cluj-Napoca' }, { county: 'Cluj' })
  await mk('nophone', { phone: null })
  await mk('optout', { phone: '0730333333', optOut: true })
  await mk('accepted', { phone: '0730444444' }, { partnerAccess: true })
  await mk('published', { phone: '0730555555' }, { status: 'published' })
})
after(async () => { if (db) await db.$disconnect() })

test('plan: who can be called, in calling order, without anyone who opted out, answered or has no phone', { skip }, async () => {
  const p = await S.planPilot('bl')
  assert.deepEqual(p.rows.map((r) => r.firma), ['A', 'B'])                         // Cluj before Mureș; no phone, opt-out, accepted and published are out
  assert.equal(p.withoutPhone, 1); assert.deepEqual(p.fieldsToAdd, ['acord_sms', 'acord_email', 'rezultat_apel', 'data_apel', 'alte_portaluri', 'alte_portaluri_nume', 'alte_portaluri_motiv']); assert.equal(p.leadsToMark, 2); assert.equal(p.segmentExists, false)
  const b = p.rows[1]!; assert.deepEqual([b.telefon, b.telefon_2, b.persoana_contact, b.email, b.judet, b.localitate, b.cui], ['0730222222', '0740222222', 'Ion Pop', 'b@b.ro', 'Mureș', 'Târgu Mureș', '2'])
  assert.equal(b.servicii, 'Demolări; Foraj și sondaj'); assert.equal(p.rows[0]!.persoana_contact, '')   // 'N/A' placeholders do not reach the caller's sheet
})

const PILOT_KEYS = ['acord_sms', 'acord_email', 'rezultat_apel', 'data_apel', 'alte_portaluri', 'alte_portaluri_nume', 'alte_portaluri_motiv']
test('apply: fields added once, firms marked, segment created; a second run changes nothing', { skip }, async () => {
  const p = await S.planPilot('bl'); const r = await S.applyPilot('bl', p)
  assert.deepEqual([r.fieldsAdded, r.marked], [7, 2]); assert.ok(r.segmentId)
  const cfg = (await db.businessLine.findUnique({ where: { id: 'bl' } })).config.entityTypes[0]
  assert.deepEqual(cfg.customFields.map((f: any) => f.key), ['cui', ...PILOT_KEYS])    // existing field kept, new ones appended
  assert.equal((await db.lead.findUnique({ where: { id: 'la' } })).customFields.pilot, 'da'); assert.equal((await db.lead.findUnique({ where: { id: 'la' } })).customFields.regiune, 'X')   // other keys untouched
  assert.equal((await db.lead.findUnique({ where: { id: 'lpublished' } })).customFields.pilot, undefined)
  const again = await S.planPilot('bl'); assert.deepEqual([again.fieldsToAdd.length, again.leadsToMark, again.segmentExists], [0, 0, true])
  const r2 = await S.applyPilot('bl', again); assert.deepEqual([r2.fieldsAdded, r2.marked, r2.segmentId], [0, 0, null])
  assert.equal(await db.marketingSegment.count(), 1)
})

test('the segment matches exactly the pilot firms that agreed to an SMS', { skip }, async () => {
  const seg = await db.marketingSegment.findFirst({ where: { name: S.SEGMENT_NAME } })
  const count = () => db.lead.count({ where: { businessLineId: 'bl', optOut: false, deletedAt: null, AND: (seg.filters as any[]).map((f) => ({ customFields: { path: [f.field.slice(3)], equals: f.value } })) } })
  assert.equal(await count(), 0)
  await db.$executeRaw`UPDATE "Lead" SET "customFields" = "customFields" || '{"acord_sms":"da"}'::jsonb WHERE "id" = 'la'`
  assert.equal(await count(), 1)
  await db.$executeRaw`UPDATE "Lead" SET "customFields" = "customFields" || '{"acord_sms":"da"}'::jsonb WHERE "id" = 'lpublished'`   // agreed but not part of the pilot
  assert.equal(await count(), 1)
  await db.lead.update({ where: { id: 'la' }, data: { optOut: true } }); assert.equal(await count(), 0)                                  // opting out always wins
})

test('ensurePilotFields adds only the missing fields and is idempotent (used to extend a line that already ran the pilot)', { skip }, async () => {
  const keys = async () => (await db.businessLine.findUnique({ where: { id: 'bl' } })).config.entityTypes[0].customFields.map((f: any) => f.key)
  const cfg = (await db.businessLine.findUnique({ where: { id: 'bl' } })).config
  cfg.entityTypes[0].customFields = cfg.entityTypes[0].customFields.filter((f: any) => !f.key.startsWith('alte_portaluri'))
  await db.businessLine.update({ where: { id: 'bl' }, data: { config: cfg } })
  assert.equal(await S.ensurePilotFields('bl'), 3); assert.deepEqual(await keys(), ['cui', ...PILOT_KEYS])
  assert.equal(await S.ensurePilotFields('bl'), 0)
})
