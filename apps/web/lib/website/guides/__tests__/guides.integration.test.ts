/** DB-backed checks of the guides seed. Needs GUIDES_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.GUIDES_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, G: typeof import('../seed'), Z: typeof import('../../storefront/serialize')

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); G = await import('../seed'); Z = await import('../../storefront/serialize')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteLayoutVersion","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  const gl = await db.websiteCollection.create({ data: { id: 'cg', businessLineId: 'bl', key: 'servicii', name: 'Serviciu', namePlural: 'Servicii', kind: 'article', fields: [] } })
  await db.websiteEntry.create({ data: { id: 'g1', businessLineId: 'bl', collectionId: gl.id, slug: 'hidroizolatii', title: 'Hidroizolații', status: 'draft', data: { tip: 'categorie', parinte: 'lucrari-speciale' } } })
})
after(async () => { if (db) await db.$disconnect() })

test('the plan lists the three guides; a missing category is a problem', { skip }, async () => {
  const p = await G.planGuides('bl')
  assert.equal(p.collection, false); assert.deepEqual(p.toCreate.map((g) => g.slug).sort(), ['hidroizolatie-baie', 'hidroizolatie-fundatie-subsol-beci', 'igrasie']); assert.deepEqual(p.problems, [])
  await db.websiteEntry.update({ where: { id: 'g1' }, data: { slug: 'altceva' } })
  assert.ok((await G.planGuides('bl')).problems.some((x) => x.includes('nu există în glosar')))
  await assert.rejects(async () => G.applyGuides(await G.planGuides('bl')), /Conținut invalid/)
  await db.websiteEntry.update({ where: { id: 'g1' }, data: { slug: 'hidroizolatii' } })
})
test('apply creates the collection and the drafts with layout, data and a seed version', { skip }, async () => {
  const r = await G.applyGuides(await G.planGuides('bl'))
  assert.deepEqual(r, { created: 3, rewritten: 0 })
  const col = await db.websiteCollection.findFirst({ where: { key: 'ghiduri' } })
  assert.equal(col.kind, 'article')
  const rows = await db.websiteEntry.findMany({ where: { collectionId: col.id }, include: { media: true } })
  assert.equal(rows.length, 3); for (const e of rows) assert.equal(e.status, 'draft')
  const e = rows.find((x: any) => x.slug === 'igrasie')
  assert.equal(e.data.serviciu, 'hidroizolatii'); assert.ok(e.data.intrebari.length >= 5); assert.ok(e.seoTitle.length <= 60)
  assert.equal(await db.websiteLayoutVersion.count({ where: { entryId: e.id, source: 'seed' } }), 1)
  const d: any = Z.serializeDetail(e, 'ghiduri', e.media, [])
  assert.equal(d.hasBlocks, true); assert.equal(d.ready, true); assert.ok(d.pageLayout.blocks.length >= 10)
})
test('a second run changes nothing; --force rewrites and keeps the history', { skip }, async () => {
  const p = await G.planGuides('bl'); assert.equal(p.toCreate.length, 0); assert.equal(p.skipped.length, 3)
  assert.deepEqual(await G.applyGuides(p), { created: 0, rewritten: 0 })
  const f = await G.planGuides('bl', true); assert.equal(f.toRewrite.length, 3)
  assert.deepEqual(await G.applyGuides(f), { created: 0, rewritten: 3 })
  const e = await db.websiteEntry.findFirst({ where: { slug: 'igrasie' } })
  assert.equal(await db.websiteLayoutVersion.count({ where: { entryId: e.id } }), 2)
  assert.equal(await db.websiteEntry.count({ where: { collection: { key: 'ghiduri' } } }), 3)
})
