/** DB-backed checks of `seed-services --only`. Needs SERVICES_SEED_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.SERVICES_SEED_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../seed')

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../seed')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteLayoutVersion","WebsiteEntry","WebsiteCollection","WebsiteChannel","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  const col = await db.websiteCollection.create({ data: { id: 'cg', businessLineId: 'bl', key: 'servicii', name: 'Serviciu', namePlural: 'Servicii', kind: 'article', fields: [] } })
  const e = (id: string, slug: string, data: object, layout: object | null = null) => db.websiteEntry.create({ data: { id, businessLineId: 'bl', collectionId: col.id, slug, title: slug, status: 'draft', data, layout } })
  await e('h1', 'hidroizolatii', { tip: 'categorie', parinte: 'lucrari-speciale' }, { version: 2, blocks: [{ id: 'intro', type: 'text', props: { body: '[DE COMPLETAT] intro' } }] }) // the template left by seed-content-layouts
  await e('a1', 'acoperisuri', { tip: 'categorie', parinte: 'structura-cladiri' }, { version: 2, blocks: [{ id: 'x', type: 'text', props: { body: 'Scris de echipă' } }] }) // a page the team already wrote
})
after(async () => { if (db) await db.$disconnect() })

test('--only writes just the named page: no new categories, no re-routing, the other written pages are untouched', { skip }, async () => {
  const p = await S.planServices('bl', true, ['hidroizolatii'])
  assert.deepEqual(p.pagesToWrite.map((c) => c.slug), ['hidroizolatii']); assert.deepEqual(p.categoriesToCreate, []); assert.deepEqual(p.reroutes, []); assert.deepEqual(p.problems, [])
  const r = await S.applyServices(p)
  assert.equal(r.written, 1); assert.equal(r.created, 0)
  const h = await db.websiteEntry.findUnique({ where: { id: 'h1' } })
  const types = h.layout.blocks.map((b: any) => b.type)
  for (const t of ['hero', 'guide_links', 'price_links', 'firms_list', 'request_form']) assert.ok(types.includes(t), t)
  assert.ok(!types.includes('price_table')); assert.equal(h.data.preturi.length, 0); assert.ok(h.data.intrebari.length >= 6)
  assert.equal(await db.websiteLayoutVersion.count({ where: { entryId: 'h1', source: 'seed' } }), 1)
  const a = await db.websiteEntry.findUnique({ where: { id: 'a1' } })
  assert.equal(a.layout.blocks[0].props.body, 'Scris de echipă')
})
test('a page that already has blocks needs --force even with --only; an unknown name is a problem', { skip }, async () => {
  const p = await S.planServices('bl', false, ['hidroizolatii'])
  assert.deepEqual(p.pagesToWrite, []); assert.deepEqual(p.pagesSkipped, ['hidroizolatii'])
  const bad = await S.planServices('bl', true, ['nu-exista'])
  assert.ok(bad.problems.some((x) => x.includes('nu-exista')))
  await assert.rejects(() => S.applyServices(bad), /Conținut invalid/)
})
