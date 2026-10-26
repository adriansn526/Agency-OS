/** DB-backed checks of the bulk publish. Needs PUBLISH_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.PUBLISH_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, P: typeof import('../publish')

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); P = await import('../publish')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteEntry","WebsiteCollection","WebsiteChannel","BusinessLine" CASCADE`)
  for (const id of ['bl', 'other']) await db.businessLine.create({ data: { id, slug: id, name: id, icon: 'x', color: '#000', config: {} } })
  const col = async (bl: string, key: string) => (await db.websiteCollection.create({ data: { id: `${bl}-${key}`, businessLineId: bl, key, name: key, namePlural: key, kind: 'article', fields: [] } })).id
  const sv = await col('bl', 'servicii'), pr = await col('bl', 'preturi'), gh = await col('bl', 'ghiduri'), co = await col('bl', 'companii'), ov = await col('other', 'preturi')
  const e = (id: string, collectionId: string, status: string, data: object = {}, businessLineId = 'bl', publishedAt: Date | null = null) => db.websiteEntry.create({ data: { id, businessLineId, collectionId, slug: id, title: id, status, data, publishedAt } })
  await e('g1', sv, 'draft', { tip: 'grup' }); await e('c1', sv, 'draft', { tip: 'categorie' }); await e('c2', sv, 'preview', { tip: 'categorie' }); await e('c3', sv, 'suspended', { tip: 'categorie' })
  await e('p1', pr, 'draft'); await e('p2', pr, 'published', {}, 'bl', new Date('2026-01-01')); await e('u1', gh, 'draft'); await e('f1', co, 'draft'); await e('o1', ov, 'draft', {}, 'other')
})
after(async () => { if (db) await db.$disconnect() })

const status = async (id: string) => (await db.websiteEntry.findUnique({ where: { id } })).status

test('the plan counts drafts and previews of the three collections, by type; suspended, firms and other lines are left out', { skip }, async () => {
  const p = await P.planPublish('bl')
  assert.equal(p.total, 5)
  assert.deepEqual(p.counts.map((c) => `${c.collection}/${c.tip}/${c.from}=${c.count}`).sort(), ['ghiduri/null/draft=1', 'preturi/null/draft=1', 'servicii/categorie/draft=1', 'servicii/categorie/preview=1', 'servicii/grup/draft=1'])
  assert.equal(await status('c1'), 'draft') // a plan changes nothing
})
test('apply publishes them, stamps publishedAt once and leaves the rest alone', { skip }, async () => {
  const now = new Date('2026-10-27T10:00:00Z')
  assert.deepEqual(await P.applyPublish(await P.planPublish('bl'), now), { changed: 5 })
  for (const id of ['g1', 'c1', 'c2', 'p1', 'u1']) assert.equal(await status(id), 'published', id)
  assert.equal(await status('c3'), 'suspended'); assert.equal(await status('f1'), 'draft'); assert.equal(await status('o1'), 'draft')
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'p1' } })).publishedAt.toISOString(), now.toISOString())
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'p2' } })).publishedAt.toISOString(), '2026-01-01T00:00:00.000Z')
})
test('a second run has nothing to do; going back to draft touches the same three collections only', { skip }, async () => {
  assert.equal((await P.planPublish('bl')).total, 0)
  assert.deepEqual(await P.applyPublish(await P.planPublish('bl', 'draft')), { changed: 6 }) // the five plus p2, which was published before
  assert.equal(await status('p2'), 'draft'); assert.equal(await status('c3'), 'suspended'); assert.equal(await status('f1'), 'draft')
  await assert.rejects(() => P.planPublish('nope'), /nu există/)
})
