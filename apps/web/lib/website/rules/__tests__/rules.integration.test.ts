/**
 * Database-backed checks of the rules service. Skipped unless WEBSITE_TEST_DATABASE_URL points at a SCRATCH database with the FULL schema
 * (pg_dump -s of production) plus packages/db/prisma/sql/website_rules.sql. It truncates tables: never production.
 *
 *   WEBSITE_TEST_DATABASE_URL=postgresql://.../scratch npx tsx --test lib/website/rules/__tests__/rules.integration.test.ts
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.WEBSITE_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_

let db: any, svc: typeof import('../service'), AdminError: any

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db'))
  svc = await import('../service')
  ;({ AdminError } = await import('../../admin/errors'))
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteRuleAudit","WebsiteRule","WebsiteChannel","BusinessLine","User" CASCADE`)
  await db.user.create({ data: { id: 'u2', name: 'Adrian Test', email: 'adrian@example.invalid', password: 'x', role: 'admin' } })
  for (const id of ['A', 'B']) await db.businessLine.create({ data: { id, slug: id.toLowerCase(), name: id, icon: 'x', color: '#000', config: { entityTypes: [] } } })
})
after(async () => { if (db) await db.$disconnect() })

const rejects = async (p: Promise<unknown>, cls: any = Error, status?: number) =>
  assert.rejects(p, (e: any) => e instanceof cls && (status === undefined || e.status === status))
const price = (name: string, amountRon: number, conditions: unknown[] = [], extra: Record<string, unknown> = {}) => ({ kind: 'pricing', name, conditions, action: { amountRon }, ...extra })

test('create: validates the action for the rule kind and assigns the next priority', { skip }, async () => {
  const a = await svc.createRule('A', 'u1', price('Implicit', 20))
  const b = await svc.createRule('A', 'u1', price('Cluj', 35, [{ field: 'county', op: 'eq', value: 'Cluj' }]))
  assert.deepEqual([a.priority, b.priority], [10, 20])
  await rejects(svc.createRule('A', 'u1', price('Prea scump', 501)))
  await rejects(svc.createRule('A', 'u1', { kind: 'pricing', name: 'x', action: { chargeAt: 'delivery' } })) // billing action on a pricing rule
  await rejects(svc.createRule('A', 'u1', { kind: 'nope', name: 'x', action: {} }))
  await rejects(svc.createRule('A', 'u1', price('Condiție greșită', 5, [{ field: 'password', op: 'eq', value: 'x' }])))
  await rejects(svc.createRule('A', 'u1', price('Date inversate', 5, [], { validFrom: '2026-07-01', validTo: '2026-06-01' })), AdminError, 422)
  await rejects(svc.createRule('nope', 'u1', price('x', 1)), AdminError, 404)
})

test('create: the line limit for maxPriceRon is honoured', { skip }, async () => {
  await db.websiteChannel.create({ data: { businessLineId: 'B', config: { maxPriceRon: 1000 } } })
  await svc.createRule('B', 'u1', price('Premium', 900))
  await rejects(svc.createRule('B', 'u1', price('Peste plafon', 1001)))
})

test('concurrent creates get distinct priorities (no lost update)', { skip }, async () => {
  await Promise.all(Array.from({ length: 5 }, (_, i) => svc.createRule('A', 'u1', { kind: 'billing', name: `B${i}`, action: { chargeAt: 'delivery' } })))
  const { items } = await svc.listRules('A', 'billing')
  assert.deepEqual(items.map((r: any) => r.priority), [10, 20, 30, 40, 50])
})

test('limit of 100 rules per kind and line', { skip }, async () => {
  await db.websiteRule.createMany({ data: Array.from({ length: 100 }, (_, i) => ({ businessLineId: 'B', kind: 'routing', name: `R${i}`, priority: i, action: { mode: 'single', maxFirms: 1, maxAcceptances: 1, selection: 'nearest' } })) })
  await rejects(svc.createRule('B', 'u1', { kind: 'routing', name: 'una în plus', action: { mode: 'single' } }), AdminError, 409)
})

test('update: partial changes, action re-validated against the rule kind, audit has before/after', { skip }, async () => {
  const r = await svc.createRule('A', 'u1', price('De editat', 10))
  const u = await svc.updateRule('A', r.id, 'u2', { name: 'Editată', action: { amountRon: 12.5, freeFirstN: 3 }, isActive: false })
  assert.deepEqual([u.name, u.isActive, u.updatedBy, u.createdBy], ['Editată', false, 'u2', 'u1'])
  assert.deepEqual(u.action, { amountRon: 12.5, freeFirstN: 3 })
  await rejects(svc.updateRule('A', r.id, 'u2', { action: { chargeAt: 'delivery' } })) // wrong shape for pricing
  await rejects(svc.updateRule('A', r.id, 'u2', { validFrom: '2026-07-01', validTo: '2026-06-01' }), AdminError, 422)
  const items: any[] = (await svc.listAudit('A', { ruleId: r.id })).items
  assert.deepEqual(items.map((i) => i.action).sort(), ['create', 'update'])
  const upd = items.find((i) => i.action === 'update')
  assert.equal(upd.beforeData.name, 'De editat')
  assert.equal(upd.afterData.name, 'Editată')
  assert.equal(upd.userId, 'u2')
  assert.equal(upd.userName, 'Adrian Test') // resolved from the User table
  assert.equal(items.find((i) => i.action === 'create').userName, null) // unknown id: no name, no crash
})

test('delete: the rule goes away, its history stays', { skip }, async () => {
  const r = await svc.createRule('A', 'u1', price('Temporară', 1))
  await svc.deleteRule('A', r.id, 'u1')
  await rejects(svc.deleteRule('A', r.id, 'u1'), AdminError, 404)
  assert.equal(await db.websiteRule.count({ where: { id: r.id } }), 0)
  assert.deepEqual((await svc.listAudit('A', { ruleId: r.id })).items.map((i: any) => i.action).sort(), ['create', 'delete'])
})

test('reorder: exact set required, priorities renumbered, audited', { skip }, async () => {
  const { items } = await svc.listRules('A', 'billing')
  const ids: string[] = items.map((r: any) => r.id)
  const reversed = [...ids].reverse()
  await svc.reorderRules('A', 'u1', { kind: 'billing', ids: reversed })
  assert.deepEqual((await svc.listRules('A', 'billing')).items.map((r: any) => r.id), reversed)
  assert.deepEqual((await svc.listRules('A', 'billing')).items.map((r: any) => r.priority), [10, 20, 30, 40, 50])
  await rejects(svc.reorderRules('A', 'u1', { kind: 'billing', ids: ids.slice(1) }), AdminError, 409) // one missing
  await rejects(svc.reorderRules('A', 'u1', { kind: 'billing', ids: [...ids, 'extra'] }), AdminError, 409)
  await rejects(svc.reorderRules('A', 'u1', { kind: 'billing', ids: [ids[0], ids[0], ...ids.slice(2)] }), AdminError, 422)
  assert.ok((await svc.listAudit('A', {})).items.some((i: any) => i.action === 'reorder' && i.kind === 'billing'))
})

test('simulate: matches the first rule by order and explains the others; falls back to the default', { skip }, async () => {
  await db.websiteRule.deleteMany({ where: { businessLineId: 'A', kind: 'pricing' } })
  await svc.createRule('A', 'u1', price('Firma X gratuit', 0, [{ field: 'entry', op: 'eq', value: 'e_X' }], { priority: 1 }))
  await svc.createRule('A', 'u1', price('Cluj instalatori', 35, [{ field: 'county', op: 'eq', value: 'Cluj' }, { field: 'specialization', op: 'contains', value: 'Instalații' }], { priority: 2 }))
  await svc.createRule('A', 'u1', price('Implicit', 20, [], { priority: 99 }))
  const sim = (facts: object) => svc.simulate('A', { kind: 'pricing', facts })
  const x = await sim({ entry: 'e_X', county: 'Cluj', specialization: ['instalatii'] })
  assert.deepEqual([x.via, x.rule?.name, (x.action as any).amountRon], ['rule', 'Firma X gratuit', 0])
  const cj = await sim({ entry: 'e_Y', county: 'cluj', specialization: ['Instalații sanitare', 'Instalații'] })
  assert.deepEqual([cj.rule?.name, (cj.action as any).amountRon], ['Cluj instalatori', 35])
  assert.deepEqual(cj.trace.map((t) => t.status), ['no_match', 'matched', 'not_evaluated'])
  assert.deepEqual((await sim({ county: 'Iași' })).rule?.name, 'Implicit')
  assert.equal((await svc.simulate('A', { kind: 'recommendation', facts: {} })).via, 'default') // no rules of this kind
  await rejects(svc.simulate('A', { kind: 'pricing', facts: { password: 'x' } }))
  const future = await svc.simulate('A', { kind: 'pricing', facts: { county: 'Iași' }, at: '2030-01-01' })
  assert.equal(future.rule?.name, 'Implicit')
})

test('validity window: an expired promotion is skipped, a current one applies', { skip }, async () => {
  await svc.createRule('A', 'u1', { kind: 'recommendation', name: 'Promoție expirată', priority: 1, validTo: '2020-01-01', action: { minReviews: 1, minRating: 1 } })
  await svc.createRule('A', 'u1', { kind: 'recommendation', name: 'Prag normal', priority: 2, action: { minReviews: 5, minRating: 4.5 } })
  const r = await svc.simulate('A', { kind: 'recommendation', facts: {} })
  assert.deepEqual(r.trace.map((t) => t.status), ['expired', 'matched'])
  assert.deepEqual(r.action, { minReviews: 5, minRating: 4.5, requireVerified: true })
})

test('lines are isolated: rules, updates, deletes, simulations and history', { skip }, async () => {
  const a = await svc.createRule('A', 'u1', price('Doar A', 77, [], { priority: 5 }))
  await rejects(svc.updateRule('B', a.id, 'u1', { name: 'Hijack' }), AdminError, 404)
  await rejects(svc.deleteRule('B', a.id, 'u1'), AdminError, 404)
  assert.equal((await svc.listRules('B', 'pricing')).items.some((r: any) => r.id === a.id), false)
  assert.equal((await svc.listAudit('B', { ruleId: a.id })).items.length, 0)
  const sim = await svc.simulate('B', { kind: 'pricing', facts: {} })
  assert.notEqual((sim.action as any).amountRon, 77)
  await rejects(svc.reorderRules('B', 'u1', { kind: 'pricing', ids: [a.id] }), AdminError, 409)
})
