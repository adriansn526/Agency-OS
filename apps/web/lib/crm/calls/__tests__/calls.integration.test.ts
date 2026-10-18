/** DB-backed checks of the call workspace: recording calls, the queue, the calendar and SMS from the modal. Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../service'), Q: typeof import('../queue'), M: typeof import('../sms')
const MON = new Date('2026-11-02T08:00:00Z')   // Monday 10:00 in Bucharest
const SAT = new Date('2026-11-07T08:00:00Z')
const lead = (id: string) => db.lead.findUnique({ where: { id } })
const fake = () => { const sent: { to: string; body: string }[] = []; return { sent, deps: { send: async (to: string, body: string) => { sent.push({ to, body }); return { messageId: 'sms-' + sent.length } } } } }

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../service'); Q = await import('../queue'); M = await import('../sms')
  await db.$executeRawUnsafe(`TRUNCATE "MarketingTemplate","Communication","WebsiteLayoutVersion","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  const pipeline = ['prospect', 'contactat', 'in_discutii', 'onboarding', 'activ', 'refuzat'].map((key) => ({ key, label: key, color: 'info' }))
  for (const id of ['bl', 'other']) await db.businessLine.create({ data: { id, slug: id, name: id, icon: 'x', color: '#000', config: { entityTypes: [{ id: 'parteneri', name: 'P', namePlural: 'P', icon: 'x', financialFlow: 'income', customFields: [], pipeline }] } } })
  await db.websiteChannel.create({ data: { businessLineId: 'bl', siteUrl: 'https://intraconstruct.ro' } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  const mk = (id: string, o: object = {}, cf: object = { pilot: 'da' }) => db.lead.create({ data: { id, businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: id.toUpperCase(), contactPerson: 'N/A', email: 'N/A', phone: '0730111111', county: 'Mureș', city: 'Târgu Mureș', customFields: cf, ...o } })
  await mk('a', { county: 'Cluj', city: 'Cluj-Napoca' }); await mk('b'); await mk('c', { phone: null }); await mk('d', { optOut: true }); await mk('e', {}, { pilot: 'da', rezultat_apel: 'Nu răspunde' }); await mk('f', { status: 'contactat' }); await mk('g', {}, {})
  await mk('h', { county: 'Alba', phone: '0730222222' })
  await db.websiteEntry.create({ data: { id: 'ea', businessLineId: 'bl', collectionId: col.id, slug: 'a', title: 'A', status: 'preview', leadId: 'a', data: {} } })
  await db.marketingTemplate.createMany({ data: [
    { id: 't-sms', businessLineId: 'bl', name: 'Invitație SMS', channel: 'sms', body: 'IntraConstruct: pagina {{company_name}} e pregatita: {{preview_link}} (pana la {{preview_expires}}). Dezabonare: intraconstruct.ro/stop' },
    { id: 't-plain', businessLineId: 'bl', name: 'Reamintire', channel: 'sms', body: 'Bună ziua, {{company_name}}! Revenim cu informații.' },
    { id: 't-mail', businessLineId: 'bl', name: 'Email', channel: 'email', body: 'x' },
    { id: 't-other', businessLineId: 'other', name: 'Alta linie', channel: 'sms', body: 'x' },
  ] })
})
after(async () => { if (db) await db.$disconnect() })

test('recording a call updates the lead, its stage and the timeline', { skip }, async () => {
  const cb = new Date(Date.now() + 3 * 86_400_000)
  const r = await S.recordCall('b', { outcome: 'interesat', notes: 'Vrea pagina', consentSms: 'da', consentEmail: 'nu', callbackAt: null, durationSec: 130 }, { id: 'u1', name: 'Adrian' })
  assert.deepEqual([r.status, r.statusChanged], ['in_discutii', true])
  const l = await lead('b'); assert.equal(l.status, 'in_discutii'); assert.equal(l.customFields.acord_sms, 'da'); assert.equal(l.customFields.rezultat_apel, 'Interesat'); assert.equal(l.customFields.pilot, 'da')   // other keys untouched
  const c = await db.communication.findFirst({ where: { leadId: 'b' } }); assert.deepEqual([c.channel, c.direction, c.callResult, c.duration, c.userName, c.phone], ['call', 'outbound', 'Interesat', 2, 'Adrian', '0730111111'])
  assert.ok(await db.activity.findFirst({ where: { leadId: 'b', action: 'status_changed' } }))
  await S.recordCall('f', { outcome: 'revin', callbackAt: cb }, { name: 'Adrian' }); const f = await lead('f'); assert.deepEqual([f.status, f.nextAction], ['contactat', 'Apel: revin']); assert.equal(+f.nextActionDate, +cb)   // already contactat: stage unchanged
  await S.recordCall('f', { outcome: 'interesat' }, { name: 'Adrian' }); const f2 = await lead('f'); assert.deepEqual([f2.status, f2.nextAction, f2.nextActionDate], ['in_discutii', null, null])           // the callback is done
  await assert.rejects(S.recordCall('g', { outcome: 'revin' }, {}), S.CallInputError); await assert.rejects(S.recordCall('nope', { outcome: 'interesat' }, {}), S.NotFound)
  assert.equal((await lead('g')).status, 'prospect')
  await S.recordCall('d', { outcome: 'refuza' }, {}); assert.equal((await lead('d')).status, 'refuzat')
  await S.recordCall('h', { outcome: 'refuza', notes: 'Nu ne interesează' }, {}); const h = await lead('h'); assert.deepEqual([h.status, h.optOut], ['refuzat', true])
})

test('the queue: callbacks due first, uncalled pilot firms in calling order, nobody who cannot or must not be called', { skip }, async () => {
  const past = new Date(Date.now() - 3_600_000), future = new Date(Date.now() + 5 * 86_400_000)
  await db.lead.update({ where: { id: 'e' }, data: { nextAction: 'Apel: reîncerc', nextActionDate: past } })
  await db.lead.update({ where: { id: 'a' }, data: { nextAction: 'Apel: revin', nextActionDate: future } })
  const due = await Q.dueCallbacks('bl'); assert.deepEqual(due.map((x) => x.id), ['e'])
  const u = await Q.uncalled('bl'); assert.deepEqual(u.items.map((x) => x.id), ['a'])   // b, f, d, h already worked; c has no phone; e has a result; g is not in the pilot
  assert.equal(u.total, 1)
  assert.deepEqual(await Q.queueCounts('bl'), { due: 1, upcoming: 1, uncalled: 1 })
  const cal = await Q.callbacksBetween('bl', new Date(), new Date(Date.now() + 10 * 86_400_000)); assert.deepEqual(cal.map((x) => x.id), ['a'])
  assert.deepEqual((await Q.callbacksBetween('bl', new Date(Date.now() + 6 * 86_400_000), new Date(Date.now() + 9 * 86_400_000))).map((x) => x.id), [])   // outside the range
  assert.equal(cal[0]!.acordSms, null); assert.equal(due[0]!.rezultatApel, 'Nu răspunde')
})

test('SMS: blocked without consent, after opt-out, outside the window, without legal publication or a preview; the reasons are listed', { skip }, async () => {
  process.env.OUTREACH_LEGAL_READY = '0'
  const p = await M.smsPreview('a', 't-sms', SAT)
  assert.ok(p.blockers.some((x) => /acordul pentru SMS/.test(x)) && p.blockers.some((x) => /9:00 și 18:00/.test(x)) && p.blockers.some((x) => /OUTREACH_LEGAL_READY/.test(x)))
  assert.match(p.text, /https:\/\/intraconstruct\.ro\/p\/••••••••••/)                                          // the real link does not exist yet
  assert.ok(!p.text.includes('{{'))
  const { deps, sent } = fake()
  await assert.rejects(M.sendLeadSms('a', 't-sms', { name: 'x' }, { deps, now: MON }), M.SmsBlocked); assert.equal(sent.length, 0)
  await db.lead.update({ where: { id: 'a' }, data: { customFields: { pilot: 'da', acord_sms: 'da' } } })
  await assert.rejects(M.sendLeadSms('a', 't-sms', {}, { deps, now: MON }), /OUTREACH_LEGAL_READY/)             // consent is not enough for a preview link
  process.env.OUTREACH_LEGAL_READY = '1'
  await assert.rejects(M.sendLeadSms('a', 't-sms', {}, { deps, now: SAT }), /9:00 și 18:00/)
  await assert.rejects(M.sendLeadSms('a', 't-mail', {}, { deps, now: MON }), /nu este pentru SMS/); await assert.rejects(M.sendLeadSms('a', 't-other', {}, { deps, now: MON }), /altei linii/)
  await assert.rejects(M.sendLeadSms('b', 't-sms', {}, { deps, now: MON }), /previzualizare privată/)           // b agreed but has no preview profile
  await db.lead.update({ where: { id: 'a' }, data: { optOut: true } }); await assert.rejects(M.sendLeadSms('a', 't-plain', {}, { deps, now: MON }), /nu mai fie contactată/); await db.lead.update({ where: { id: 'a' }, data: { optOut: false } })
  assert.equal(sent.length, 0)
})

test('SMS: sent once with a real private link, logged on the timeline; re-sending needs confirmation and replaces the link', { skip }, async () => {
  const { deps, sent } = fake()
  const r = await M.sendLeadSms('a', 't-sms', { name: 'Adrian' }, { deps, now: MON })
  assert.equal(r.sent, true); assert.equal(sent.length, 1); assert.equal(sent[0]!.to, '0730111111')
  const link = /intraconstruct\.ro\/p\/([1-9A-HJ-NP-Za-km-z]{10})/.exec(sent[0]!.body)?.[1]; assert.ok(link, sent[0]!.body); assert.match(sent[0]!.body, /pana la 16\.11\.2026/)
  const V = await import('../../../website/preview/service'); assert.equal((await V.lookupPreview('bl', link!, MON)).state, 'ok')
  const c = await db.communication.findFirst({ where: { leadId: 'a', channel: 'sms' } }); assert.deepEqual([c.direction, c.subject, c.userName, c.externalId], ['outbound', 'SMS: Invitație SMS', 'Adrian', 'sms-1']); assert.ok(c.body.includes(link))
  assert.ok((await lead('a')).customFields.sms_trimis_la)
  const p = await M.smsPreview('a', 't-sms', MON); assert.equal(p.alreadySent, true)
  await assert.rejects(M.sendLeadSms('a', 't-sms', {}, { deps, now: MON }), (e: any) => e.blockers[0] === 'already_sent' && /nu va mai funcționa/.test(e.message)); assert.equal(sent.length, 1)
  await M.sendLeadSms('a', 't-sms', {}, { deps, now: MON, resend: true }); assert.equal(sent.length, 2)
  assert.equal((await V.lookupPreview('bl', link!, MON)).state, 'invalid')                                        // the old link stopped working, as warned
  await M.sendLeadSms('a', 't-plain', {}, { deps, now: MON }); assert.equal(sent.length, 3); assert.match(sent[2]!.body, /Bună ziua, A!/)   // a template without a link needs no preview and is not blocked by the earlier send
})
