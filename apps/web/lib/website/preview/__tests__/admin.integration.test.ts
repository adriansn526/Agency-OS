/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, A: typeof import('../admin'), P: typeof import('../service'), V: typeof import('../views')
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const NOW = new Date('2026-11-02T10:00:00Z')

before(async () => {
  if (skip) return
  process.env.INTRACONSTRUCT_TELEGRAM_BOT_TOKEN = ''; process.env.INTRACONSTRUCT_TELEGRAM_CHAT_ID = ''
  ;({ db } = await import('@repo/db')); A = await import('../admin'); P = await import('../service'); V = await import('../views')
  await db.$executeRawUnsafe(`TRUNCATE "Activity","WebsiteEntry","WebsiteCollection","WebsiteChannel","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteChannel.create({ data: { businessLineId: 'bl', siteUrl: 'https://x.ro/' } })
  await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  await db.lead.create({ data: { id: 'l1', businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: 'ALFA', contactPerson: 'N/A', email: 'N/A', customFields: {} } })
  await db.websiteEntry.create({ data: { id: 'e1', businessLineId: 'bl', collectionId: 'c', slug: 'alfa', title: 'ALFA', status: 'preview', leadId: 'l1', data: {} } })
})
after(async () => { if (db) await db.$disconnect() })

test('status before any link: nothing active, no views, no answer', { skip }, async () => {
  const s = await A.previewStatus('bl', 'e1', NOW)
  assert.deepEqual([s.status, s.link.active, s.views, s.answer, s.publicUrl], ['preview', false, 0, null, null])
  await assert.rejects(A.previewStatus('bl', 'nope'), /nu există/)
})
test('generating a link returns the short link and the answer page link, logs it, and replaces the previous link', { skip }, async () => {
  const a = await A.generatePreviewLink('bl', 'e1', { name: 'Adrian' }, NOW)
  assert.match(a.link, /^https:\/\/x\.ro\/p\/[1-9A-HJ-NP-Za-km-z]{10}$/); const code = a.link.split('/p/')[1]!
  assert.equal(a.answerLink, `https://x.ro/previzualizare/${code}/raspuns`); assert.equal(a.days, 14)
  const s = await A.previewStatus('bl', 'e1', NOW); assert.deepEqual([s.link.active, s.link.issuedAt, s.link.expiresAt], [true, NOW.toISOString(), new Date(NOW.getTime() + 14 * 86_400_000).toISOString()])
  assert.equal((await A.previewStatus('bl', 'e1', new Date(NOW.getTime() + 15 * 86_400_000))).link.active, false)         // expired
  assert.equal(await db.activity.count({ where: { leadId: 'l1', action: 'note' } }), 1)
  const b = await A.generatePreviewLink('bl', 'e1', {}, NOW)
  assert.equal((await P.lookupPreview('bl', code, NOW)).state, 'invalid'); assert.equal((await P.lookupPreview('bl', b.link.split('/p/')[1]!, NOW)).state, 'ok')
})
test('views and the firm\'s answer show up in the status', { skip }, async () => {
  const code = (await A.generatePreviewLink('bl', 'e1', {}, NOW)).link.split('/p/')[1]!
  await V.recordPreviewView('bl', code, { userAgent: UA, now: NOW, notify: false })
  await P.respondPreview('bl', code, { action: 'accept', acceptTerms: true, acceptGdpr: true, contactName: 'Ion Popescu', termsVersion: 'v1' }, NOW)
  const s = await A.previewStatus('bl', 'e1', NOW)
  assert.deepEqual([s.views, s.answer, !!s.firstViewAt, !!s.lastViewAt, !!s.answerAt], [1, 'acceptat', true, true, true])
})
test('only entries in the preview state can get a link; a published firm shows its public URL', { skip }, async () => {
  await db.websiteEntry.update({ where: { id: 'e1' }, data: { status: 'published' } })
  await assert.rejects(A.generatePreviewLink('bl', 'e1', {}, NOW), /preview/)
  const s = await A.previewStatus('bl', 'e1', NOW); assert.deepEqual([s.publicUrl, s.link.active], ['https://x.ro/companii/alfa', false])
})
