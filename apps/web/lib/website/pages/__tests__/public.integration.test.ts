/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../service'), P: typeof import('../public'), Q: typeof import('../../storefront/queries')
const ctx = { businessLineId: 'bl', channelId: 'ch' }
const NOW = new Date('2026-11-02T10:00:00Z')
const node = (id: string, type: string, props: object = {}) => ({ id, type, props })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../service'); P = await import('../public'); Q = await import('../../storefront/queries')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteLayoutVersion","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  for (const id of ['bl', 'other']) await db.businessLine.create({ data: { id, slug: id, name: id, icon: 'x', color: '#000', config: {} } })
  await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  const future = new Date(NOW.getTime() + 90 * 86_400_000)
  await db.websiteEntry.create({ data: { id: 'f1', businessLineId: 'bl', collectionId: 'c', slug: 'alfa', title: 'ALFA', status: 'published', plan: 'abonament', planUntil: future, data: {} } })
  await db.websiteEntry.create({ data: { id: 'f2', businessLineId: 'bl', collectionId: 'c', slug: 'beta', title: 'BETA', status: 'preview', plan: 'abonament', planUntil: future, data: {} } })
  await db.websiteMedia.create({ data: { id: 'cmvmedia0001abc', entryId: 'f1', kind: 'image', storageKey: 'k1', url: 'https://cdn/1.webp', alt: 'prima', width: 800, height: 600 } })
  await db.websiteMedia.create({ data: { id: 'cmvmedia0009zzz', entryId: 'f2', kind: 'image', storageKey: 'k2', url: 'https://cdn/2.webp' } })
})
after(async () => { if (db) await db.$disconnect() })
const firm = (id: string) => db.websiteEntry.findUnique({ where: { id } })

