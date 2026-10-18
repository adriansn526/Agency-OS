/** DB-backed checks of partner login, sessions and profile editing, with a recording notifier. Needs PARTNER_TEST_DATABASE_URL = a SCRATCH database with the full schema (it truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.PARTNER_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, A: typeof import('../auth'), P: typeof import('../profile')

const sent: { kind: 'email' | 'sms'; to: string; text: string }[] = []
const notifier = { async email(to: string, _s: string, _h: string, text: string) { sent.push({ kind: 'email', to, text }) }, async sms(to: string, body: string) { sent.push({ kind: 'sms', to, text: body }) } }
const site = 'https://intraconstruct.ro'
const T0 = new Date('2026-11-01T10:00:00Z')
const min = (n: number) => new Date(T0.getTime() + n * 60_000)
const linkOf = () => /token=(pl_[A-Za-z0-9_-]{43})/.exec(sent[sent.length - 1]!.text)![1]!
const codeOf = () => /(\d{6})/.exec(sent[sent.length - 1]!.text)![1]!
const reset = async () => { sent.length = 0; await db.websitePartnerLogin.deleteMany({}); await db.websitePartnerSession.deleteMany({}) }

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); A = await import('../auth'); P = await import('../profile')
  await db.$executeRawUnsafe(`TRUNCATE "WebsitePartnerSession","WebsitePartnerLogin","WebsiteReview","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  for (const id of ['bl', 'other']) await db.businessLine.create({ data: { id, slug: id, name: id, icon: 'x', color: '#000', config: {} } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  const colO = await db.websiteCollection.create({ data: { id: 'co', businessLineId: 'other', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  const lead = await db.lead.create({ data: { businessLineId: 'bl', entityType: 'parteneri', status: 'onboarding', companyName: 'Firma A', contactPerson: 'N/A', email: 'N/A' } })
  const e = (o: object) => ({ businessLineId: 'bl', collectionId: col.id, status: 'preview', partnerAccess: true, ...o })
  await db.websiteEntry.createMany({ data: [
    e({ id: 'a', slug: 'a', title: 'Firma A', email: 'Office@A.ro', phone: '0730 808 101', leadId: lead.id, data: { cui: '111', specializare: 'x' } }),
    e({ id: 'b', slug: 'b', title: 'Firma B (fără acces)', email: 'b@b.ro', partnerAccess: false }),
    e({ id: 'c', slug: 'c', title: 'Firma C (ciornă)', email: 'c@c.ro', status: 'draft' }),
    e({ id: 'd1', slug: 'd1', title: 'Firma D1', email: 'shared@d.ro', phone: '0740111111' }),
    e({ id: 'd2', slug: 'd2', title: 'Firma D2', email: 'shared@d.ro', phone: '0740111111' }),
    { businessLineId: 'other', collectionId: colO.id, id: 'o', slug: 'o', title: 'Altă linie', email: 'o@o.ro', status: 'preview', partnerAccess: true },
  ] })
})
after(async () => { if (db) await db.$disconnect() })

test('email link: sent only to eligible profiles, same answer either way, single use, 30 minutes', { skip }, async () => {
  await reset()
  for (const who of ['nimeni@x.ro', 'b@b.ro', 'c@c.ro', 'o@o.ro', 'not-an-identifier']) await A.requestLogin('bl', who, { notifier, siteUrl: site, now: T0 })
  assert.equal(sent.length, 0) // unknown, no access, draft, other line, junk: nothing sent and nothing thrown
  await A.requestLogin('bl', 'office@a.ro', { notifier, siteUrl: site, now: T0 }) // case-insensitive match
  assert.equal(sent.length, 1); assert.equal(sent[0]!.to, 'office@a.ro'); assert.match(sent[0]!.text, /https:\/\/intraconstruct\.ro\/cont\/verifica\?token=pl_/)
  const token = linkOf()
  assert.equal(await A.verifyLogin('bl', { token }, {}, min(31)), null)                 // expired
  assert.equal(await A.verifyLogin('other', { token }, {}, min(1)), null)               // wrong line
  const s = await A.verifyLogin('bl', { token }, { userAgent: 'UA', ip: '1.2.3.4' }, min(5))
  assert.ok(s); assert.match(s!.sessionToken, A.SESSION_TOKEN_RE); assert.equal(s!.entryId, 'a')
  assert.equal(await A.verifyLogin('bl', { token }, {}, min(6)), null)                  // used once
  assert.notEqual((await db.websitePartnerSession.findFirst()).tokenHash, s!.sessionToken) // only the hash is stored
})

test('requests are rate limited per profile (3 / 15 min)', { skip }, async () => {
  await reset()
  for (let i = 0; i < 6; i++) await A.requestLogin('bl', 'office@a.ro', { notifier, siteUrl: site, now: min(i) })
  assert.equal(sent.length, 3)
  await A.requestLogin('bl', 'office@a.ro', { notifier, siteUrl: site, now: min(20) })
  assert.equal(sent.length, 4)
})

test('SMS code: 6 digits, 5 attempts then locked, correct code gives a session, one profile per phone', { skip }, async () => {
  await reset()
  await A.requestLogin('bl', '+40730808101', { notifier, siteUrl: site, now: T0 }) // stored as "0730 808 101"
  assert.equal(sent.length, 1); assert.equal(sent[0]!.kind, 'sms'); const code = codeOf()
  const wrong = code === '000000' ? '111111' : '000000'
  for (let i = 0; i < 5; i++) assert.equal(await A.verifyLogin('bl', { identifier: '0730808101', code: wrong }, {}, min(1)), null)
  assert.equal(await A.verifyLogin('bl', { identifier: '0730808101', code }, {}, min(2)), null) // locked even with the right code
  await reset()
  await A.requestLogin('bl', '0730808101', { notifier, siteUrl: site, now: T0 })
  const c2 = codeOf()
  assert.equal(await A.verifyLogin('bl', { identifier: '0730808101', code: c2 }, {}, min(11)), null) // expired after 10 min
  await reset()
  await A.requestLogin('bl', '0730808101', { notifier, siteUrl: site, now: T0 })
  assert.ok(await A.verifyLogin('bl', { identifier: '0730808101', code: codeOf() }, {}, min(3)))
  await reset()
  await A.requestLogin('bl', '0740111111', { notifier, siteUrl: site, now: T0 }) // phone shared by two profiles
  assert.equal(sent.length, 0)
})

test('an email shared by two profiles gets one message with both links', { skip }, async () => {
  await reset()
  await A.requestLogin('bl', 'shared@d.ro', { notifier, siteUrl: site, now: T0 })
  assert.equal(sent.length, 1); assert.equal((sent[0]!.text.match(/token=pl_/g) ?? []).length, 2)
})

test('sessions: valid for 14 days, die with logout and when access is withdrawn', { skip }, async () => {
  await reset()
  await A.requestLogin('bl', 'office@a.ro', { notifier, siteUrl: site, now: T0 })
  const s = (await A.verifyLogin('bl', { token: linkOf() }, {}, T0))!
  assert.equal((await A.sessionEntry('bl', s.sessionToken, min(60 * 24 * 13)))?.id, 'a')
  assert.equal(await A.sessionEntry('bl', s.sessionToken, min(60 * 24 * 15)), null)
  assert.equal(await A.sessionEntry('other', s.sessionToken, min(1)), null)
  assert.equal(await A.sessionEntry('bl', 'ps_' + 'x'.repeat(43), min(1)), null)
  await db.websiteEntry.update({ where: { id: 'a' }, data: { partnerAccess: false } })
  assert.equal(await A.sessionEntry('bl', s.sessionToken, min(1)), null)
  await db.websiteEntry.update({ where: { id: 'a' }, data: { partnerAccess: true } })
  await A.logout(s.sessionToken)
  assert.equal(await A.sessionEntry('bl', s.sessionToken, min(1)), null)
})

test('profile edit: whitelisted fields go live at once and are logged; name and CUI stay locked', { skip }, async () => {
  await reset()
  await A.requestLogin('bl', 'office@a.ro', { notifier, siteUrl: site, now: T0 })
  const s = (await A.verifyLogin('bl', { token: linkOf() }, {}, T0))!
  const entry = (await A.sessionEntry('bl', s.sessionToken, T0))!
  const r = await P.updateProfile(entry, { summary: 'Instalații de calitate', phone: '0730 808 102', servicii: ['instalatii-sanitare', 'climatizare'], program: 'L-V 8-17', certificari: ['ANRE', 'ISCIR'], websiteUrl: 'a.ro' })
  assert.deepEqual(r.changed.sort(), ['certificari', 'phone', 'program', 'servicii', 'summary', 'websiteUrl'])
  const row = await db.websiteEntry.findUnique({ where: { id: 'a' } })
  assert.equal(row.summary, 'Instalații de calitate'); assert.equal(row.phone, '0730808102'); assert.equal(row.websiteUrl, 'https://a.ro')
  assert.deepEqual(row.data.servicii, ['instalatii-sanitare', 'climatizare']); assert.equal(row.data.cui, '111'); assert.equal(row.data.specializare, 'x'); assert.equal(row.title, 'Firma A')
  const log = await db.activity.findFirst({ where: { action: 'partner_profile_edit' } })
  assert.ok(log); assert.deepEqual(log.details.changed.sort(), r.changed.sort()); assert.equal(log.leadId !== null, true)
  assert.deepEqual((await P.updateProfile((await A.sessionEntry('bl', s.sessionToken, T0))!, { summary: 'Instalații de calitate' })).changed, []) // no-op: nothing written, nothing logged
  await assert.rejects(P.updateProfile(entry, { title: 'Alt nume' }), /Date invalide/)
  await assert.rejects(P.updateProfile(entry, { cui: '999' }), /Date invalide/)
  await assert.rejects(P.updateProfile(entry, { servicii: ['inexistent'] }), /Date invalide/)
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'a' } })).title, 'Firma A')
  assert.deepEqual((await P.updateProfile((await A.sessionEntry('bl', s.sessionToken, T0))!, { tema: 'verde', accent: '#16A34A' })).changed.sort(), ['accent', 'tema'])
  assert.deepEqual((await db.websiteEntry.findUnique({ where: { id: 'a' } })).data.accent, '#16a34a')
  assert.deepEqual((await P.updateProfile((await A.sessionEntry('bl', s.sessionToken, T0))!, { tema: null, accent: null })).changed.sort(), ['accent', 'tema'])
  assert.equal('tema' in (await db.websiteEntry.findUnique({ where: { id: 'a' } })).data, false) // cleared, not stored as null
  const p = P.serializeProfile((await A.sessionEntry('bl', s.sessionToken, T0))!, (await import('../../glossary/live')).builtInTaxonomy())
  assert.deepEqual(p.locked, ['title', 'cui']); assert.equal(p.publicPath, null); assert.ok(p.categories.length >= 20)
})
