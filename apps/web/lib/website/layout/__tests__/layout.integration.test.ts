/** DB-backed checks of home layouts: save, history, restore, reset, and what the public API exposes. Needs LAYOUT_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.LAYOUT_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, L: typeof import('../service'), B: typeof import('../blocks'), Q: typeof import('../../storefront/queries'), Pv: typeof import('../../preview/service')
const entry = () => db.websiteEntry.findUnique({ where: { id: 'a' } })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); L = await import('../service'); B = await import('../blocks'); Q = await import('../../storefront/queries'); Pv = await import('../../preview/service')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteLayoutVersion","WebsiteReview","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  await db.websiteEntry.create({ data: { id: 'a', businessLineId: 'bl', collectionId: col.id, slug: 'a', title: 'Firma A', status: 'published', partnerAccess: true, publishedAt: new Date() } })
})
after(async () => { if (db) await db.$disconnect() })

test('a firm that never customised gets the default layout, not stored', { skip }, async () => {
  const g = L.getLayout(await entry())
  assert.equal(g.customized, false); assert.equal(B.canonical(g.layout), B.canonical(B.defaultLayout())); assert.ok(g.catalog.length >= 10)
  const r = await L.saveLayout(await entry(), B.defaultLayout())
  assert.equal(r.changed, false); assert.equal((await entry()).layout, null) // saving the default is not a change
})

test('save: validated, stored, versioned, logged; no-op saves create nothing', { skip }, async () => {
  const blocks = [{ type: 'hero', props: { headline: 'Instalatori în Mureș' } }, { type: 'faq', enabled: true, props: { items: [{ q: 'Cât costă?', a: 'Depinde.' }] } }, { type: 'services', enabled: false, props: {} }, { type: 'cta', props: { text: 'Scrie-ne' } }]
  const r = await L.saveLayout(await entry(), { blocks })
  assert.equal(r.changed, true); assert.deepEqual((r.layout as any).blocks.map((b: any) => b.type), ['hero', 'faq', 'services', 'cta'])
  const row = await entry()
  assert.equal(row.layout.blocks[0].props.headline, 'Instalatori în Mureș'); assert.equal(row.layout.blocks[2].enabled, false)
  assert.equal(await db.websiteLayoutVersion.count({ where: { entryId: 'a' } }), 1)
  assert.ok(await db.activity.findFirst({ where: { action: 'partner_layout_partner', entityId: 'a' } }))
  assert.equal((await L.saveLayout(await entry(), { blocks })).changed, false)
  assert.equal(await db.websiteLayoutVersion.count({ where: { entryId: 'a' } }), 1)
  await assert.rejects(L.saveLayout(await entry(), { blocks: [{ type: 'script', props: {} }] }), /Aranjament invalid/)
  await assert.rejects(L.saveLayout(await entry(), { blocks: [{ type: 'steps', props: { html: '<b>' } }] }), /Aranjament invalid/)
  assert.equal(B.canonical(B.effectiveLayout((await entry()).layout)), B.canonical(r.layout as any)) // failed saves changed nothing
})

test('history: newest first, restore creates a new version, reset goes back to the default, only 20 are kept', { skip }, async () => {
  const first = (await L.listVersions('a'))[0]!
  await L.saveLayout(await entry(), { blocks: [{ type: 'hero', props: { headline: 'Altceva' } }] })
  const list = await L.listVersions('a')
  assert.equal(list.length, 2); assert.equal(list[0]!.source, 'partner'); assert.deepEqual(list[0]!.summary.types, ['hero'])
  const back = await L.restoreVersion(await entry(), first.id)
  assert.equal(back.changed, true); assert.equal(((await entry()).layout.blocks[0].props.headline), 'Instalatori în Mureș')
  assert.equal((await L.listVersions('a'))[0]!.source, 'restore')
  await assert.rejects(L.restoreVersion(await entry(), 'nope'), /nu există/)
  const reset = await L.resetLayout(await entry())
  assert.equal(reset.changed, true); assert.equal((await entry()).layout, null); assert.equal((await L.listVersions('a'))[0]!.source, 'reset')
  assert.equal((await L.resetLayout(await entry())).changed, false)
  for (let i = 0; i < 25; i++) await L.saveLayout(await entry(), { blocks: [{ type: 'hero', props: { headline: `Titlu ${i}` } }] })
  assert.equal(await db.websiteLayoutVersion.count({ where: { entryId: 'a' } }), L.MAX_VERSIONS)
})

test('another firm cannot restore this firm\'s version', { skip }, async () => {
  const col = await db.websiteCollection.findFirst({ where: { key: 'companii' } })
  await db.websiteEntry.create({ data: { id: 'b', businessLineId: 'bl', collectionId: col.id, slug: 'b', title: 'Firma B', status: 'published', partnerAccess: true } })
  const v = (await L.listVersions('a'))[0]!
  await assert.rejects(L.restoreVersion(await db.websiteEntry.findUnique({ where: { id: 'b' } }), v.id), /nu există/)
})

test('public API and preview: the effective layout is exposed; damaged storage falls back to the default', { skip }, async () => {
  await db.websiteChannel.upsert({ where: { businessLineId: 'bl' }, create: { businessLineId: 'bl' }, update: {} })
  const ctx = { businessLineId: 'bl', channelId: 'x' }
  await L.saveLayout(await entry(), { blocks: [{ type: 'hero', props: { headline: 'Public' } }, { type: 'areas', props: { areas: ['Ungheni'] } }] })
  const d: any = await Q.getEntry(ctx, 'companii', 'a')
  assert.equal(d.layout.blocks[0].props.headline, 'Public'); assert.deepEqual(d.layout.blocks[1], { type: 'areas', enabled: true, props: { areas: ['Ungheni'] } })
  const list: any = await Q.listEntries(ctx, new URLSearchParams('collection=companii'))
  assert.equal('layout' in list.items[0], false) // lists stay light
  await db.websiteEntry.update({ where: { id: 'a' }, data: { layout: { blocks: [{ type: 'boom' }] } } })
  assert.equal(B.canonical(((await Q.getEntry(ctx, 'companii', 'a')) as any).layout), B.canonical(B.defaultLayout()))
  await db.websiteEntry.update({ where: { id: 'a' }, data: { status: 'preview' } })
  const { token } = await Pv.issuePreview('bl', 'a')
  const pv = await Pv.lookupPreview('bl', token); assert.equal(pv.state, 'ok')
  assert.equal(B.canonical((Pv.serializePreview((pv as any).entry) as any).layout), B.canonical(B.defaultLayout()))
})

test('saving a layout with an image + text block: only the firm\'s own gallery images are accepted', { skip }, async () => {
  const m = await db.websiteMedia.create({ data: { entryId: 'a', kind: 'image', storageKey: 'k', url: 'https://cdn.test/a.webp' } })
  await db.websiteEntry.create({ data: { id: 'media-owner', businessLineId: 'bl', collectionId: 'c', slug: 'media-owner', title: 'Altă firmă', status: 'published', data: {} } })
  const foreign = await db.websiteMedia.create({ data: { entryId: 'media-owner', kind: 'image', storageKey: 'k2', url: 'https://cdn.test/b.webp' } })
  const ok = await L.saveLayout(await entry(), { blocks: [{ type: 'hero' }, { type: 'media_text', props: { image: m.id, title: 'Despre noi', side: 'right' } }] })
  assert.equal(ok.changed, true); assert.equal((ok.layout as any).blocks[1].props.image, m.id)
  await assert.rejects(L.saveLayout(await entry(), { blocks: [{ type: 'hero' }, { type: 'media_text', props: { image: foreign.id } }] }), /Aranjament invalid/)
})
