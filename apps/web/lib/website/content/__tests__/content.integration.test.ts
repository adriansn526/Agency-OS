/** DB-backed checks of the content page editor (services and prices). Needs CONTENT_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CONTENT_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../service'), P: typeof import('../../preview/service'), Z: typeof import('../../storefront/serialize')
let entryId = '', otherId = ''

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../service'); P = await import('../../preview/service'); Z = await import('../../storefront/serialize')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteLayoutVersion","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteChannel.create({ data: { businessLineId: 'bl', siteUrl: 'https://site.test' } })
  const pr = await db.websiteCollection.create({ data: { id: 'cp', businessLineId: 'bl', key: 'preturi', name: 'Pagină de prețuri', namePlural: 'Prețuri', kind: 'article', fields: [] } })
  const co = await db.websiteCollection.create({ data: { id: 'cc', businessLineId: 'bl', key: 'companii', name: 'Companie', namePlural: 'Companii', kind: 'listing', fields: [] } })
  entryId = (await db.websiteEntry.create({ data: { id: 'e1', businessLineId: 'bl', collectionId: pr.id, slug: 'manopera-rigips', title: 'Preț rigips', status: 'draft', data: { preturi: ['Tavan | 60–90 lei/mp'] } } })).id
  otherId = (await db.websiteEntry.create({ data: { id: 'e2', businessLineId: 'bl', collectionId: co.id, slug: 'firma', title: 'Firma', status: 'published' } })).id
  await db.websiteMedia.create({ data: { id: 'media_aaaaaa1', entryId, kind: 'image', url: 'https://x/a.webp', storageKey: 'a.webp', sortOrder: 0 } })
  await db.websiteMedia.create({ data: { id: 'media_bbbbbb2', entryId: otherId, kind: 'image', url: 'https://x/b.webp', storageKey: 'b.webp', sortOrder: 0 } })
})
after(async () => { if (db) await db.$disconnect() })

const layout = (...blocks: unknown[]) => ({ layout: { version: 2, blocks } })
const hero = (id: string, image = 'media_aaaaaa1') => ({ id, type: 'hero', props: { title: 'Preț rigips', image } })

test('only service and price entries have a block layout', { skip }, async () => {
  await assert.rejects(() => S.getContentPage('bl', otherId), /doar pentru serviciile/)
})
test('empty by default; save validates and stores; images must be the entry\'s own', { skip }, async () => {
  assert.equal((await S.getContentPage('bl', entryId)).layout.blocks.length, 0)
  await assert.rejects(() => S.saveContentLayout('bl', entryId, layout(hero('h1', 'media_bbbbbb2'))), /Pagină invalidă/)
  const r = await S.saveContentLayout('bl', entryId, layout(hero('h1'), { id: 'p1', type: 'price_table', props: {} }))
  assert.equal(r.changed, true); assert.equal(r.blocks, 2)
  assert.equal((await S.getContentPage('bl', entryId)).layout.blocks.length, 2)
  assert.equal((await S.saveContentLayout('bl', entryId, layout(hero('h1'), { id: 'p1', type: 'price_table', props: {} }))).changed, false)
})
test('history keeps versions and a restore is saved as a new one', { skip }, async () => {
  await S.saveContentLayout('bl', entryId, layout(hero('h1')))
  const v = await S.listContentVersions('bl', entryId)
  assert.equal(v.length, 2)
  const old = v.find((x: any) => x.blocks === 2)!
  const r = await S.restoreContentVersion('bl', entryId, old.id)
  assert.equal(r.blocks, 2)
  assert.equal((await S.listContentVersions('bl', entryId))[0]!.source, 'restore')
  await assert.rejects(() => S.restoreContentVersion('bl', entryId, 'nope'), /nu există/)
})
test('versions are capped', { skip }, async () => {
  for (let i = 0; i < S.MAX_VERSIONS + 3; i++) await S.saveContentLayout('bl', entryId, layout({ id: `t${i}`, type: 'text', props: { body: `v${i}` } }))
  assert.equal((await S.listContentVersions('bl', entryId)).length, S.MAX_VERSIONS)
})
test('preview: a draft becomes a private preview; the token shows the page, a new token replaces it; a published page gives its public address', { skip }, async () => {
  await S.saveContentLayout('bl', entryId, layout(hero('h1')))
  const a = await S.contentPreviewLink('bl', entryId)
  assert.equal(a.kind, 'private'); assert.match(a.link, /^https:\/\/site\.test\/previzualizare-pagina\/[1-9A-HJ-NP-Za-km-z]{10}$/)
  assert.equal((await db.websiteEntry.findUnique({ where: { id: entryId } })).status, 'preview')
  const t1 = a.link.split('/').pop()!
  const r1 = await P.lookupPreview('bl', t1)
  assert.equal(r1.state, 'ok')
  if (r1.state === 'ok') { const d: any = Z.serializeDetail(r1.entry, r1.entry.collection.key, r1.entry.media, []); assert.equal(d.pageLayout.blocks.length, 1); assert.equal(d.media[0].id, 'media_aaaaaa1') }
  const b = await S.contentPreviewLink('bl', entryId)
  assert.equal((await P.lookupPreview('bl', t1)).state, 'invalid')
  assert.equal((await P.lookupPreview('bl', b.link.split('/').pop()!)).state, 'ok')
  await db.websiteEntry.update({ where: { id: entryId }, data: { status: 'published' } })
  const c = await S.contentPreviewLink('bl', entryId)
  assert.deepEqual(c, { kind: 'public', link: 'https://site.test/preturi/manopera-rigips', expiresAt: null })
})
test('public detail exposes pageLayout for price pages only', { skip }, async () => {
  const row = await db.websiteEntry.findUnique({ where: { id: entryId }, include: { media: true } })
  assert.equal((Z.serializeDetail(row, 'preturi', row.media, []) as any).pageLayout.blocks.length, 1)
  assert.equal('pageLayout' in Z.serializeDetail(row, 'companii', row.media, []), false)
})
