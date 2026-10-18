/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { isBot } from '../views'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, V: typeof import('../views'), token: string
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const T0 = new Date()
const at = (min: number) => new Date(T0.getTime() + min * 60_000)
const sent: any[] = []
const realFetch = globalThis.fetch

test('isBot: scanners, previews and empty agents are bots; real browsers are not', () => {
  for (const ua of [null, '', 'curl/8.0', 'WhatsApp/2.23', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'facebookexternalhit/1.1', 'TelegramBot (like TwitterBot)', 'Mozilla/5.0 (Windows NT 10.0) HeadlessChrome/120 Safari/537.36', 'python-requests/2.31 (internal scanner x)']) assert.equal(isBot(ua), true, String(ua))
  for (const ua of [UA, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36']) assert.equal(isBot(ua), false, ua)
})

before(async () => {
  if (skip) return
  process.env.INTRACONSTRUCT_TELEGRAM_BOT_TOKEN = 'tok'; process.env.INTRACONSTRUCT_TELEGRAM_CHAT_ID = '42'
  globalThis.fetch = (async (_u: any, init: any) => { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }) }) as any
  ;({ db } = await import('@repo/db')); V = await import('../views'); const P = await import('../service')
  await db.$executeRawUnsafe(`TRUNCATE "Activity","WebsiteEntry","WebsiteCollection","WebsiteChannel","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteChannel.create({ data: { businessLineId: 'bl', siteUrl: 'https://x.ro' } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  await db.lead.create({ data: { id: 'l1', businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: 'ALFA <SRL>', contactPerson: 'N/A', email: 'N/A', phone: '0730111111', city: 'Cluj-Napoca', county: 'Cluj', customFields: { pilot: 'da' } } })
  await db.websiteEntry.create({ data: { id: 'e1', businessLineId: 'bl', collectionId: col.id, slug: 'alfa', title: 'ALFA', status: 'preview', leadId: 'l1', data: {} } })
  token = (await P.issuePreview('bl', 'e1', { now: T0 })).token
})
after(async () => { globalThis.fetch = realFetch; if (db) await db.$disconnect() })
const cf = async () => (await db.lead.findUnique({ where: { id: 'l1' } })).customFields
const notes = () => db.activity.count({ where: { leadId: 'l1', action: 'note' } })

test('bots and bad tokens are not counted', { skip }, async () => {
  assert.deepEqual(await V.recordPreviewView('bl', token, { userAgent: 'WhatsApp/2.23.20 A' , now: at(0) }), { counted: false, reason: 'bot' })
  assert.deepEqual(await V.recordPreviewView('bl', 'abcdefghij', { userAgent: UA, now: at(0) }), { counted: false, reason: 'invalid' })
  assert.equal((await cf()).previzualizari, undefined); assert.equal(sent.length, 0)
})

test('first visit: counted once even when concurrent, one note, one Telegram message (HTML-escaped, with a CRM button)', { skip }, async () => {
  const r = await Promise.all([1, 2, 3].map(() => V.recordPreviewView('bl', token, { userAgent: UA, now: at(1) })))
  assert.equal(r.filter((x: any) => x.counted).length, 1)
  const c = await cf(); assert.equal(c.previzualizari, 1); assert.ok(c.previzualizare_vazuta_la); assert.ok(c.ultima_previzualizare_la); assert.equal(c.pilot, 'da')
  assert.equal(await notes(), 1); assert.equal(sent.length, 1)
  assert.match(sent[0].text, /ALFA &lt;SRL&gt;/); assert.equal(sent[0].chat_id, '42'); assert.match(sent[0].reply_markup.inline_keyboard[0][0].url, /\/crm\/lead-uri\/l1$/)
})

test('reload within 10 minutes is the same visit; a later visit is counted silently; a return after 12h is announced again', { skip }, async () => {
  assert.deepEqual(await V.recordPreviewView('bl', token, { userAgent: UA, now: at(5) }), { counted: false, reason: 'same_visit' })
  const same = await V.recordPreviewView('bl', token, { userAgent: UA, now: at(30) })
  assert.deepEqual([same.counted, (same as any).returning], [true, false]); assert.equal(await notes(), 1); assert.equal(sent.length, 1)
  const back = await V.recordPreviewView('bl', token, { userAgent: UA, now: at(60 * 14) })
  assert.deepEqual([(back as any).returning, (back as any).count], [true, 3]); assert.equal(await notes(), 2); assert.equal(sent.length, 2)
  assert.match(sent[1].text, /vizita 3/)
})

test('expired links are not counted', { skip }, async () => {
  assert.deepEqual(await V.recordPreviewView('bl', token, { userAgent: UA, now: at(60 * 24 * 20) }), { counted: false, reason: 'expired' })
})
