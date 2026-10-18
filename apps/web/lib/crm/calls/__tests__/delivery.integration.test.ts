/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { classify } from '../delivery'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, D: typeof import('../delivery')

test('classify: delivered / failed / everything else pending', () => {
  assert.deepEqual(['delivered', 'Delivered', 'failed', 'undelivered', 'sent', 'queued', '', null, 'rejected'].map(classify), ['delivered', 'delivered', 'failed', 'failed', 'pending', 'pending', 'pending', 'pending', 'failed'])
})

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); D = await import('../delivery')
  await db.$executeRawUnsafe(`TRUNCATE "Communication","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.lead.create({ data: { id: 'l1', businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: 'L', contactPerson: 'N/A', email: 'N/A', customFields: {} } })
  const mk = (id: string, externalId: string | null, extra: object = {}) => db.communication.create({ data: { id, leadId: 'l1', businessLineId: 'bl', channel: 'sms', direction: 'outbound', subject: 'SMS: T', body: 'x', externalId, userName: 'u', ...extra } })
  await mk('c1', 'tok-1'); await mk('c2', null); await mk('c3', 'tok-3', { metadata: { deliveryStatus: 'delivered', deliveredAt: '2026-10-18 13:00:00' } })
})
after(async () => { if (db) await db.$disconnect() })

test('status is fetched for unsettled messages with an id, stored, and settled ones are not asked again', { skip }, async () => {
  const asked: string[] = []
  const deps = { report: async (id: string) => { asked.push(id); return { status: 'delivered', deliveredAt: '2026-10-18 13:05:00' } } }
  const r = await D.refreshDeliveries('l1', { deps })
  assert.deepEqual(asked, ['tok-1'])
  const by = Object.fromEntries(r.map((x: any) => [x.id, x.state]))
  assert.deepEqual(by, { c1: 'delivered', c2: 'unknown', c3: 'delivered' })
  assert.equal((await db.communication.findUnique({ where: { id: 'c1' } })).metadata.deliveryStatus, 'delivered')
  await D.refreshDeliveries('l1', { deps }); assert.deepEqual(asked, ['tok-1'])   // c1 is settled now
})

test('a provider error leaves the message pending and does not throw', { skip }, async () => {
  await db.communication.update({ where: { id: 'c1' }, data: { metadata: null } })
  const r = await D.refreshDeliveries('l1', { deps: { report: async () => { throw new Error('down') } } })
  assert.equal(r.find((x: any) => x.id === 'c1')!.state, 'pending')
})