test('a published page of a published firm is served with its layout and only the images it uses', { skip }, async () => {
  const f = await firm('f1'); const pg = await S.createPage(f, { title: 'Despre noi' }, NOW)
  await S.updatePage(f, pg.id, { layout: { version: 2, blocks: [node('h', 'heading', { text: 'Salut' }), node('i', 'image', { image: 'cmvmedia0001abc' })] }, status: 'published', seoTitle: 'SEO', seoDescription: 'Desc' })
  const r = await P.getPublicPage(ctx, 'alfa', 'despre-noi'); assert.ok(r)
  assert.deepEqual([r!.firm, r!.page.slug, r!.page.title, r!.page.seoTitle, r!.layout.blocks.length], [{ slug: 'alfa', title: 'ALFA' }, 'despre-noi', 'Despre noi', 'SEO', 2])
  assert.deepEqual(Object.keys(r!.media), ['cmvmedia0001abc']); assert.deepEqual(r!.media.cmvmedia0001abc, { url: 'https://cdn/1.webp', alt: 'prima', width: 800, height: 600 })
  assert.ok(!JSON.stringify(r).includes('storageKey') && !JSON.stringify(r).includes('leadId') && !JSON.stringify(r).includes('plan'))
})
test('drafts, unknown pages, other lines and unpublished firms are all a 404; bad addresses are refused', { skip }, async () => {
  const f = await firm('f1'); const d = await S.createPage(f, { title: 'Ciornă' }, NOW)
  await S.updatePage(f, d.id, { layout: { version: 2, blocks: [node('h', 'heading', { text: 'x' })] } })
  assert.equal(await P.getPublicPage(ctx, 'alfa', 'ciorna'), null); assert.equal(await P.getPublicPage(ctx, 'alfa', 'nu-exista'), null)
  assert.equal(await P.getPublicPage({ businessLineId: 'other', channelId: 'x' }, 'alfa', 'despre-noi'), null)
  const g = await firm('f2'); const p2 = await S.createPage(g, { title: 'Pagina beta' }, NOW)
  await S.updatePage(g, p2.id, { layout: { version: 2, blocks: [node('h', 'heading', { text: 'x' })] }, status: 'published' })
  assert.equal(await P.getPublicPage(ctx, 'beta', 'pagina-beta'), null)                    // its firm is only a private preview
  await db.websiteEntry.update({ where: { id: 'f1' }, data: { status: 'suspended' } }); assert.equal(await P.getPublicPage(ctx, 'alfa', 'despre-noi'), null); await db.websiteEntry.update({ where: { id: 'f1' }, data: { status: 'published' } })
  for (const bad of [['../x', 'a'], ['alfa', 'A B'], ['alfa', ''], ['', 'a']] as const) await assert.rejects(P.getPublicPage(ctx, bad[0], bad[1]), /invalid/i)
})
test('an image of another firm in a stored layout is never served, and a broken stored layout renders as an empty page', { skip }, async () => {
  const f = await firm('f1'); const id = (await S.listPages(f, NOW)).items.find((p: any) => p.slug === 'despre-noi')!.id
  await db.websiteEntry.update({ where: { id }, data: { layout: { version: 2, blocks: [node('i', 'image', { image: 'cmvmedia0009zzz' })] } } })       // tampered in the database
  assert.deepEqual((await P.getPublicPage(ctx, 'alfa', 'despre-noi'))!.media, {})
  await db.websiteEntry.update({ where: { id }, data: { layout: { version: 7, junk: true } } })
  assert.deepEqual((await P.getPublicPage(ctx, 'alfa', 'despre-noi'))!.layout, { version: 2, blocks: [] })
})
test('the firm menu and the sitemap list only published pages of published firms', { skip }, async () => {
  const f = await firm('f1'); const id = (await S.listPages(f, NOW)).items.find((p: any) => p.slug === 'despre-noi')!.id
  await db.websiteEntry.update({ where: { id }, data: { layout: { version: 2, blocks: [node('h', 'heading', { text: 'x' })] } } })
  assert.deepEqual((await P.listPublicPages(ctx, 'alfa')).items, [{ title: 'Despre noi', slug: 'despre-noi', menu: 'pagini' }]); assert.deepEqual((await P.listPublicPages(ctx, 'beta')).items, [])
  await db.websiteCollection.updateMany({ where: { businessLineId: 'bl', key: 'pagini' }, data: { isActive: true } })
  const sm = (await Q.sitemap(ctx)).items.filter((i: any) => i.collection === 'pagini')
  assert.deepEqual(sm.map((i: any) => [i.firm, i.slug]), [['alfa', 'despre-noi']])
  assert.ok(!sm.some((i: any) => i.slug.includes('-') && /[0-9a-f]{6}$/.test(i.slug)))        // never the internal slug with its random suffix
})
test('the private preview of a firm shows its pages, drafts included, hidden ones left out; nothing of other firms; invalid and expired links get nothing', { skip }, async () => {
  const PS = await import('../../preview/service')
  const g = await firm('f2')
  const d = await S.createPage(g, { title: 'Gaze la bloc' }, NOW); await S.updatePage(g, d.id, { layout: { version: 2, blocks: [node('h', 'heading', { text: 'Gaze' }), node('i', 'image', { image: 'cmvmedia0009zzz' })] }, menu: 'servicii' })
  const h = await S.createPage(g, { title: 'Ascunsă' }, NOW); await S.updatePage(g, h.id, { menu: 'ascuns' })
  const { token } = await PS.issuePreview('bl', 'f2', { now: new Date() })
  const l = await P.listPreviewPages(ctx, token); assert.ok(l.ok)
  assert.deepEqual((l as any).items.map((i: any) => [i.slug, i.menu, i.published]).sort(), [['gaze-la-bloc', 'servicii', false], ['pagina-beta', 'pagini', true]])
  const p = await P.getPreviewPage(ctx, token, 'gaze-la-bloc'); assert.ok(p.ok); assert.deepEqual((p as any).page.firm, { slug: 'beta', title: 'BETA' }); assert.deepEqual(Object.keys((p as any).page.media), ['cmvmedia0009zzz'])
  assert.equal((await P.getPreviewPage(ctx, token, 'despre-noi')).ok, false)                       // a page of another firm
  assert.equal((await P.listPreviewPages(ctx, 'abcdefghjk')).ok, false)
  const gone = await P.listPreviewPages({ businessLineId: 'other', channelId: 'x' }, token); assert.equal(gone.ok, false)
  const old = await PS.issuePreview('bl', 'f2', { now: new Date(Date.now() - 30 * 86_400_000), days: 14 }); assert.deepEqual(await P.listPreviewPages(ctx, old.token), { ok: false, state: 'expired' })
  await assert.rejects(P.getPreviewPage(ctx, token, '../x'), /invalid/i)
})
