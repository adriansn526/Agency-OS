/** DB-backed checks of the situations seed. Needs SITUATIONS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.SITUATIONS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../seed'), SIT: typeof import('../index'), V: typeof import('../../glossary/validate')

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../seed'); SIT = await import('../index'); V = await import('../../glossary/validate')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteLayoutVersion","WebsiteEntry","WebsiteCollection","WebsiteChannel","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  const col = await db.websiteCollection.create({ data: { id: 'cg', businessLineId: 'bl', key: 'servicii', name: 'Serviciu', namePlural: 'Servicii', kind: 'article', fields: [{ key: 'tip', label: 'Tip', type: 'select', options: ['grup', 'categorie'] }] } })
  await db.websiteEntry.create({ data: { id: 'h1', businessLineId: 'bl', collectionId: col.id, slug: 'hidroizolatii', title: 'Hidroizolații', status: 'draft', data: { tip: 'categorie', parinte: 'lucrari-speciale' } } })
  for (const c of new Set(SIT.SITUATIONS.map((x) => x.categorie))) if (c !== 'hidroizolatii') await db.websiteEntry.create({ data: { id: `c-${c}`, businessLineId: 'bl', collectionId: col.id, slug: c, title: c, status: 'draft', data: { tip: 'categorie', parinte: 'lucrari-speciale' } } })
})
after(async () => { if (db) await db.$disconnect() })

test('plan: all the situations to create, the missing "situație" option is added, a missing category is a problem', { skip }, async () => {
  const p = await S.planSituations('bl')
  assert.equal(p.toCreate.length, SIT.SITUATIONS.length); assert.equal(p.addOption, true); assert.deepEqual(p.problems, [])
  await db.websiteEntry.update({ where: { id: 'h1' }, data: { slug: 'altceva' } })
  assert.ok((await S.planSituations('bl')).problems.some((x) => x.includes('nu există în glosar')))
  await assert.rejects(async () => S.applySituations(await S.planSituations('bl')), /Conținut invalid/)
  await db.websiteEntry.update({ where: { id: 'h1' }, data: { slug: 'hidroizolatii' } })
})
test('apply creates draft situations ticked "în construcție", with parent, lists and a seed version', { skip }, async () => {
  assert.deepEqual(await S.applySituations(await S.planSituations('bl')), { created: SIT.SITUATIONS.length, rewritten: 0, optionAdded: true })
  const col = await db.websiteCollection.findFirst({ where: { key: 'servicii' } })
  assert.deepEqual(col.fields.find((f: any) => f.key === 'tip').options, ['grup', 'categorie', 'situatie'])
  const e = await db.websiteEntry.findFirst({ where: { slug: 'hidroizolatii--baie' } })
  assert.equal(e.status, 'draft'); assert.equal(e.data.tip, 'situatie'); assert.equal(e.data.parinte, 'hidroizolatii'); assert.equal(e.data.in_constructie, 'da'); assert.ok(e.data.intrebari.length >= 5)
  assert.equal(await db.websiteLayoutVersion.count({ where: { entryId: e.id, source: 'seed' } }), 1)
})
test('a second run changes nothing; --force keeps the tick the team decided', { skip }, async () => {
  const p = await S.planSituations('bl'); assert.equal(p.toCreate.length, 0); assert.equal(p.skipped.length, SIT.SITUATIONS.length); assert.equal(p.addOption, false)
  await db.websiteEntry.updateMany({ where: { slug: 'hidroizolatii--baie' }, data: { data: { tip: 'situatie', parinte: 'hidroizolatii', in_constructie: 'nu' } } })
  assert.deepEqual(await S.applySituations(await S.planSituations('bl', true)), { created: 0, rewritten: SIT.SITUATIONS.length, optionAdded: false })
  assert.equal((await db.websiteEntry.findFirst({ where: { slug: 'hidroizolatii--baie' } })).data.in_constructie, 'nu')
  assert.equal(await db.websiteEntry.count({ where: { slug: { startsWith: 'hidroizolatii--' } } }), 3)
})
test('a category with situations cannot be removed; a situation needs an existing parent and the right slug', { skip }, async () => {
  const cat = await db.websiteEntry.findFirst({ where: { slug: 'hidroizolatii' } })
  await assert.rejects(() => V.assertServiceRemovable('bl', cat), /situați/)
  await assert.rejects(() => V.assertServiceEntry('bl', { tip: 'situatie', parinte: 'nu-exista' }, 'nu-exista--x'), /categorie/)
  await assert.rejects(() => V.assertServiceEntry('bl', { tip: 'situatie', parinte: 'hidroizolatii' }, 'altceva--x'), /hidroizolatii--/)
  await V.assertServiceEntry('bl', { tip: 'situatie', parinte: 'hidroizolatii' }, 'hidroizolatii--pivnita')
})
