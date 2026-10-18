/** DB-backed checks of the editable services list and firm suggestions. Needs SERVICES_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.SERVICES_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, A: typeof import('../../admin/service'), L: typeof import('../live'), P: typeof import('../../partner/profile'), S: typeof import('../../partner/suggestions'), Q: typeof import('../../storefront/queries'), PJ: typeof import('../../partner/projects')
let svcCol = '', firm: any

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); A = await import('../../admin/service'); L = await import('../live'); P = await import('../../partner/profile'); S = await import('../../partner/suggestions'); Q = await import('../../storefront/queries'); PJ = await import('../../partner/projects')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteFoundingSlot","WebsiteLayoutVersion","WebsitePartnerSession","WebsitePartnerLogin","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteChannel.create({ data: { businessLineId: 'bl' } })
  const fields = [{ key: 'tip', label: 'Tip', type: 'select', options: ['grup', 'categorie'] }, { key: 'parinte', label: 'Grup', type: 'text' }]
  svcCol = (await db.websiteCollection.create({ data: { id: 'cs', businessLineId: 'bl', key: 'servicii', name: 'Serviciu', namePlural: 'Servicii', kind: 'article', fields } })).id
  const col = await db.websiteCollection.create({ data: { id: 'cc', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [{ key: 'servicii', label: 'S', type: 'list' }] } })
  firm = await db.websiteEntry.create({ data: { id: 'f', businessLineId: 'bl', collectionId: col.id, slug: 'f', title: 'Firma F', status: 'published', partnerAccess: true, county: 'Mureș', data: { servicii: [] }, publishedAt: new Date() } })
})
after(async () => { if (db) await db.$disconnect() })
const create = (o: object) => A.createEntry('bl', { collectionId: svcCol, status: 'draft', ...o })
const firmRow = () => db.websiteEntry.findUnique({ where: { id: 'f' }, include: { media: true } })

test('empty collection: the built-in list is used', { skip }, async () => {
  L.invalidateTaxonomy(); const t = await L.getTaxonomy('bl')
  assert.ok(t.categories.length >= 20 && t.categories.some((c) => c.slug === 'demolari'))
})

test('admin rules: a type is required; a category needs an existing group; a group has no parent', { skip }, async () => {
  await create({ title: 'Instalații', slug: 'instalatii', data: { tip: 'grup' } })
  await create({ title: 'Finisaje', slug: 'finisaje', data: { tip: 'grup' } })
  await assert.rejects(create({ title: 'Fără tip', slug: 'fara-tip', data: {} }), /tipul/)
  await assert.rejects(create({ title: 'Orfană', slug: 'orfana', data: { tip: 'categorie', parinte: 'nu-exista' } }), /grup existent/)
  await assert.rejects(create({ title: 'Fără părinte', slug: 'fp', data: { tip: 'categorie' } }), /grup existent/)
  await assert.rejects(create({ title: 'Grup cu părinte', slug: 'gp', data: { tip: 'grup', parinte: 'instalatii' } }), /nu are părinte/)
})

test('a service added in the UI is immediately selectable, validated, and titled everywhere', { skip }, async () => {
  const c = await create({ title: 'Curățenie după construcție', slug: 'curatenie-dupa-constructie', data: { tip: 'categorie', parinte: 'finisaje' } })
  await create({ title: 'Instalații sanitare', slug: 'instalatii-sanitare', data: { tip: 'categorie', parinte: 'instalatii' } })
  const tax = await L.getTaxonomy('bl')
  assert.deepEqual(tax.categories.map((x) => x.slug).sort(), ['curatenie-dupa-constructie', 'instalatii-sanitare'])   // the built-in list is replaced by the line's own
  const prof = P.serializeProfile(await firmRow(), tax); assert.ok(prof.categories.some((x: any) => x.title === 'Curățenie după construcție'))
  const r = await P.updateProfile(await firmRow(), { servicii: ['curatenie-dupa-constructie'] }); assert.deepEqual(r.changed, ['servicii'])
  await assert.rejects(P.updateProfile(await firmRow(), { servicii: ['demolari'] }), (e: any) => e.message === 'Date invalide' && /demolari/.test(String(e.details)))   // not in this line's list any more
  const parent = await firmRow()
  const proj = await PJ.createProject(parent, { title: 'Curățenie bloc nou', categorie: 'curatenie-dupa-constructie' }); assert.equal(proj.categorie, 'curatenie-dupa-constructie')
  await assert.rejects(PJ.createProject(parent, { title: 'Proiect greșit', categorie: 'demolari' }), /Date invalide/)
  const ctx = { businessLineId: 'bl', channelId: 'x' }
  const d: any = await Q.getEntry(ctx, 'companii', 'f'); assert.deepEqual(d.services, [{ slug: 'curatenie-dupa-constructie', title: 'Curățenie după construcție' }])
  const p: any = await Q.getEntry(ctx, 'proiecte', proj.slug); assert.deepEqual(p.category, { slug: 'curatenie-dupa-constructie', title: 'Curățenie după construcție' })
  assert.ok(c.id)
})

test('a service in use cannot be deleted, suspended or renamed; once freed it can', { skip }, async () => {
  const cat = await db.websiteEntry.findFirst({ where: { slug: 'curatenie-dupa-constructie' } })
  await assert.rejects(A.deleteEntry('bl', cat.id), /folosită de 1 firmă/)
  await assert.rejects(A.updateEntry('bl', cat.id, { status: 'suspended' }), /folosită de 1 firmă/)
  await assert.rejects(A.updateEntry('bl', cat.id, { slug: 'alt-nume' }), /folosită de 1 firmă/)
  const grup = await db.websiteEntry.findFirst({ where: { slug: 'finisaje' } })
  await assert.rejects(A.deleteEntry('bl', grup.id), /Grupul are 1 categorii/)
  await A.updateEntry('bl', cat.id, { title: 'Curățenie finală', status: 'published' })               // editing the title is fine
  assert.equal((await L.getTaxonomy('bl')).categories.find((x) => x.slug === 'curatenie-dupa-constructie')!.title, 'Curățenie finală')   // cache refreshed
  await P.updateProfile(await firmRow(), { servicii: [] })
  await A.updateEntry('bl', cat.id, { slug: 'curatenie-finala' })
  assert.deepEqual((await L.getTaxonomy('bl')).categories.map((x) => x.slug).sort(), ['curatenie-finala', 'instalatii-sanitare'])
  await A.deleteEntry('bl', cat.id); assert.ok(!(await L.getTaxonomy('bl')).categories.some((x) => x.slug === 'curatenie-finala'))
})

test('suggestions: a firm asks, the team sees it, marks it done; limited per day', { skip }, async () => {
  const f = await firmRow(); const t0 = new Date('2026-11-03T08:00:00Z')
  await assert.rejects(S.suggestService(f, { title: 'ab' }), /Date invalide/); await assert.rejects(S.suggestService(f, { title: 'Valid', extra: 1 }), /Date invalide/)
  const sent: string[] = []
  await S.suggestService(f, { title: 'Termoizolații fațade', note: 'Lucrăm cu polistiren' }, async (s) => { sent.push(s) }, t0)
  let p = await S.pendingSuggestions('bl'); assert.equal(p.length, 1); assert.deepEqual([p[0]!.title, p[0]!.firm, p[0]!.note], ['Termoizolații fațade', 'Firma F', 'Lucrăm cu polistiren']); assert.equal(sent.length, 1)
  await assert.rejects(S.markDone('other', p[0]!.id), /nu există/)
  await S.markDone('bl', p[0]!.id); assert.equal((await S.pendingSuggestions('bl')).length, 0)
  for (let i = 0; i < 4; i++) await S.suggestService(f, { title: `Serviciu ${i}` }, undefined, t0)
  await assert.rejects(S.suggestService(f, { title: 'Prea multe' }, undefined, t0), /mai multe sugestii/)
})
