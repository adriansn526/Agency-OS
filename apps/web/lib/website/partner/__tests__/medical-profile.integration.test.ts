/** DB-backed checks of the medical "Profilul meu" edit and the proposal queue. Needs MEDPROFILE_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.MEDPROFILE_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, P: typeof import('../profile'), Q: typeof import('../pending'), S: typeof import('../../storefront/serialize')
const entry = (id: string) => db.websiteEntry.findUnique({ where: { id }, include: { media: true } })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); P = await import('../profile'); Q = await import('../pending'); S = await import('../../storefront/serialize')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteEntry","WebsiteCollection","Activity","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.businessLine.create({ data: { id: 'bl2', slug: 'bl2', name: 'bl2', icon: 'x', color: '#000', config: {} } })
  await db.websiteCollection.create({ data: { id: 'med', businessLineId: 'bl', key: 'companii', name: 'M', namePlural: 'M', fields: [{ key: 'cod_parafa', label: 'P', type: 'text' }] } })
  await db.websiteCollection.create({ data: { id: 'con', businessLineId: 'bl2', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  await db.websiteCollection.create({ data: { id: 'tax', businessLineId: 'bl', key: 'servicii', name: 'S', namePlural: 'S', fields: [] } })
  await db.websiteEntry.createMany({ data: [
    { id: 'tx1', businessLineId: 'bl', collectionId: 'tax', slug: 'g', title: 'Grup', status: 'published', data: { tip: 'grup' } },
    { id: 'tx2', businessLineId: 'bl', collectionId: 'tax', slug: 'hernii', title: 'Hernii', status: 'published', data: { tip: 'categorie', parinte: 'g' } },
    { id: 'tx3', businessLineId: 'bl', collectionId: 'tax', slug: 'tiroida', title: 'Tiroidă', status: 'published', data: { tip: 'categorie', parinte: 'g' } },
    { id: 'd', businessLineId: 'bl', collectionId: 'med', slug: 'd', title: 'Dr D', status: 'published', partnerAccess: true, data: { servicii: ['hernii'], specializare: 'Chirurgie generală' } },
    { id: 'c', businessLineId: 'bl2', collectionId: 'con', slug: 'c', title: 'Firma', status: 'published', partnerAccess: true, data: {} },
  ] })
})
after(async () => { if (db) await db.$disconnect() })

test('facts the doctor owns go live at once and come back in the profile', { skip }, async () => {
  const r = await P.updateProfile(await entry('d'), { tarif_consultatie: 250, consult_online: 'da', experienta_ani: 7, clinici: ['Spitalul X | Ploiești', 'Medlife | București'], limbi: ['română'], studii: ['Rezidențiat Elias'], intrebari: ['Cât durează? | Depinde de caz.'], program: 'L-V 9-17' })
  assert.ok(r.changed.includes('tarif_consultatie') && r.changed.includes('clinici') && r.changed.includes('intrebari'))
  const p = P.serializeProfile(await entry('d'), { groups: [], categories: [] }, true) as any
  assert.equal(p.tarif_consultatie, 250); assert.equal(p.consult_online, 'da'); assert.deepEqual(p.clinici, ['Spitalul X | Ploiești', 'Medlife | București']); assert.equal(p.intrebari.length, 1)
})

test('invalid values are refused with 422', { skip }, async () => {
  for (const bad of [{ tarif_consultatie: -1 }, { consult_online: 'poate' }, { experienta_ani: 99 }, { intrebari: ['fără separator'] }, { cod_parafa: 'a b' }, { nume: 'x' }]) {
    await assert.rejects(P.updateProfile(await entry('d'), bad), (e: any) => e.status === 422, JSON.stringify(bad))
  }
})

test('specialty, procedures, sub-specialities and parafa are only proposed; the live values stay', { skip }, async () => {
  const r = await P.updateProfile(await entry('d'), { servicii: ['hernii', 'tiroida'], specializare: 'Chirurgie și tiroidă', subspecializari: ['Chirurgia tiroidei'], cod_parafa: 'A12345' })
  assert.deepEqual(r.changed, ['modificari_in_asteptare'])
  const e = await entry('d'), d = e.data
  assert.deepEqual(d.servicii, ['hernii']); assert.equal(d.specializare, 'Chirurgie generală'); assert.equal(d.cod_parafa, undefined)
  const p = P.serializeProfile(e, { groups: [], categories: [] }, true) as any
  assert.deepEqual(p.pending.servicii, ['hernii', 'tiroida']); assert.equal(p.pending.cod_parafa, 'A12345')
  // proposing the live value again withdraws that part of the proposal
  await P.updateProfile(await entry('d'), { specializare: 'Chirurgie generală' })
  assert.equal(((await entry('d')).data as any).modificari_asteptare.includes('specializare'), false)
})

test('an unknown procedure cannot even be proposed', { skip }, async () => {
  await assert.rejects(P.updateProfile(await entry('d'), { servicii: ['nu-exista'] }), (e: any) => e.status === 422)
})

test('the public profile never exposes the proposal; approving applies it, rejecting drops it', { skip }, async () => {
  const pub = S.serializeListItem(await entry('d') as never, 'companii') as any
  assert.equal('modificari_asteptare' in pub.data, false)
  const g = await Q.getPending('bl', 'd')
  assert.deepEqual(g.proposed?.servicii, ['hernii', 'tiroida'])
  await Q.approvePending('bl', 'd', { name: 'Echipa' })
  const d = (await entry('d')).data
  assert.deepEqual(d.servicii, ['hernii', 'tiroida']); assert.equal(d.cod_parafa, 'A12345'); assert.equal(d.modificari_asteptare, undefined)
  await P.updateProfile(await entry('d'), { cod_parafa: 'B99999' })
  await Q.rejectPending('bl', 'd', { name: 'Echipa' }, 'nu corespunde')
  const e2 = (await entry('d')).data
  assert.equal(e2.cod_parafa, 'A12345'); assert.equal(e2.modificari_asteptare, undefined)
  await assert.rejects(Q.approvePending('bl', 'd', { name: 'Echipa' }), (e: any) => e.status === 404)
  assert.ok(await db.activity.findFirst({ where: { action: 'partner_changes_approved', entityId: 'd' } }))
})

test('cazuistica: anonymised cases are only proposed, validated, shown after approval, and never public before', { skip }, async () => {
  await assert.rejects(P.updateProfile(await entry('d'), { cazuistica: ['fără separator, dar destul de lung ca să treacă de lungimea minimă'] }), (e: any) => e.status === 422)
  await assert.rejects(P.updateProfile(await entry('d'), { cazuistica: ['Titlu | scurt'] }), (e: any) => e.status === 422)
  const one = 'Hernie ombilicală recidivată | Pacient adult cu hernie recidivată după o operație anterioară; s-a ales o abordare laparoscopică, cu externare a doua zi.'
  await P.updateProfile(await entry('d'), { cazuistica: [one] })
  const p = P.serializeProfile(await entry('d'), { groups: [], categories: [] }, true) as any
  assert.deepEqual(p.cazuistica, []); assert.deepEqual(p.pending.cazuistica, [one])
  const pub = S.serializeListItem(await entry('d') as never, 'companii') as any
  assert.equal(pub.data.cazuistica, undefined, 'nothing public before the team approves')
  await Q.approvePending('bl', 'd', { name: 'Echipa' })
  assert.deepEqual((await entry('d')).data.cazuistica, [one])
  assert.deepEqual((S.serializeListItem(await entry('d') as never, 'companii') as any).data.cazuistica, [one])
  await P.updateProfile(await entry('d'), { cazuistica: [] })
  await Q.approvePending('bl', 'd', { name: 'Echipa' })
  assert.equal((await entry('d')).data.cazuistica, undefined)
})

test('cazuistica blocks: validated, images only from the doctor\'s own uploads, videos only YouTube/Vimeo, old text cases stay valid', { skip }, async () => {
  await db.websiteMedia.create({ data: { entryId: 'd', kind: 'image', storageKey: 'k1', url: 'https://cdn.test/own-1.webp', alt: 'cazuistica', mimeType: 'image/webp', sizeBytes: 10, width: 10, height: 10, sortOrder: 0 } })
  await db.websiteMedia.create({ data: { entryId: 'd', kind: 'image', storageKey: 'k2', url: 'https://cdn.test/own-2.webp', alt: 'cazuistica', mimeType: 'image/webp', sizeBytes: 10, width: 10, height: 10, sortOrder: 1 } })
  const c = (b: unknown[], t = 'Caz cu blocuri') => JSON.stringify({ v: 2, t, b })
  const long = { k: 'long', x: 'Descriere anonimă, suficient de lungă pentru validare.' }
  const bad = async (v: string) => assert.rejects(P.updateProfile(await entry('d'), { cazuistica: [v] }), (e: any) => e.status === 422)
  await bad(c([{ k: 'script', x: 'abcdefghijklmnopqrstuvwxyz' }]))
  await bad(c([long, { k: 'p', x: 'ok', extra: 1 }]))
  await bad(c([long, { k: 'img', u: 'https://evil.test/track.png' }]))
  await bad(c([long, { k: 'gal', g: [{ u: 'https://cdn.test/own-1.webp' }] }]))
  await bad(c([long, { k: 'vid', u: 'https://evil.test/video.mp4' }]))
  await bad(c([{ k: 'p', x: 'prea scurt' }]))
  await bad('{ nu e json')
  const ok = c([{ k: 'h1', x: 'Prezentarea cazului' }, long, { k: 'ul', i: ['unu', 'doi'] }, { k: 'ol', i: ['primul pas'] }, { k: 'h2', x: 'Imagini' }, { k: 'img', u: 'https://cdn.test/own-1.webp', a: 'CT abdominal', c: 'Înainte' }, { k: 'gal', g: [{ u: 'https://cdn.test/own-1.webp' }, { u: 'https://cdn.test/own-2.webp' }] }, { k: 'vid', u: 'https://youtu.be/dQw4w9WgXcQ?t=5', c: 'Tehnica' }])
  await P.updateProfile(await entry('d'), { cazuistica: [ok, 'Titlu vechi | descriere în formatul vechi, destul de lungă'] })
  const prop = ((await entry('d')).data.modificari_asteptare && JSON.parse((await entry('d')).data.modificari_asteptare).cazuistica) as string[]
  assert.equal(prop.length, 2)
  assert.equal(JSON.parse(prop[0]!).b.find((b: any) => b.k === 'vid').u, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video link is normalised')
  assert.equal(prop[1], 'Titlu vechi | descriere în formatul vechi, destul de lungă')
  // the case images are never listed in the public gallery
  const detail = S.serializeDetail(await entry('d') as never, 'companii', await db.websiteMedia.findMany({ where: { entryId: 'd' } }), []) as any
  assert.equal(detail.media.length, 0)
  await Q.rejectPending('bl', 'd', { name: 'Echipa' })
})

test('on a line without the parafa field the medical keys do not exist, and old behaviour stays', { skip }, async () => {
  await assert.rejects(P.updateProfile(await entry('c'), { tarif_consultatie: 10 }), (e: any) => e.status === 422)
  await assert.rejects(P.updateProfile(await entry('c'), { cod_parafa: 'ABCD12' }), (e: any) => e.status === 422)
  const r = await P.updateProfile(await entry('c'), { summary: 'Descriere', certificari: ['ISO'] })
  assert.ok(r.changed.includes('summary'))
})
