/** DB-backed checks of the referral invitations. Needs ENDORSEMENTS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.ENDORSEMENTS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, I: typeof import('../invites'), S: typeof import('../service')
const NOW = new Date('2026-10-28T10:00:00Z')
const cmr = `CMR|X|Cluj|Chirurgie|2027-06-30|2026-10-01|Echipa|`
const me = (id: string) => ({ id, businessLineId: 'bl', title: `Dr ${id}` })
const mails: { to: string; subject: string; text: string }[] = []
const mailer: import('../invites').Mailer = async (to, subject, _h, text) => { mails.push({ to, subject, text }) }
const opts = { siteUrl: 'https://topdoctori.ro', brandName: 'TopDoctori', mailer, now: NOW }
const form = (o: object = {}) => ({ name: 'Ion Popescu', specialty: 'Chirurgie generală', phone: '0722 111 222', email: 'Ion@Example.com', city: 'Cluj', consent: true, ...o })
const tax = (slug: string) => ({ id: `tx-${slug}`, businessLineId: 'bl', collectionId: 'tax', slug, title: slug === 'g' ? 'Grup' : `Titlu ${slug}`, status: 'published', data: slug === 'g' ? { tip: 'grup' } : { tip: 'categorie', parinte: 'g' } })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); I = await import('../invites'); S = await import('../service')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteEndorsementInvite","WebsiteEndorsement","WebsiteEntry","WebsiteCollection","WebsiteChannel","Lead","Activity","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteChannel.create({ data: { id: 'ch', businessLineId: 'bl', apiKeys: [] } })
  await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'M', namePlural: 'M', fields: [{ key: 'cod_parafa', label: 'Parafă', type: 'text' }] } })
  await db.websiteCollection.create({ data: { id: 'tax', businessLineId: 'bl', key: 'servicii', name: 'S', namePlural: 'S', fields: [] } })
  await db.websiteEntry.createMany({ data: ['g', 'tiroida', 'colecist'].map(tax) })
  const doc = (id: string, o: object = {}) => ({ id, slug: id, title: `Dr ${id}`, email: `${id}@x.ro`, businessLineId: 'bl', collectionId: 'c', status: 'published', partnerAccess: true, data: { specializare: 'Chirurgie', verificare_cmr: [cmr] }, ...o })
  await db.websiteEntry.createMany({ data: [doc('a'), doc('nocmr', { data: { specializare: 'X' } }), doc('draft', { status: 'draft' })] })
})
after(async () => { if (db) await db.$disconnect() })

test('only a published doctor with a valid CMR verification can invite, and only for known areas', { skip }, async () => {
  await assert.rejects(I.createInvite(me('nocmr'), {}, NOW), /Registrul CMR/)
  await assert.rejects(I.createInvite(me('draft'), {}, NOW), /publicat/)
  await assert.rejects(I.createInvite(me('a'), { servicii: ['inexistent'] }, NOW), /necunoscută/)
})

test('the full flow: invite, colleague registers, inviter confirms, endorsement appears once the colleague is public', { skip }, async () => {
  const inv = await I.createInvite(me('a'), { servicii: ['tiroida'], note: 'Colaborare excelentă în sala de operații', showName: true }, NOW)
  assert.match(inv.code, I.INVITE_CODE_RE)
  const stored = await db.websiteEndorsementInvite.findUnique({ where: { id: inv.id } })
  assert.notEqual(stored.codeHash, inv.code)

  const seen = await I.lookupInvite('bl', inv.code, NOW)
  assert.equal(seen.state, 'ok')
  if (seen.state === 'ok') { assert.equal(seen.invite.inviterName, 'Dr a'); assert.deepEqual(seen.invite.areas, [{ slug: 'tiroida', title: 'Titlu tiroida' }]) }
  assert.equal((await I.lookupInvite('bl', 'abcdefghij', NOW)).state, 'invalid')

  await assert.rejects(I.registerInvitee('bl', inv.code, form({ consent: false }), opts))
  assert.equal((await I.lookupInvite('bl', inv.code, NOW)).state, 'ok') // a failed form does not use the invitation

  mails.length = 0
  await I.registerInvitee('bl', inv.code, form(), opts)
  assert.equal((await I.lookupInvite('bl', inv.code, NOW)).state, 'used')
  await assert.rejects(I.registerInvitee('bl', inv.code, form({ email: 'alt@example.com' }), opts), /nu mai este valabilă/)

  const entry = await db.websiteEntry.findFirst({ where: { email: 'ion@example.com' } })
  assert.equal(entry.status, 'preview'); assert.equal(entry.partnerAccess, true); assert.equal(entry.title, 'Dr. Ion Popescu')
  assert.ok(entry.leadId)
  assert.equal((await db.lead.findUnique({ where: { id: entry.leadId } })).entityType, 'medici')
  assert.deepEqual(entry.data.servicii ?? [], [])
  assert.ok(mails.some((m) => m.to === 'ion@example.com' && /\/cont\/verifica\?token=pl_/.test(m.text)), 'login link to the colleague')
  assert.ok(mails.some((m) => m.to === 'a@x.ro' && /Dr\. Ion Popescu/.test(m.text)), 'inviter is told')

  // not attached before the inviter confirms
  assert.equal(await db.websiteEndorsement.count({ where: { endorseeId: entry.id } }), 0)
  assert.equal((await I.listInvites(me('a'), NOW))[0]!.status, 'registered')
  await I.answerInvite(me('a'), inv.id, 'confirm', NOW)
  const end = await db.websiteEndorsement.findFirst({ where: { endorseeId: entry.id } })
  assert.deepEqual(end.forServicii, ['tiroida']); assert.equal(end.showName, true)
  // the colleague's profile is still private, so nothing is served publicly yet
  assert.equal(entry.status, 'preview')

  mails.length = 0
  await db.websiteEntry.update({ where: { id: entry.id }, data: { status: 'published', data: { ...entry.data, verificare_cmr: [cmr] } } })
  assert.equal((await S.summaries('bl', [entry.id], NOW)).get(entry.id)?.count, 1)
  await I.notifyPublished(entry.id, opts); await I.notifyPublished(entry.id, opts)
  assert.equal(mails.filter((m) => m.to === 'a@x.ro').length, 1, 'public notice sent once')
})

test('a colleague who already has a profile is attached, not duplicated; inviter can reject or revoke', { skip }, async () => {
  const before_ = await db.websiteEntry.count()
  const inv = await I.createInvite(me('a'), { name: 'Cineva' }, NOW)
  mails.length = 0
  await I.registerInvitee('bl', inv.code, form({ email: 'ION@example.com', name: 'Altă Persoană' }), opts)
  assert.equal(await db.websiteEntry.count(), before_)
  assert.equal(mails.filter((m) => m.to === 'ion@example.com').length, 1)
  await I.answerInvite(me('a'), inv.id, 'reject', NOW)
  assert.equal((await db.websiteEndorsementInvite.findUnique({ where: { id: inv.id } })).status, 'rejected')

  const inv2 = await I.createInvite(me('a'), {}, NOW)
  await I.answerInvite(me('a'), inv2.id, 'revoke', NOW)
  assert.equal((await I.lookupInvite('bl', inv2.code, NOW)).state, 'invalid')
  await assert.rejects(I.answerInvite(me('nocmr'), inv2.id, 'revoke', NOW), /nu există/)
})

test('expired invitations are refused; the name is hidden when the inviter prefers; invites share the monthly allowance', { skip }, async () => {
  const inv = await I.createInvite(me('a'), { showName: false }, NOW)
  const seen = await I.lookupInvite('bl', inv.code, NOW)
  if (seen.state === 'ok') assert.equal(seen.invite.inviterName, null)
  const later = new Date(NOW.getTime() + 61 * 86_400_000)
  assert.equal((await I.lookupInvite('bl', inv.code, later)).state, 'expired')
  await assert.rejects(I.registerInvitee('bl', inv.code, form({ email: 'nou@example.com' }), { ...opts, now: later }), /expirat/)
  for (let i = 0; i < 6; i++) await I.createInvite(me('a'), {}, NOW) // 1 earlier endorsement-free total: 3 + 1 + 6 non-revoked ≤ 10
  await assert.rejects(I.createInvite(me('a'), {}, NOW), /cel mult 10/)
})

test('public sign-up: private profile + lead + login link + team alert; repeating with the same email changes nothing', { skip }, async () => {
  const alerts: string[] = []
  const o = { ...opts, alert: async (t: string) => { alerts.push(t) } }
  mails.length = 0
  const before_ = await db.websiteEntry.count()
  assert.deepEqual(await I.signupDoctor('bl', form({ name: 'Maria Ionescu', email: 'Maria@Example.com', phone: '0733 444 555' }), { ...o, invitedBy: 'a' }), { ok: true })
  const e = await db.websiteEntry.findFirst({ where: { email: 'maria@example.com' } })
  assert.deepEqual([e.status, e.partnerAccess, e.title, e.externalSource], ['preview', true, 'Dr. Maria Ionescu', 'formular'])
  const lead = await db.lead.findUnique({ where: { id: e.leadId } })
  assert.deepEqual([lead.entityType, lead.source, lead.customFields.invitedBy], ['medici', 'formular', 'a'])
  assert.ok(mails.some((m) => m.to === 'maria@example.com' && /\/cont\/verifica\?token=pl_/.test(m.text)), 'login link to the doctor')
  assert.equal(alerts.length, 1)
  // same email again: no new profile, no second alert, the answer is the same
  assert.deepEqual(await I.signupDoctor('bl', form({ name: 'Altcineva', email: 'maria@example.com' }), o), { ok: true })
  assert.equal(await db.websiteEntry.count(), before_ + 1); assert.equal(alerts.length, 1)
  // an unknown inviter is ignored, not trusted
  await I.signupDoctor('bl', form({ name: 'Radu Pop', email: 'radu@example.com', phone: '0744 000 111' }), { ...o, invitedBy: 'inexistent' })
  const lead2 = await db.lead.findFirst({ where: { email: 'radu@example.com' } })
  assert.equal(lead2.customFields.invitedBy, undefined)
  await assert.rejects(I.signupDoctor('bl', form({ consent: false, email: 'x@example.com' }), o))
})

test('public sign-up is capped per hour for the whole line', { skip }, async () => {
  const o = { ...opts, alert: async () => undefined }
  const made = await db.websiteEntry.count({ where: { externalSource: 'formular' } })
  for (let i = 0; i < 30 - made; i++) await I.signupDoctor('bl', form({ name: `Medic Test ${i}`, email: `t${i}@example.com`, phone: `07${String(10_000_000 + i)}` }), o)
  await assert.rejects(I.signupDoctor('bl', form({ email: 'prea@example.com', phone: '0799999999' }), o), /Prea multe/)
})
