/** DB-backed checks of portfolio projects and domain requests. Needs PROJECTS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import type { ObjectStore } from '../../media/storage'

const URL_ = process.env.PROJECTS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, PR: typeof import('../projects'), D: typeof import('../domain'), Q: typeof import('../../storefront/queries')
const objects = new Map<string, number>()
const store: ObjectStore = {
  async put(key, body) { objects.set(key, body.length) }, async remove(key) { objects.delete(key) },
  publicUrl: (key) => `https://cdn.test/${key}`, keyFromUrl: (u) => (u && u.startsWith('https://cdn.test/website/') ? u.slice('https://cdn.test/'.length) : null),
}
const img = () => sharp({ create: { width: 200, height: 120, channels: 3, background: '#556677' } }).jpeg().toBuffer()
const parent = (id: string) => db.websiteEntry.findUnique({ where: { id } })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); PR = await import('../projects'); D = await import('../domain'); Q = await import('../../storefront/queries')
  await db.$executeRawUnsafe(`TRUNCATE "WebsitePartnerSession","WebsitePartnerLogin","WebsiteReview","WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  const lead = await db.lead.create({ data: { businessLineId: 'bl', entityType: 'parteneri', status: 'onboarding', companyName: 'Firma A', contactPerson: 'N/A', email: 'N/A', customFields: { regiune: 'Transilvania' } } })
  const e = (o: object) => ({ businessLineId: 'bl', collectionId: col.id, partnerAccess: true, ...o })
  await db.websiteEntry.createMany({ data: [
    e({ id: 'a', slug: 'a', title: 'Firma A', status: 'preview', city: 'Ungheni', county: 'Mureș', leadId: lead.id }),
    e({ id: 'b', slug: 'b', title: 'Firma B', status: 'published' }),
  ] })
})
after(async () => { if (db) await db.$disconnect() })

test('create: validated, live at once, inherits the firm county, logged; bad input is 422', { skip }, async () => {
  const a = await parent('a')
  const p = await PR.createProject(a, { title: 'Renovare baie', summary: 'Baie de 6 mp', city: 'Târgu Mureș', categorie: 'instalatii-sanitare', an: 2024 })
  assert.equal(p.title, 'Renovare baie'); assert.equal(p.categorie, 'instalatii-sanitare'); assert.equal(p.an, 2024); assert.match(p.slug, /^renovare-baie-[0-9a-f]{6}$/)
  const row = await db.websiteEntry.findUnique({ where: { id: p.id } })
  assert.equal(row.status, 'published'); assert.equal(row.parentId, 'a'); assert.equal(row.county, 'Mureș'); assert.equal(row.city, 'Târgu Mureș')
  assert.ok(await db.activity.findFirst({ where: { action: 'partner_project_create', entityId: 'a' } }))
  for (const bad of [{ title: 'ab' }, { title: 'Ok titlu', categorie: 'inexistent' }, { title: 'Ok titlu', an: 1900 }, { title: 'Ok titlu', extra: 1 }, {}])
    await assert.rejects(PR.createProject(a, bad), /Date invalide/)
})

test('ownership: another firm cannot touch, change or add photos to a project', { skip }, async () => {
  const [a, b] = [await parent('a'), await parent('b')]
  const p = (await PR.listProjects(a))[0]!
  await assert.rejects(PR.updateProject(b, p.id, { title: 'Furat' }), /nu există/)
  await assert.rejects(PR.deleteProject(b, p.id, store), /nu există/)
  await assert.rejects(PR.addProjectImage(b, p.id, await img(), null, store), /nu există/)
  assert.equal((await PR.listProjects(b)).length, 0)
  const u = await PR.updateProject(a, p.id, { title: 'Renovare baie completă', summary: null })
  assert.equal(u.title, 'Renovare baie completă'); assert.equal(u.summary, null); assert.equal(u.categorie, 'instalatii-sanitare')
})

test('photos: stored in the public prefix, capped at 12, removable, alt text; deleting the project removes its objects', { skip }, async () => {
  const a = await parent('a')
  const p = await PR.createProject(a, { title: 'Centrală termică' })
  const m = await PR.addProjectImage(a, p.id, await img(), '  Montaj  ', store)
  assert.equal(m.alt, 'Montaj'); assert.ok(objects.size >= 1)
  await PR.setProjectImageAlt(a, p.id, m.id, { alt: 'Montaj final' })
  for (let i = 1; i < 12; i++) await PR.addProjectImage(a, p.id, await img(), null, store)
  await assert.rejects(PR.addProjectImage(a, p.id, await img(), null, store), /Maxim 12/)
  const before = objects.size
  await PR.removeProjectImage(a, p.id, m.id, store)
  assert.equal(objects.size, before - 1)
  await PR.deleteProject(a, p.id, store)
  assert.equal(await db.websiteMedia.count({ where: { entryId: p.id } }), 0)
  assert.ok([...objects.keys()].every((k) => !k.includes(`/${p.id}/`)))
})

test('public API: a project is visible only while its firm is published', { skip }, async () => {
  const a = await parent('a'), b = await parent('b')
  const pa = (await PR.listProjects(a))[0]!
  const pb = await PR.createProject(b, { title: 'Proiect firma B' })
  await db.websiteChannel.upsert({ where: { businessLineId: 'bl' }, create: { businessLineId: 'bl' }, update: {} })
  const ctx = { businessLineId: 'bl', channelId: 'x' }
  const list = async () => ((await Q.listEntries(ctx, new URLSearchParams('collection=proiecte&limit=50')))!.items as { slug: string }[]).map((i) => i.slug)
  assert.deepEqual(await list(), [pb.slug])                                    // firm A is only a preview: its project is hidden
  assert.equal(await Q.getEntry(ctx, 'proiecte', pa.slug), null)
  assert.ok(await Q.getEntry(ctx, 'proiecte', pb.slug))
  assert.ok(!(await Q.sitemap(ctx)).items.some((i: { slug: string }) => i.slug === pa.slug))
  await db.websiteEntry.update({ where: { id: 'a' }, data: { status: 'published' } })
  assert.ok((await list()).includes(pa.slug))                                   // published firm: project appears
  assert.ok((await Q.sitemap(ctx)).items.some((i: { slug: string }) => i.slug === pa.slug))
  await db.websiteEntry.update({ where: { id: 'b' }, data: { status: 'suspended' } })
  assert.deepEqual((await list()).includes(pb.slug), false)                    // suspended firm: project disappears again
  await db.websiteEntry.update({ where: { id: 'a' }, data: { status: 'preview' } })
})

test('domain requests: parsed, recorded for the team, flagged on the lead, limited to 3 a day', { skip }, async () => {
  for (const [raw, want] of [['https://www.Firma.ro/', 'firma.ro'], ['firma.ro', 'firma.ro'], ['sub.firma-x.com', 'sub.firma-x.com'], ['intraconstruct.ro', null], ['x.intraconstruct.ro', null], ['not a domain', null], ['a.b', null], ['', null]] as const)
    assert.equal(D.parseDomain(raw), want, String(raw))
  const a = await parent('a'); const sent: string[] = []
  const r = await D.requestDomain(a, { domain: 'https://www.montrepcom.ro', note: 'Dorim mail pe domeniu' }, async (s) => { sent.push(s) })
  assert.equal(r.domain, 'montrepcom.ro'); assert.equal(sent.length, 1)
  assert.equal((await D.lastDomainRequest('a'))?.domain, 'montrepcom.ro')
  assert.equal((await db.lead.findUnique({ where: { id: a.leadId } })).customFields.domeniu_cerut, 'montrepcom.ro')
  assert.equal((await db.lead.findUnique({ where: { id: a.leadId } })).customFields.regiune, 'Transilvania') // other custom fields untouched
  await D.requestDomain(a, { domain: 'a.ro' }); await D.requestDomain(a, { domain: 'b.ro' })
  await assert.rejects(D.requestDomain(a, { domain: 'c.ro' }), /mai multe cereri/)
  await assert.rejects(D.requestDomain(a, { domain: 'nope' }), /Domeniu invalid/)
})
