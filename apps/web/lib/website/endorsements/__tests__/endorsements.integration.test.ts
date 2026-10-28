/** DB-backed checks of doctor endorsements. Needs ENDORSEMENTS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.ENDORSEMENTS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, E: typeof import('../service'), Q: typeof import('../../storefront/queries')
const NOW = new Date('2026-10-28T10:00:00Z')
const cmr = (until = '2027-06-30') => [`CMR|X|Cluj|Cardiologie|${until}|2026-10-01|Echipa|`]
const doc = (id: string, o: object = {}) => ({ id, slug: id, title: `Dr ${id}`, businessLineId: 'bl', collectionId: 'c', status: 'published', partnerAccess: true, data: { specializare: 'Cardiologie', clinici: [`Clinica ${id}`], verificare_cmr: cmr() }, ...o })
const me = (id: string) => ({ id, businessLineId: 'bl', title: `Dr ${id}` })
const ctx = () => ({ businessLineId: 'bl', channelId: 'ch' })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); E = await import('../service'); Q = await import('../../storefront/queries')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteEndorsement","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteChannel.create({ data: { id: 'ch', businessLineId: 'bl', apiKeys: [] } })
  await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'M', namePlural: 'M', fields: [{ key: 'cod_parafa', label: 'Parafă', type: 'text' }] } })
  await db.websiteEntry.createMany({ data: [
    doc('a'), doc('b'), doc('c'), doc('d'), doc('nocmr', { data: { clinici: ['X'] } }), doc('old', { data: { verificare_cmr: cmr('2026-01-01') } }), doc('draft', { status: 'draft' }),
    doc('same1', { data: { clinici: ['Clinica Comună'], verificare_cmr: cmr() } }), doc('same2', { data: { clinici: ['clinica comuna'], verificare_cmr: cmr() } }),
  ] })
})
after(async () => { if (db) await db.$disconnect() })

test('a verified doctor recommends a colleague; the colleague sees the count and the author only if they agreed to be named', { skip }, async () => {
  await E.endorse(me('a'), { slug: 'b', note: 'Excelent colaborator' }, NOW)
  await E.endorse(me('c'), { slug: 'b', showName: true }, NOW)
  const s = (await E.summaries('bl', ['b'], NOW)).get('b')!
  assert.equal(s.count, 2)
  assert.deepEqual(s.items.map((i) => i.slug), ['c'])
  assert.equal(s.items[0]!.specialty, 'Cardiologie')
})

test('without a valid CMR verification, or from an unpublished profile, nothing can be recommended', { skip }, async () => {
  await assert.rejects(E.endorse(me('nocmr'), { slug: 'b' }, NOW), /Registrul CMR/)
  await assert.rejects(E.endorse(me('old'), { slug: 'b' }, NOW), /Registrul CMR/)
  await assert.rejects(E.endorse(me('draft'), { slug: 'b' }, NOW), /publicat/)
  await assert.rejects(E.endorse(me('a'), { slug: 'a' }, NOW), /singur/)
  await assert.rejects(E.endorse(me('a'), { slug: 'draft' }, NOW), /nu există/)
})

test('a mutual pair and a shared clinic are stored but not counted', { skip }, async () => {
  await E.endorse(me('d'), { slug: 'a' }, NOW)
  await E.endorse(me('a'), { slug: 'd' }, NOW) // d <-> a
  await E.endorse(me('same1'), { slug: 'same2' }, NOW)
  const m = await E.summaries('bl', ['a', 'd', 'same2'], NOW)
  assert.equal(m.get('a')?.count ?? 0, 0)
  assert.equal(m.get('d')?.count ?? 0, 0)
  assert.equal(m.get('same2')?.count ?? 0, 0)
  assert.equal((await db.websiteEndorsement.findFirst({ where: { endorserId: 'same1', endorseeId: 'same2' } })).sameClinic, true)
})

test('an endorsement stops counting when the endorser\'s CMR verification expires', { skip }, async () => {
  assert.equal((await E.summaries('bl', ['b'], NOW)).get('b')!.count, 2)
  assert.equal((await E.summaries('bl', ['b'], new Date('2027-07-01T00:00:00Z'))).get('b')?.count ?? 0, 0)
})

test('withdrawing hides it, endorsing again brings it back; the team can remove it for good', { skip }, async () => {
  const row = await db.websiteEndorsement.findFirst({ where: { endorserId: 'a', endorseeId: 'b' } })
  await E.withdraw(me('a'), row.id)
  assert.equal((await E.summaries('bl', ['b'], NOW)).get('b')!.count, 1)
  await E.endorse(me('a'), { slug: 'b' }, NOW)
  assert.equal((await E.summaries('bl', ['b'], NOW)).get('b')!.count, 2)
  await E.adminRemove('bl', row.id, 'abuz', { name: 'Echipa' })
  assert.equal((await E.summaries('bl', ['b'], NOW)).get('b')!.count, 1)
  await assert.rejects(E.endorse(me('a'), { slug: 'b' }, NOW), /scoasă de echipă/)
})

test('at most 10 new recommendations in 30 days; updating an existing one does not use the allowance', { skip }, async () => {
  await db.websiteEntry.createMany({ data: Array.from({ length: 11 }, (_, i) => doc(`t${i}`)) })
  // 'c' already recommended 'b' above, so nine more fill the allowance
  for (let i = 0; i < 9; i++) await E.endorse(me('c'), { slug: `t${i}` }, NOW)
  await assert.rejects(E.endorse(me('c'), { slug: 't10' }, NOW), /cel mult 10/)
  await E.endorse(me('c'), { slug: 't0', note: 'actualizat' }, NOW)
  await E.endorse(me('c'), { slug: 't10' }, new Date(NOW.getTime() + 31 * 86_400_000))
})

test('the public listing and detail carry the count; other lines get nothing extra', { skip }, async () => {
  const list: any = await Q.listEntries(ctx(), new URLSearchParams('collection=companii&limit=50'))
  assert.equal(list.items.find((i: any) => i.slug === 'b').endorsementCount, 1)
  const detail: any = await Q.getEntry(ctx(), 'companii', 'b')
  assert.equal(detail.endorsements.count, 1)
  assert.equal(JSON.stringify(detail).includes('Excelent colaborator'), false) // a note is only shown with its author's name
  await db.websiteCollection.update({ where: { id: 'c' }, data: { fields: [] } })
  const plain: any = await Q.getEntry(ctx(), 'companii', 'b')
  assert.equal('endorsements' in plain, false)
})
