/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { validateSet, type FieldDef } from '../custom-fields'

const defs: FieldDef[] = [
  { key: 'plan', label: 'Plan', type: 'select', options: ['Gratuit', 'PRO'] }, { key: 'cui', label: 'CUI', type: 'text' },
  { key: 'valoare', label: 'Valoare', type: 'number' }, { key: 'data_apel', label: 'Data', type: 'date' }, { key: 'nota', label: 'Notă', type: 'rating' },
]
test('validateSet: only defined keys, select options, numbers, dates; empty values remove', () => {
  assert.deepEqual(validateSet(defs, { plan: 'PRO', cui: ' 123 ', valoare: '12.5', data_apel: '2026-10-19', pilot: 'da', nota: 4 }), { write: { plan: 'PRO', cui: '123', valoare: 12.5, data_apel: '2026-10-19', pilot: 'da', nota: 4 }, remove: [] })
  assert.deepEqual(validateSet(defs, { plan: '', pilot: null, cui: null }), { write: {}, remove: ['plan', 'pilot', 'cui'] })
  for (const bad of [{ detalii: 'x' }, { plan: 'Platinum' }, { valoare: 'abc' }, { data_apel: '19.10.2026' }, { pilot: 'nu' }, { nota: 9 }, {}, { cui: { a: 1 } as any }]) assert.throws(() => validateSet(defs, bad), /./, JSON.stringify(bad))
})

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, C: typeof import('../custom-fields')
before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); C = await import('../custom-fields')
  await db.$executeRawUnsafe(`TRUNCATE "Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: { entityTypes: [{ id: 'parteneri', name: 'P', namePlural: 'P', icon: 'x', financialFlow: 'income', pipeline: [], customFields: defs }] } } })
  const mk = (id: string, cf: object | null, o: object = {}) => db.lead.create({ data: { id, businessLineId: 'bl', entityType: 'parteneri', status: 'prospect', companyName: id, contactPerson: 'N/A', email: 'N/A', customFields: cf ?? undefined, ...o } })
  await mk('a', { pilot: 'da', detalii: { x: 1 }, rezultat_apel: 'Interesat' }); await mk('b', {}); await mk('c', { plan: 'PRO' }); await mk('gone', {}, { deletedAt: new Date() })
})
after(async () => { if (db) await db.$disconnect() })
const cf = async (id: string) => (await db.lead.findUnique({ where: { id } })).customFields

test('setLeadCustomFields merges without touching other keys, validates and logs only real changes', { skip }, async () => {
  const r = await C.setLeadCustomFields('a', { plan: 'PRO', pilot: null }, { id: 'u1', name: 'Adrian' })
  assert.deepEqual(r.changed, { plan: { from: null, to: 'PRO' }, pilot: { from: 'da', to: null } })
  assert.deepEqual(await cf('a'), { plan: 'PRO', detalii: { x: 1 }, rezultat_apel: 'Interesat' })
  const act = await db.activity.findFirst({ where: { leadId: 'a' } }); assert.deepEqual([act.action, act.userName], ['updated', 'Adrian'])
  assert.deepEqual((await C.setLeadCustomFields('a', { plan: 'PRO' })).changed, {}); assert.equal(await db.activity.count({ where: { leadId: 'a' } }), 1)
  await assert.rejects(C.setLeadCustomFields('a', { detalii: 'x' }), /nu există pe acest tip/); await assert.rejects(C.setLeadCustomFields('gone', { plan: 'PRO' }), /nu există/)
})
test('setPilot adds and removes in bulk, skips unchanged and deleted leads, one note per changed lead', { skip }, async () => {
  const on = await C.setPilot(['a', 'b', 'c', 'gone', 'a', 'nope'], true)
  assert.deepEqual(on, { updated: 3, requested: 5 })
  for (const id of ['a', 'b', 'c']) assert.equal((await cf(id)).pilot, 'da'); assert.equal((await cf('c')).plan, 'PRO'); assert.equal((await cf('gone')).pilot, undefined)
  assert.deepEqual(await C.setPilot(['a', 'b'], true), { updated: 0, requested: 2 })
  assert.deepEqual(await C.setPilot(['a', 'b', 'c'], false), { updated: 3, requested: 3 })
  assert.equal((await cf('a')).pilot, undefined); assert.deepEqual((await cf('a')).detalii, { x: 1 })
  await assert.rejects(C.setPilot([], true), /Nicio firmă/); await assert.rejects(C.setPilot(Array.from({ length: 1001 }, (_, i) => `x${i}`), true), /Maxim/)
})
