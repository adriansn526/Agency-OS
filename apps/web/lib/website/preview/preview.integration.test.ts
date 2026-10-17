/** DB-backed checks of the preview service. Needs PREVIEW_TEST_DATABASE_URL = a SCRATCH database with the full schema (it truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.PREVIEW_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('./service'), entryId = '', leadId = ''
const DAY = 86_400_000

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('./service')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteReview","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'itc', name: 'ITC', icon: 'x', color: '#000', config: {} } })
  const col = await db.websiteCollection.create({ data: { businessLineId: 'bl', key: 'companii', name: 'Companie', namePlural: 'Companii', fields: [] } })
  const lead = await db.lead.create({ data: { businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: 'FIRMA SRL', contactPerson: 'N/A', email: 'N/A' } })
  leadId = lead.id
  const e = await db.websiteEntry.create({ data: { businessLineId: 'bl', collectionId: col.id, slug: 'firma', title: 'FIRMA SRL', status: 'preview', leadId, email: 'a@firma.ro' } })
  entryId = e.id
})
after(async () => { if (db) await db.$disconnect() })

test('validity: default 14 days, channel setting, bounds', () => {
  assert.equal(S.validityDays(null), 14); assert.equal(S.validityDays({ previewValidityDays: 30 }), 30)
  assert.equal(S.validityDays({ previewValidityDays: 0 }), 14); assert.equal(S.validityDays({ previewValidityDays: 400 }), 14)
})

test('issue: clock starts at sending, only the hash is stored, re-issue invalidates the old link', { skip }, async () => {
  const now = new Date('2026-11-01T10:00:00Z')
  const a = await S.issuePreview('bl', entryId, { now })
  assert.match(a.token, S.PREVIEW_TOKEN_RE); assert.equal(a.expiresAt.getTime(), now.getTime() + 14 * DAY)
  const row = await db.websiteEntry.findUnique({ where: { id: entryId } })
  assert.equal(row.previewTokenHash, S.hashPreviewToken(a.token)); assert.notEqual(row.previewTokenHash, a.token)
  const b = await S.issuePreview('bl', entryId, { now, days: 3 })
  assert.equal(b.expiresAt.getTime(), now.getTime() + 3 * DAY)
  assert.equal((await S.lookupPreview('bl', a.token, now)).state, 'invalid')
  assert.equal((await S.lookupPreview('bl', b.token, now)).state, 'ok')
  await assert.rejects(S.issuePreview('bl', entryId, { days: 0 }), /între 1 și 90/)
})

test('lookup: expired, malformed, other line, and non-preview entries', { skip }, async () => {
  const t = (await S.issuePreview('bl', entryId, { now: new Date('2026-11-01T10:00:00Z') })).token
  assert.equal((await S.lookupPreview('bl', t, new Date('2026-11-15T10:00:01Z'))).state, 'expired')
  assert.equal((await S.lookupPreview('bl', 'pv_short')).state, 'invalid')
  assert.equal((await S.lookupPreview('other', t, new Date('2026-11-02T00:00:00Z'))).state, 'invalid')
  await db.websiteEntry.update({ where: { id: entryId }, data: { status: 'draft' } })
  assert.equal((await S.lookupPreview('bl', t, new Date('2026-11-02T00:00:00Z'))).state, 'invalid')
  await db.websiteEntry.update({ where: { id: entryId }, data: { status: 'preview' } })
  await assert.rejects(S.issuePreview('bl', 'nope'), /nu există/)
})

test('serialized preview has no CRM / ERP ids', { skip }, async () => {
  const t = (await S.issuePreview('bl', entryId)).token
  const r = await S.lookupPreview('bl', t); assert.equal(r.state, 'ok')
  const out = JSON.stringify(S.serializePreview((r as any).entry))
  assert.ok(!out.includes(leadId)); assert.ok(!/leadId|tenantId|clientId|previewTokenHash/.test(out)); assert.ok(out.includes('FIRMA SRL'))
})

test('changes → in_discutii, accept needs both consents, accept → onboarding + audit, repeat is harmless', { skip }, async () => {
  const t = (await S.issuePreview('bl', entryId)).token
  await S.respondPreview('bl', t, { action: 'changes', message: 'Telefonul s-a schimbat', phone: '0740000000', client: { ip: '1.2.3.4' } })
  assert.equal((await db.lead.findUnique({ where: { id: leadId } })).status, 'in_discutii')
  assert.throws(() => S.respondSchema.parse({ action: 'accept', acceptTerms: true, acceptGdpr: false, contactName: 'Ion', termsVersion: 'v1' }))
  await assert.rejects(S.respondPreview('bl', t, { action: 'accept', acceptTerms: true, contactName: 'Ion', termsVersion: 'v1' }))
  const ok = { action: 'accept', acceptTerms: true, acceptGdpr: true, contactName: 'Ion Popescu', contactRole: 'Administrator', termsVersion: '2026-10', client: { ip: '1.2.3.4', userAgent: 'UA' } }
  await S.respondPreview('bl', t, ok); await S.respondPreview('bl', t, ok)
  const lead = await db.lead.findUnique({ where: { id: leadId } })
  assert.equal(lead.status, 'onboarding'); assert.equal(lead.customFields.preview_raspuns, 'acceptat'); assert.equal(lead.optOut, false)
  const acts = await db.activity.findMany({ where: { leadId, action: 'partner_preview_accept' } })
  assert.equal(acts.length, 2); assert.equal(acts[0].details.contactName, 'Ion Popescu'); assert.equal(acts[0].details.termsVersion, '2026-10'); assert.equal(acts[0].details.ip, '1.2.3.4')
  assert.equal((await db.websiteEntry.findUnique({ where: { id: entryId } })).status, 'preview') // never published by the firm's answer
})

test('decline → refuzat, opt-out, link revoked', { skip }, async () => {
  const t = (await S.issuePreview('bl', entryId)).token
  await S.respondPreview('bl', t, { action: 'decline', reason: 'Nu ne interesează' })
  const lead = await db.lead.findUnique({ where: { id: leadId } })
  assert.equal(lead.status, 'refuzat'); assert.equal(lead.optOut, true)
  assert.equal((await S.lookupPreview('bl', t)).state, 'invalid')
})
