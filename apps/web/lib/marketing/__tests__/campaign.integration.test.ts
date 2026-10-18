/** DB-backed checks of campaign delivery, preview variables and opt-out. Needs CAMPAIGN_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CAMPAIGN_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, D: typeof import('../dispatch'), C: typeof import('../../website/preview/campaign'), O: typeof import('../../website/optout'), V: typeof import('../../website/preview/service')
const sent: any[] = []
const fakeSend = async (m: any) => { if (m.to.startsWith('boom')) throw new Error('SMTP 550 mailbox unavailable'); sent.push(m); return { messageId: 'x', success: true } }

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); D = await import('../dispatch'); C = await import('../../website/preview/campaign'); O = await import('../../website/optout'); V = await import('../../website/preview/service')
  await db.$executeRawUnsafe(`TRUNCATE "CampaignLead","MarketingCampaign","MarketingTemplate","WebsiteLayoutVersion","WebsitePartnerSession","WebsitePartnerLogin","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  for (const id of ['bl', 'other']) await db.businessLine.create({ data: { id, slug: id, name: id, icon: 'x', color: '#000', config: {} } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  const L = (id: string, o: object) => db.lead.create({ data: { id, businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: id.toUpperCase(), contactPerson: 'N/A', email: 'N/A', ...o } })
  await L('l1', { email: 'office@a.ro', phone: '0730111111', county: 'Mureș' }); await L('l2', { email: 'office@b.ro', phone: '0730222222' }); await L('l3', { email: 'N/A' }); await L('l4', { email: 'draft@x.ro' })
  await db.lead.create({ data: { id: 'lo', businessLineId: 'other', entityType: 'clients', status: 'nou', companyName: 'ALTA', contactPerson: 'x', email: 'office@a.ro', phone: '0730111111' } })
  await db.websiteEntry.createMany({ data: [
    { id: 'e1', businessLineId: 'bl', collectionId: col.id, slug: 'a', title: 'A', status: 'preview', leadId: 'l1' },
    { id: 'e3', businessLineId: 'bl', collectionId: col.id, slug: 'c', title: 'C', status: 'published', leadId: 'l3' }, // already published: no preview link
  ] })
})
after(async () => { if (db) await db.$disconnect() })

test('preview variables: a fresh short link and a date for leads that have a preview; others are left out', { skip }, async () => {
  const now = new Date('2026-11-02T08:00:00Z')
  const m = await C.previewVarsFor('bl', ['l1', 'l2', 'l3', 'nope'], { siteUrl: 'https://intraconstruct.ro/', now })
  assert.deepEqual([...m.keys()], ['l1'])
  const v = m.get('l1')!
  assert.match(v.preview_link, /^https:\/\/intraconstruct\.ro\/p\/[1-9A-HJ-NP-Za-km-z]{10}$/); assert.equal(v.preview_expires, '16.11.2026') // 14 days from sending
  const code = v.preview_link.split('/p/')[1]!
  assert.equal((await V.lookupPreview('bl', code, new Date('2026-11-03T00:00:00Z'))).state, 'ok')
  assert.equal(C.templateNeedsPreview('Vezi {{preview_link}}'), true); assert.equal(C.templateNeedsPreview('Salut {{company_name}}'), false)
  assert.equal(C.unsubscribeUrl('https://intraconstruct.ro/', 'a+b@x.ro'), 'https://intraconstruct.ro/stop?e=a%2Bb%40x.ro')
})

test('email delivery: sent only when the server accepts; failures and bad addresses are recorded, not faked', { skip }, async () => {
  await db.marketingTemplate.create({ data: { id: 't', businessLineId: 'bl', name: 'T', channel: 'email', subject: 'Pagina {{company_name}}', body: 'x' } })
  await db.marketingCampaign.create({ data: { id: 'cmp', businessLineId: 'bl', name: 'K', channel: 'email', templateId: 't' } })
  const mk = async (leadId: string, email: string | null, body = 'Salut\n\nVezi https://intraconstruct.ro/p/AbC12xYz9k') => {
    await db.lead.update({ where: { id: leadId }, data: { email: email ?? 'N/A' } })
    const cl = await db.campaignLead.create({ data: { campaignId: 'cmp', leadId, uniqueCode: `u-${leadId}`, messageBody: body, status: 'pending' } })
    return { id: cl.id, leadId, messageBody: body, lead: { email, companyName: leadId.toUpperCase(), city: null, county: null } }
  }
  const items = [await mk('l1', 'office@a.ro'), await mk('l2', 'boom@b.ro'), await mk('l3', 'N/A'), await mk('lo', 'office@x.ro', ''), await mk('l4', 'draft@x.ro', 'Oferta: [DE COMPLETAT: preț]')]
  // 'lo' belongs to another line but the dispatcher only needs the item; an empty body is refused
  const r = await D.dispatchEmails(items as any, { campaignId: 'cmp', lineSlug: 'bl', subject: 'Pagina {{company_name}}', unsubscribeUrl: (e) => `https://intraconstruct.ro/stop?e=${encodeURIComponent(e)}` }, { send: fakeSend as any }, new Date('2026-11-02T08:00:00Z'))
  assert.deepEqual(r, { sent: 1, failed: 4 })
  assert.equal((await db.campaignLead.findUnique({ where: { id: items[4]!.id } })).notes, 'ciornă nefinalizată ([DE COMPLETAT])')
  const status = async (id: string) => (await db.campaignLead.findUnique({ where: { id } }))
  assert.equal((await status(items[0]!.id)).status, 'sent'); assert.equal((await status(items[1]!.id)).status, 'failed'); assert.match((await status(items[1]!.id)).notes, /SMTP 550/)
  assert.equal((await status(items[2]!.id)).notes, 'email invalid'); assert.equal((await status(items[3]!.id)).notes, 'mesaj gol')
  assert.equal(sent.length, 1)
  const m = sent[0]
  assert.equal(m.to, 'office@a.ro'); assert.equal(m.subject, 'Pagina L1'); assert.equal(m.purpose, 'partners'); assert.equal(m.businessLine, 'bl'); assert.deepEqual(m.link, { leadId: 'l1' })
  assert.match(m.headers['List-Unsubscribe'], /^<https:\/\/intraconstruct\.ro\/stop\?e=office%40a\.ro>$/); assert.ok(m.text.includes('/stop?e=office%40a.ro')); assert.ok(m.html.includes('<a href="https://intraconstruct.ro/p/AbC12xYz9k">'))
  const lead = await db.lead.findUnique({ where: { id: 'l1' } }); assert.equal(lead.campaignCount, 1); assert.equal(lead.lastCampaignId, 'cmp')
  assert.equal((await db.lead.findUnique({ where: { id: 'l2' } })).campaignCount, 0) // a failed send does not count as a contact
})

test('opt-out: by email (any case) or phone (any format), only on this line, idempotent, same answer for unknown', { skip }, async () => {
  assert.deepEqual(await O.optOut('bl', 'OFFICE@A.RO'), { matched: 1 })
  assert.equal((await db.lead.findUnique({ where: { id: 'l1' } })).optOut, true)
  assert.equal((await db.lead.findUnique({ where: { id: 'lo' } })).optOut, false) // same address on another line is untouched
  assert.ok(await db.activity.findFirst({ where: { action: 'lead_opt_out', leadId: 'l1' } }))
  assert.deepEqual(await O.optOut('bl', 'office@a.ro'), { matched: 0 }) // already out: nothing to do
  assert.deepEqual(await O.optOut('bl', '+40 730 222 222'), { matched: 1 }); assert.equal((await db.lead.findUnique({ where: { id: 'l2' } })).optOut, true)
  for (const junk of ['', 'nu-exista@x.ro', 'garbage', '123', null, undefined, 'x'.repeat(300)]) assert.deepEqual(await O.optOut('bl', junk as any), { matched: 0 })
  assert.equal((await db.lead.findUnique({ where: { id: 'l3' } })).optOut, false)
})
