/** DB-backed checks of the media service with an in-memory object store. Needs MEDIA_TEST_DATABASE_URL = a SCRATCH database with the full schema (it truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import type { ObjectStore } from '../storage'

const URL_ = process.env.MEDIA_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../service')

const objects = new Map<string, number>()
const store: ObjectStore = {
  async put(key, body) { objects.set(key, body.length) },
  async remove(key) { objects.delete(key) },
  publicUrl: (key) => `https://cdn.test/${key}`,
  keyFromUrl: (u) => (u && u.startsWith('https://cdn.test/website/') ? u.slice('https://cdn.test/'.length) : null),
}
const img = (w = 300, h = 200) => sharp({ create: { width: w, height: h, channels: 3, background: '#445566' } }).jpeg().toBuffer()

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../service')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteReview","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Lead","BusinessLine" CASCADE`)
  for (const id of ['bl', 'other']) await db.businessLine.create({ data: { id, slug: id, name: id, icon: 'x', color: '#000', config: {} } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  await db.websiteEntry.create({ data: { id: 'e1', businessLineId: 'bl', collectionId: col.id, slug: 'a', title: 'Firma A', logoUrl: 'https://montrepcom.ro/logo.png' } })
})
after(async () => { if (db) await db.$disconnect() })

test('logo: uploaded, replaces the previous one; external logos are never deleted', { skip }, async () => {
  const a = await S.uploadEntryImage('bl', 'e1', 'logo', await img(), { store }) as { url: string }
  assert.match(a.url, /^https:\/\/cdn\.test\/website\/bl\/e1\/logo-[0-9a-f]{16}\.webp$/)
  assert.equal(objects.size, 1) // the external hotlinked logo was replaced without touching the other site
  const b = await S.uploadEntryImage('bl', 'e1', 'logo', await img(100, 50), { store }) as { url: string }
  assert.equal(objects.size, 1); assert.ok(!objects.has(store.keyFromUrl(a.url)!)); assert.ok(objects.has(store.keyFromUrl(b.url)!))
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'e1' } })).logoUrl, b.url)
})

test('cover can be cleared and its object removed', { skip }, async () => {
  const c = await S.uploadEntryImage('bl', 'e1', 'cover', await img(), { store }) as { url: string }
  assert.equal(objects.size, 2)
  await S.clearEntryImage('bl', 'e1', 'cover', store)
  assert.equal(objects.size, 1); assert.equal((await db.websiteEntry.findUnique({ where: { id: 'e1' } })).coverUrl, null); assert.ok(!objects.has(store.keyFromUrl(c.url)!))
})

test('gallery: ordered, alt text, delete removes the object, limit of 30', { skip }, async () => {
  const m1 = await S.uploadEntryImage('bl', 'e1', 'image', await img(), { store, alt: '  Baie renovată  ' }) as any
  const m2 = await S.uploadEntryImage('bl', 'e1', 'image', await img(), { store }) as any
  assert.deepEqual([m1.sortOrder, m2.sortOrder], [0, 1]); assert.equal(m1.alt, 'Baie renovată'); assert.equal(m1.mimeType, 'image/webp'); assert.ok(m1.width > 0)
  await S.updateGalleryAlt('bl', 'e1', m2.id, { alt: 'Centrală termică' })
  assert.equal((await db.websiteMedia.findUnique({ where: { id: m2.id } })).alt, 'Centrală termică')
  const before = objects.size
  await S.deleteGalleryImage('bl', 'e1', m1.id, store)
  assert.equal(objects.size, before - 1); assert.equal(await db.websiteMedia.count({ where: { id: m1.id } }), 0)
  await db.websiteMedia.createMany({ data: Array.from({ length: 29 }, (_, i) => ({ entryId: 'e1', kind: 'image', storageKey: `k${i}`, url: `https://x/${i}`, sortOrder: 10 + i })) })
  await assert.rejects(S.uploadEntryImage('bl', 'e1', 'image', await img(), { store }), /Maxim 30/)
})

test('scoping and validation: other line, unknown entry, bad file', { skip }, async () => {
  await assert.rejects(S.uploadEntryImage('other', 'e1', 'logo', await img(), { store }), /nu există/)
  await assert.rejects(S.uploadEntryImage('bl', 'nope', 'logo', await img(), { store }), /nu există/)
  await assert.rejects(S.uploadEntryImage('all', 'e1', 'logo', await img(), { store }), /Alege o linie/)
  const n = objects.size
  await assert.rejects(S.uploadEntryImage('bl', 'e1', 'logo', Buffer.from('<svg/>'), { store }), /Format neacceptat/)
  assert.equal(objects.size, n) // nothing was stored
  await assert.rejects(S.deleteGalleryImage('other', 'e1', 'x', store), /nu există/)
})

test('deleting an entry removes its objects', { skip }, async () => {
  const col = await db.websiteCollection.findFirst({ where: { key: 'companii' } })
  await db.websiteEntry.create({ data: { id: 'e2', businessLineId: 'bl', collectionId: col.id, slug: 'b', title: 'Firma B' } })
  await S.uploadEntryImage('bl', 'e2', 'logo', await img(), { store })
  await S.uploadEntryImage('bl', 'e2', 'image', await img(), { store })
  const urls = await S.entryObjectUrls('e2')
  assert.equal(urls.length, 2)
  await S.removeObjects(urls, store)
  assert.ok(urls.every((u) => !objects.has(store.keyFromUrl(u)!)))
})
