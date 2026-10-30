/** DB-backed checks of doctors reviewing afecțiuni. Needs ENDORSEMENTS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.ENDORSEMENTS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, R: typeof import('../service'), S: typeof import('../../storefront/serialize')
const NOW = new Date('2026-10-29T10:00:00Z')
const cmr = 'CMR|X|Cluj|Chirurgie|2027-06-30|2026-10-01|Echipa|'
const me = (id: string) => ({ id, businessLineId: 'bl', title: `Dr ${id}` })
const doc = (id: string, o: object = {}) => ({ id, slug: id, title: `Dr ${id}`, businessLineId: 'bl', collectionId: 'c', status: 'published', partnerAccess: true, data: { servicii: ['chirurgie-generala'], verificare_cmr: [cmr] }, ...o })
const art = (id: string, parinte: string, o: object = {}) => ({ id, slug: `${parinte}--${id}`, title: `Afecțiune ${id}`, businessLineId: 'bl', collectionId: 'tax', status: 'draft', summary: 's', body: 'b', data: { tip: 'situatie', parinte, proceduri_legate: [], simptome: ['x'] }, ...o })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); R = await import('../service'); S = await import('../../storefront/serialize')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'M', namePlural: 'M', fields: [] } })
  await db.websiteCollection.create({ data: { id: 'tax', businessLineId: 'bl', key: 'servicii', name: 'S', namePlural: 'S', fields: [] } })
  await db.websiteEntry.createMany({ data: [
    doc('a'), doc('b'), doc('derm', { data: { servicii: ['dermatologie'], verificare_cmr: [cmr] } }), doc('nocmr', { data: { servicii: ['chirurgie-generala'] } }), doc('draft', { status: 'draft' }),
    doc('proc', { data: { servicii: ['hernii'], verificare_cmr: [cmr] } }),
    art('hernie', 'chirurgie-generala', { data: { tip: 'situatie', parinte: 'chirurgie-generala', proceduri_legate: ['hernii'] } }), art('acnee', 'dermatologie'), art('cat', 'x', { data: { tip: 'categorie' } }),
  ] })
})
after(async () => { if (db) await db.$disconnect() })

test('a doctor sees only the articles of their own specialty (or related procedure)', { skip }, async () => {
  assert.deepEqual((await R.listArticles(me('a'), NOW)).map((x) => x.slug), ['chirurgie-generala--hernie'])
  assert.deepEqual((await R.listArticles(me('derm'), NOW)).map((x) => x.slug), ['dermatologie--acnee'])
  assert.deepEqual((await R.listArticles(me('proc'), NOW)).map((x) => x.slug), ['chirurgie-generala--hernie'], 'a related procedure counts')
})

test('an unverified or unpublished doctor cannot review', { skip }, async () => {
  await assert.rejects(R.listArticles(me('nocmr'), NOW), /Registrul CMR/)
  await assert.rejects(R.listArticles(me('draft'), NOW), /publicat/)
  await assert.rejects(R.answerArticle(me('derm'), 'hernie', { action: 'confirm' }, NOW), /nu există|specialitatea/)
})

test('confirming puts the doctor on the article; a second doctor is added; confirming again only moves the date', { skip }, async () => {
  assert.deepEqual(await R.answerArticle(me('a'), 'hernie', { action: 'confirm' }, NOW), { status: 'confirmed' })
  await R.answerArticle(me('b'), 'hernie', { action: 'confirm' }, new Date('2026-11-05T10:00:00Z'))
  await R.answerArticle(me('a'), 'hernie', { action: 'confirm' }, new Date('2026-12-01T10:00:00Z'))
  const d = (await db.websiteEntry.findUnique({ where: { id: 'hernie' } })).data
  assert.deepEqual(d.revizuiri, ['b|2026-11-05', 'a|2026-12-01'])
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'hernie' } })).status, 'draft', 'a review never publishes by itself')
  const mine = (await R.listArticles(me('a'), NOW))[0]!
  assert.equal(mine.mine, '2026-12-01'); assert.deepEqual(mine.reviews, [{ title: 'Dr b', date: '2026-11-05' }])
  assert.ok(await db.activity.findFirst({ where: { action: 'article_review_confirmed', entityId: 'hernie' } }))
})

test('withdrawing removes only that doctor', { skip }, async () => {
  await R.answerArticle(me('b'), 'hernie', { action: 'withdraw' }, NOW)
  assert.deepEqual((await db.websiteEntry.findUnique({ where: { id: 'hernie' } })).data.revizuiri, ['a|2026-12-01'])
})

test('suggested changes are stored for the team, validated, and never reach the public serializer', { skip }, async () => {
  await assert.rejects(R.answerArticle(me('a'), 'hernie', { action: 'suggest', note: 'scurt' }, NOW))
  await R.answerArticle(me('a'), 'hernie', { action: 'suggest', note: 'La semne de alarmă\n adaugă febra.' }, NOW)
  const row = await db.websiteEntry.findUnique({ where: { id: 'hernie' } })
  assert.deepEqual(row.data.sugestii_medici, ['a|2026-10-29|La semne de alarmă adaugă febra.'])
  const out = S.serializeListItem(row, 'servicii') as { data: Record<string, unknown> }
  assert.equal('sugestii_medici' in out.data, false)
  assert.equal(out.data.tip, 'situatie')
})

test('two doctors answering at once both end up on the article', { skip }, async () => {
  await db.websiteEntry.update({ where: { id: 'hernie' }, data: { data: { tip: 'situatie', parinte: 'chirurgie-generala', proceduri_legate: [] } } })
  await Promise.all([R.answerArticle(me('a'), 'hernie', { action: 'confirm' }, NOW), R.answerArticle(me('b'), 'hernie', { action: 'confirm' }, NOW)])
  assert.deepEqual([...(await db.websiteEntry.findUnique({ where: { id: 'hernie' } })).data.revizuiri].sort(), ['a|2026-10-29', 'b|2026-10-29'])
})
