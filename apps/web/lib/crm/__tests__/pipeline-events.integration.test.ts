/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, P: typeof import('../pipeline-events')
const mk = (id: string, o: object = {}) => db.lead.create({ data: { id, businessLineId: 'bl', entityType: 'parteneri', status: 'contactat', companyName: id, contactPerson: 'N/A', email: 'N/A', customFields: {}, ...o } })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); P = await import('../pipeline-events')
  await db.$executeRawUnsafe(`TRUNCATE "Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await mk('a'); await mk('r', { status: 'refuzat' }); await mk('act', { status: 'activ' }); await mk('c', { entityType: 'clienti' })
})
after(async () => { if (db) await db.$disconnect() })

test('publishing moves a partner forward to activ, never reopens or touches others', { skip }, async () => {
  assert.equal(await P.onProfilePublished('a'), true)
  assert.equal((await db.lead.findUnique({ where: { id: 'a' } })).status, 'activ')
  assert.equal(await db.activity.count({ where: { leadId: 'a', action: 'status_changed' } }), 1)
  for (const id of ['r', 'act', 'c']) assert.equal(await P.onProfilePublished(id), false)
  assert.equal((await db.lead.findUnique({ where: { id: 'r' } })).status, 'refuzat')
  assert.equal(await P.onProfilePublished(null), false)
})

test('first preview view writes one note, even when concurrent', { skip }, async () => {
  const r = await Promise.all([P.onPreviewViewed('a'), P.onPreviewViewed('a'), P.onPreviewViewed('a')])
  assert.equal(r.filter(Boolean).length, 1)
  assert.equal(await P.onPreviewViewed('a'), false)
  assert.equal(await db.activity.count({ where: { leadId: 'a', action: 'note' } }), 1)
  assert.ok((await db.lead.findUnique({ where: { id: 'a' } })).customFields.previzualizare_vazuta_la)
})
