/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, F: typeof import('../custom-field-filter')
const ids = async (op: string, value: unknown, field = 'cf.pilot', line: string | null = 'bl') => {
  const c = (await F.customFieldCondition(field, op, value, line)) as { id: { in: string[] } } | null
  return c && c.id.in.sort()
}

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); F = await import('../custom-field-filter')
  await db.$executeRawUnsafe(`TRUNCATE "Lead","BusinessLine" CASCADE`)
  for (const id of ['bl', 'other']) await db.businessLine.create({ data: { id, slug: id, name: id, icon: 'x', color: '#000', config: {} } })
  const mk = (id: string, cf: object, bl = 'bl') => db.lead.create({ data: { id, businessLineId: bl, entityType: 'parteneri', status: 'prospect', companyName: id, contactPerson: 'N/A', email: 'N/A', customFields: cf } })
  await mk('a', { pilot: 'da', nr: 5, regiune: 'Centru' }); await mk('b', { pilot: 'Da', nr: 12 }); await mk('c', { pilot: 'nu' }); await mk('d', {}); await mk('e', { pilot: 'da' }, 'other')
  await db.lead.create({ data: { id: 'n', businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: 'n', contactPerson: 'N/A', email: 'N/A' , customFields: undefined } }).catch(() => {})
})
after(async () => { if (db) await db.$disconnect() })

test('equals is case-insensitive and scoped to the line; missing keys never match', { skip }, async () => {
  assert.deepEqual(await ids('equals', 'da'), ['a', 'b'])
  assert.deepEqual(await ids('equals', 'da', 'cf.pilot', null), ['a', 'b', 'e'])
})
test('not_equals and not_in include leads without the key', { skip }, async () => {
  assert.deepEqual(await ids('not_equals', 'da'), ['c', 'd'].concat((await db.lead.findMany({ where: { id: 'n' } })).length ? ['n'] : []).sort())
  assert.deepEqual(await ids('not_in', ['da']), ['c', 'd'].concat((await db.lead.findMany({ where: { id: 'n' } })).length ? ['n'] : []).sort())
})
test('exists / not_exists / contains / starts_with / in', { skip }, async () => {
  assert.deepEqual(await ids('exists', true), ['a', 'b', 'c'])
  assert.deepEqual(await ids('contains', 'a'), ['a', 'b'])
  assert.deepEqual(await ids('starts_with', 'n'), ['c'])
  assert.deepEqual(await ids('in', ['nu', 'da']), ['a', 'b', 'c'])
  assert.deepEqual(await ids('not_exists', null, 'cf.regiune'), ['b', 'c', 'd'].concat((await db.lead.findMany({ where: { id: 'n' } })).length ? ['n'] : []).sort())
})
test('numeric comparisons ignore non-numeric values', { skip }, async () => {
  assert.deepEqual(await ids('gte', 6, 'cf.nr'), ['b'])
  assert.deepEqual(await ids('lt', 6, 'cf.nr'), ['a'])
  assert.deepEqual(await ids('gt', 'abc', 'cf.nr'), null)
  assert.deepEqual(await ids('gte', 1, 'cf.pilot'), [])   // 'da' is not a number: no error, no match
})
test('hostile key or wildcard characters are harmless', { skip }, async () => {
  assert.equal(await ids('equals', 'x', "cf.pilot'; DROP TABLE \"Lead\";--"), null)
  assert.deepEqual(await ids('contains', '%'), [])
  assert.equal(await db.lead.count() >= 5, true)
})
