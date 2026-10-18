/**
 * Database-backed checks of the storefront API (scoping, publication, privacy, filters).
 * Skipped unless WEBSITE_TEST_DATABASE_URL points at a scratch database that has packages/db/prisma/sql/website_module.sql applied
 * (created from a schema-only copy: pg_dump -s). NEVER point it at production: it writes and deletes rows.
 *
 *   WEBSITE_TEST_DATABASE_URL=postgresql://... npx tsx --test lib/website/storefront/__tests__/storefront.integration.test.ts
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.WEBSITE_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_

const get = async (route: { GET: (req: Request, ctx: { params: Promise<any> }) => Promise<Response> }, path: string, key: string | null, params: Record<string, string> = {}) =>
  route.GET(new Request(`http://x${path}`, { headers: key ? { authorization: `Bearer ${key}` } : {} }), { params: Promise.resolve(params) })

let routes: Record<string, any>
let db: any
let keyA = '', keyB = '', keyOff = ''

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db'))
  const { generateWebsiteKey } = await import('../keys')
  routes = {
    collections: await import('../../../../app/api/storefront/website/collections/route'),
    entries: await import('../../../../app/api/storefront/website/entries/route'),
    detail: await import('../../../../app/api/storefront/website/entries/[collection]/[slug]/route'),
    sitemap: await import('../../../../app/api/storefront/website/sitemap/route'),
  }
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteReview","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Lead","BusinessLine" CASCADE`)
  for (const id of ['A', 'B', 'OFF']) await db.businessLine.create({ data: { id, slug: id.toLowerCase(), name: id, icon: 'x', color: '#000', config: { entityTypes: [] } } })
  const a = generateWebsiteKey('a'), b = generateWebsiteKey('b'), off = generateWebsiteKey('off')
  keyA = a.key; keyB = b.key; keyOff = off.key
  await db.websiteChannel.createMany({ data: [
    { businessLineId: 'A', apiKeys: [a.stored] }, { businessLineId: 'B', apiKeys: [b.stored] }, { businessLineId: 'OFF', isEnabled: false, apiKeys: [off.stored] },
  ] })
  const fields = [{ key: 'tip', label: 'Tip', type: 'select', filterable: true }, { key: 'intern', label: 'Intern', type: 'text' }, { key: 'servicii', label: 'Servicii', type: 'list', filterable: true }]
  await db.websiteCollection.createMany({ data: [
    { id: 'cA', businessLineId: 'A', key: 'companii', name: 'Companie', namePlural: 'Companii', fields },
    { id: 'cA2', businessLineId: 'A', key: 'ascunsa', name: 'x', namePlural: 'x', isActive: false },
    { id: 'cB', businessLineId: 'B', key: 'companii', name: 'Companie', namePlural: 'Companii' },
    { id: 'cP', businessLineId: 'A', key: 'proiecte', name: 'Proiect', namePlural: 'Proiecte', kind: 'project', fields: [{ key: 'categorie', label: 'Categorie', type: 'text', filterable: true }] },
  ] })
  const base = { businessLineId: 'A', collectionId: 'cA' }
  await db.websiteEntry.createMany({ data: [
    { ...base, id: 'e1', slug: 'delta', title: 'Delta Construct', city: 'Cluj-Napoca', county: 'Cluj', status: 'published', verified: true, featured: true, email: 'secret@delta.ro', leadId: null, tenantId: 'tn1', phone: '0740', data: { tip: 'general', intern: 'x', servicii: ['sanitare', 'electrice'] }, ratingAvg: 4.5, ratingCount: 2, publishedAt: new Date() },
    { ...base, id: 'e2', slug: 'alfa', title: 'Alfa Instalatii', city: 'Iasi', county: 'Iasi', status: 'published', data: { tip: 'instalatii', servicii: ['electrice'] }, publishedAt: new Date() },
    { ...base, id: 'e3', slug: 'draft-co', title: 'Draft SRL', status: 'draft' },
    { ...base, id: 'e4', slug: 'susp-co', title: 'Suspended SRL', status: 'suspended' },
    { businessLineId: 'B', collectionId: 'cB', id: 'e5', slug: 'beta', title: 'Beta (alta linie)', status: 'published' },
    { businessLineId: 'A', collectionId: 'cP', id: 'p1', slug: 'baie-1', title: 'Renovare baie', status: 'published', parentId: 'e1', city: 'Cluj-Napoca', data: { categorie: 'instalatii-sanitare' }, publishedAt: new Date() },
    { businessLineId: 'A', collectionId: 'cP', id: 'p2', slug: 'baie-2', title: 'Proiect firmă nepublicată', status: 'published', parentId: 'e3', publishedAt: new Date() },
    { businessLineId: 'A', collectionId: 'cA2', id: 'e6', slug: 'in-ascunsa', title: 'In colectie inactiva', status: 'published' },
  ] })
  await db.websiteReview.createMany({ data: [
    { entryId: 'e1', businessLineId: 'A', authorName: 'Ion', authorEmail: 'ion@x.ro', rating: 5, body: 'bun', status: 'approved' },
    { entryId: 'e1', businessLineId: 'A', authorName: 'Spam', rating: 1, body: 'spam', status: 'pending' },
  ] })
  await db.websiteMedia.create({ data: { entryId: 'e1', storageKey: 'k', url: 'https://cdn/x.jpg', sortOrder: 0 } })
  const { invalidateWebsiteKeyCache } = await import('../auth')
  invalidateWebsiteKeyCache()
})

after(async () => { if (db) await db.$disconnect() })

test('missing, malformed, unknown and disabled-channel keys get 401', { skip }, async () => {
  assert.equal((await get(routes.collections!, '/c', null)).status, 401)
  assert.equal((await get(routes.collections!, '/c', 'ws_nope_nope_nope_nope_nope_nope')).status, 401)
  assert.equal((await get(routes.collections!, '/c', keyOff)).status, 401)
})

test('collections: only the key line, only active ones, with published counts', { skip }, async () => {
  const body = await (await get(routes.collections!, '/c', keyA)).json()
  assert.deepEqual(body.items.map((c: any) => [c.key, c.total]).sort(), [['companii', 2], ['proiecte', 1]]) // the project of an unpublished firm is not counted
})

test('list: published entries of the line only (no drafts, no other lines, no inactive collections)', { skip }, async () => {
  const res = await get(routes.entries!, '/e?collection=companii', keyA)
  const body = await res.json()
  assert.equal(res.status, 200)
  assert.deepEqual(body.items.map((e: any) => e.slug), ['delta', 'alfa']) // featured/verified first
  assert.equal(body.total, 2)
  assert.equal((await get(routes.entries!, '/e?collection=ascunsa', keyA)).status, 404)
  const b = await (await get(routes.entries!, '/e?collection=companii', keyB)).json()
  assert.deepEqual(b.items.map((e: any) => e.slug), ['beta'])
})

test('filters: county (case-insensitive), search, verified, filterable field; unknown filter is 400', { skip }, async () => {
  const slugs = async (q: string) => (await (await get(routes.entries!, `/e?collection=companii&${q}`, keyA)).json()).items.map((e: any) => e.slug)
  assert.deepEqual(await slugs('county=iasi'), ['alfa'])
  assert.deepEqual(await slugs('q=construct'), ['delta'])
  assert.deepEqual(await slugs('verified=1'), ['delta'])
  assert.deepEqual(await slugs('f.tip=instalatii'), ['alfa'])
  assert.equal((await get(routes.entries!, '/e?collection=companii&f.intern=x', keyA)).status, 400)
  assert.equal((await get(routes.entries!, '/e?collection=companii&limit=999', keyA)).status, 400)
})

test('list fields filter by membership; facet=county counts ignore the county filter', { skip }, async () => {
  const slugs = async (q: string) => (await (await get(routes.entries!, `/e?collection=companii&${q}`, keyA)).json()).items.map((e: any) => e.slug).sort()
  assert.deepEqual(await slugs('f.servicii=sanitare'), ['delta'])
  assert.deepEqual(await slugs('f.servicii=electrice'), ['alfa', 'delta'])
  assert.deepEqual(await slugs('f.servicii=electrice&county=iasi'), ['alfa'])
  assert.deepEqual(await slugs('f.servicii=nimic'), [])
  const body = await (await get(routes.entries!, '/e?collection=companii&f.servicii=electrice&county=iasi&facet=county', keyA)).json()
  assert.deepEqual(body.facets.county, [{ value: 'Cluj', count: 1 }, { value: 'Iasi', count: 1 }])
  assert.equal((await (await get(routes.entries!, '/e?collection=companii', keyA)).json()).facets, undefined)
})

test('projects: filtered by parent slug, parent summary in list and detail, hidden while the firm is not published', { skip }, async () => {
  const list = await (await get(routes.entries!, '/e?collection=proiecte&parent=delta', keyA)).json()
  assert.deepEqual(list.items.map((e: any) => e.slug), ['baie-1'])
  assert.deepEqual(list.items[0].parent, { slug: 'delta', title: 'Delta Construct', city: 'Cluj-Napoca', county: 'Cluj', logoUrl: null, verified: true })
  assert.deepEqual((await (await get(routes.entries!, '/e?collection=proiecte&parent=draft-co', keyA)).json()).items, []) // parent is a draft
  assert.deepEqual((await (await get(routes.entries!, '/e?collection=proiecte', keyA)).json()).items.map((e: any) => e.slug), ['baie-1'])
  assert.equal((await get(routes.entries!, '/e?collection=proiecte&parent=BAD%20SLUG', keyA)).status, 400)
  const d = await (await get(routes.detail!, '/d', keyA, { collection: 'proiecte', slug: 'baie-1' })).json()
  assert.equal(d.parent.slug, 'delta'); assert.equal(d.title, 'Renovare baie')
  assert.equal((await get(routes.detail!, '/d', keyA, { collection: 'proiecte', slug: 'baie-2' })).status, 404)
  const firm = await (await get(routes.detail!, '/d', keyA, { collection: 'companii', slug: 'delta' })).json()
  assert.equal(firm.parent, null); assert.deepEqual(firm.services.map((x: any) => x.slug), [])
})

test('pagination reports totals', { skip }, async () => {
  const body = await (await get(routes.entries!, '/e?collection=companii&limit=1&page=2', keyA)).json()
  assert.deepEqual([body.total, body.pages, body.items.length, body.items[0].slug], [2, 2, 1, 'alfa'])
})

test('detail: contact, media and approved reviews only; never email, tenant or pending reviews', { skip }, async () => {
  const res = await get(routes.detail!, '/d', keyA, { collection: 'companii', slug: 'delta' })
  const text = await res.text()
  const body = JSON.parse(text)
  assert.equal(res.status, 200)
  assert.equal(body.phone, '0740')
  assert.equal(body.media.length, 1)
  assert.deepEqual(body.reviews.map((r: any) => r.authorName), ['Ion'])
  for (const secret of ['secret@delta.ro', 'tn1', 'ion@x.ro', 'spam']) assert.equal(text.includes(secret), false, `leaked ${secret}`)
})

test('detail: drafts, suspended, other lines and bad slugs are not reachable', { skip }, async () => {
  for (const slug of ['draft-co', 'susp-co', 'beta', 'in-ascunsa', 'nu-exista']) {
    assert.equal((await get(routes.detail!, '/d', keyA, { collection: 'companii', slug })).status, 404, slug)
  }
  assert.equal((await get(routes.detail!, '/d', keyA, { collection: 'companii', slug: '../x' })).status, 400)
})

test('sitemap lists published entries of active collections for the line', { skip }, async () => {
  const body = await (await get(routes.sitemap!, '/s', keyA)).json()
  assert.deepEqual(body.items.map((i: any) => i.slug).sort(), ['alfa', 'baie-1', 'delta'])
})
