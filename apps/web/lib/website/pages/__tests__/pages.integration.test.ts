/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../service')
const NOW = new Date('2026-11-02T10:00:00Z')
const firm = (id: string, o: object = {}) => db.websiteEntry.findUnique({ where: { id } }).then((e: any) => ({ ...e, ...o }))
const node = (id: string, type: string, props: object = {}) => ({ id, type, props })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../service')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteLayoutVersion","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  for (const id of ['bl', 'other']) await db.businessLine.create({ data: { id, slug: id, name: id, icon: 'x', color: '#000', config: {} } })
  await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  const future = new Date(NOW.getTime() + 90 * 86_400_000)
  await db.websiteEntry.create({ data: { id: 'f1', businessLineId: 'bl', collectionId: 'c', slug: 'alfa', title: 'ALFA', status: 'published', plan: 'abonament', planUntil: future, data: {} } })
  await db.websiteEntry.create({ data: { id: 'f2', businessLineId: 'bl', collectionId: 'c', slug: 'beta', title: 'BETA', status: 'published', data: {} } })   // free plan
  await db.websiteMedia.create({ data: { id: 'cmvmedia0001abc', entryId: 'f1', kind: 'image', storageKey: 'k1', url: 'https://cdn/1.webp' } })
  await db.websiteMedia.create({ data: { id: 'cmvmedia0009zzz', entryId: 'f2', kind: 'image', storageKey: 'k2', url: 'https://cdn/2.webp' } })   // another firm's image
})
after(async () => { if (db) await db.$disconnect() })

test('pages are part of the abonament: the free plan and an expired plan cannot create them', { skip }, async () => {
  const free = await firm('f2'); const pol = S.policy(free, NOW); assert.deepEqual([pol.canCreate, pol.max], [false, 5]); assert.match(pol.reason!, /abonament/)
  await assert.rejects(S.createPage(free, { title: 'Despre noi' }, NOW), /incluse în abonament/)
  await assert.rejects(S.createPage(await firm('f1', { planUntil: new Date(NOW.getTime() - 1000) }), { title: 'Despre noi' }, NOW), /incluse în abonament/)
  assert.equal(S.policy(await firm('f1'), NOW).canCreate, true)
})
test('creating: a draft with an empty v2 layout, a readable address, unique per firm, capped at 5', { skip }, async () => {
  const f = await firm('f1')
  const a = await S.createPage(f, { title: 'Despre noi' }, NOW); assert.deepEqual([a.status, a.slug], ['draft', 'despre-noi'])
  const b = await S.createPage(f, { title: 'Despre noi' }, NOW); assert.equal(b.slug, 'despre-noi-2')
  const g = await S.getPage(f, a.id); assert.deepEqual(g.layout, { version: 2, blocks: [] }); assert.ok(g.catalog.length >= 10); assert.deepEqual(g.media.map((m: any) => m.id), ['cmvmedia0001abc'])
  for (const t of ['Oferta iarna', 'Proiecte bloc', 'Servicii noi']) await S.createPage(f, { title: t }, NOW)
  await assert.rejects(S.createPage(f, { title: 'A șasea' }, NOW), /Maxim 5/)
  await assert.rejects(S.createPage(f, { title: 'x' }, NOW), /Date invalide/); await assert.rejects(S.createPage(f, { title: 'Ok', extra: 1 }, NOW), /Date invalide/)
})
test('saving validates the layout (including image ownership), versions every change and keeps the last 20', { skip }, async () => {
  const f = await firm('f1'); const id = (await S.listPages(f, NOW)).items[0]!.id
  const good = { version: 2, blocks: [node('h', 'heading', { text: 'Salut' }), node('i', 'image', { image: 'cmvmedia0001abc', alt: 'poză' })] }
  const r = await S.updatePage(f, id, { layout: good }); assert.equal(r.changed, true)
  assert.equal((await S.getPage(f, id)).layout.blocks.length, 2)
  await assert.rejects(S.updatePage(f, id, { layout: { version: 2, blocks: [node('i', 'image', { image: 'cmvmedia0009zzz' })] } }), /Pagină invalidă/)       // another firm's media
  await assert.rejects(S.updatePage(f, id, { layout: { version: 2, blocks: [node('x', 'script')] } }), /Pagină invalidă/)
  assert.equal((await S.getPage(f, id)).layout.blocks.length, 2)                                                                                              // nothing changed
  assert.equal((await S.updatePage(f, id, { layout: good })).changed, false); assert.equal((await S.listVersions(f, id)).length, 1)                          // same layout, no new version
  for (let i = 0; i < 22; i++) await S.updatePage(f, id, { layout: { version: 2, blocks: [node('h', 'heading', { text: `v${i}` })] } })
  assert.equal((await S.listVersions(f, id)).length, 20)
})
test('restore brings back an older version (as a new one); publishing needs at least one block; SEO fields and title are saved', { skip }, async () => {
  const f = await firm('f1'); const id = (await S.listPages(f, NOW)).items[1]!.id
  await assert.rejects(S.updatePage(f, id, { status: 'published' }), /cel puțin un bloc/)
  await S.updatePage(f, id, { layout: { version: 2, blocks: [node('a', 'text', { body: 'unu' })] } }); await S.updatePage(f, id, { layout: { version: 2, blocks: [node('a', 'text', { body: 'doi' })] } })
  const old = (await S.listVersions(f, id)).at(-1)!
  const r = await S.restoreVersion(f, id, old.id); assert.equal(r.changed, true)
  assert.equal(((await S.getPage(f, id)).layout.blocks[0]!.props as any).body, 'unu'); assert.equal((await S.listVersions(f, id))[0]!.source, 'restore')
  await assert.rejects(S.restoreVersion(f, id, 'nope'), /nu există/)
  const p = await S.updatePage(f, id, { status: 'published', title: 'Titlu nou', seoTitle: 'SEO', seoDescription: 'Descriere' }); assert.deepEqual([p.status, p.title, p.seoTitle, !!p.publishedAt], ['published', 'Titlu nou', 'SEO', true])
  assert.equal((await S.updatePage(f, id, { status: 'draft' })).status, 'draft')
})
test('a firm cannot reach another firm\'s pages; deleting removes the page; every action is logged', { skip }, async () => {
  const mine = await firm('f1'); const other = await firm('f2', { plan: 'abonament', planUntil: new Date(NOW.getTime() + 86_400_000 * 30) })
  const id = (await S.listPages(mine, NOW)).items[0]!.id
  await assert.rejects(S.getPage(other, id), /nu există/); await assert.rejects(S.updatePage(other, id, { title: 'Hack' }), /nu există/); await assert.rejects(S.deletePage(other, id), /nu există/); await assert.rejects(S.listVersions(other, id), /nu există/)
  assert.deepEqual(await S.deletePage(mine, id), { ok: true }); assert.equal((await S.listPages(mine, NOW)).items.some((p) => p.id === id), false)
  const acts = await db.activity.findMany({ where: { entityId: 'f1', action: { startsWith: 'partner_page_' } } }); assert.ok(acts.length >= 5)
})
