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
  assert.deepEqual((await R.listArticles(me('a'), NOW)).items.map((x) => x.slug), ['chirurgie-generala--hernie'])
  assert.deepEqual((await R.listArticles(me('derm'), NOW)).items.map((x) => x.slug), ['dermatologie--acnee'])
  assert.deepEqual((await R.listArticles(me('proc'), NOW)).items.map((x) => x.slug), ['chirurgie-generala--hernie'], 'a related procedure counts')
})

test('an unverified or unpublished doctor can read the articles of their specialty but not confirm', { skip }, async () => {
  const noCmr = await R.listArticles(me('nocmr'), NOW)
  assert.deepEqual([noCmr.items.length, noCmr.canReview, /Registrul CMR/.test(noCmr.reason ?? '')], [1, false, true])
  const draft = await R.listArticles(me('draft'), NOW)
  assert.deepEqual([draft.canReview, /publicat/.test(draft.reason ?? '')], [false, true])
  assert.equal((await R.listArticles(me('a'), NOW)).canReview, true)
  await assert.rejects(R.answerArticle(me('nocmr'), 'hernie', { action: 'confirm' }, NOW), /Registrul CMR/)
  await assert.rejects(R.answerArticle(me('draft'), 'hernie', { action: 'suggest', note: 'o sugestie destul de lunga' }, NOW), /publicat/)
  await assert.rejects(R.answerArticle(me('derm'), 'hernie', { action: 'confirm' }, NOW), /nu există|specialitatea/)
})

test('confirming puts the doctor on the article; a second doctor is added; confirming again only moves the date', { skip }, async () => {
  assert.deepEqual(await R.answerArticle(me('a'), 'hernie', { action: 'confirm' }, NOW), { status: 'confirmed', edited: [] })
  await R.answerArticle(me('b'), 'hernie', { action: 'confirm' }, new Date('2026-11-05T10:00:00Z'))
  await R.answerArticle(me('a'), 'hernie', { action: 'confirm' }, new Date('2026-12-01T10:00:00Z'))
  const d = (await db.websiteEntry.findUnique({ where: { id: 'hernie' } })).data
  assert.deepEqual(d.revizuiri, ['b|2026-11-05', 'a|2026-12-01'])
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'hernie' } })).status, 'draft', 'a review never publishes by itself')
  const mine = (await R.listArticles(me('a'), NOW)).items[0]!
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

test('the reviewing doctor corrects the text while confirming; old values are logged; bad edits are refused', { skip }, async () => {
  await db.websiteEntry.update({ where: { id: 'hernie' }, data: { summary: 'vechi', body: 'corp vechi', data: { tip: 'situatie', parinte: 'chirurgie-generala', proceduri_legate: [], simptome: ['a', 'b'], intrebari: ['Q | A'] } } })
  await assert.rejects(R.answerArticle(me('a'), 'hernie', { action: 'confirm', edits: { intrebari: ['fără separator'] } }, NOW), /Întrebare \| Răspuns/)
  await assert.rejects(R.answerArticle(me('a'), 'hernie', { action: 'confirm', edits: { titlu: 'x' } as never }, NOW))
  await assert.rejects(R.answerArticle(me('nocmr'), 'hernie', { action: 'confirm', edits: { body: 'x' } }, NOW), /Registrul CMR/)
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'hernie' } })).body, 'corp vechi', 'a refused edit changes nothing')
  const out = await R.answerArticle(me('a'), 'hernie', { action: 'confirm', edits: { summary: 'nou', body: 'corp vechi', simptome: ['a', 'b', 'c'], intrebari: ['Q | A'] } }, NOW) as { edited: string[] }
  assert.deepEqual(out.edited.sort(), ['simptome', 'summary'])
  const row = await db.websiteEntry.findUnique({ where: { id: 'hernie' } })
  assert.deepEqual([row.summary, row.body, row.data.simptome, row.data.revizuiri], ['nou', 'corp vechi', ['a', 'b', 'c'], ['a|2026-10-29']])
  const log = await db.activity.findFirst({ where: { action: 'article_review_confirmed', entityId: 'hernie' }, orderBy: { createdAt: 'desc' } })
  assert.deepEqual(log.details.changes.simptome, { before: ['a', 'b'], after: ['a', 'b', 'c'] })
  assert.equal(log.details.changes.summary.before, 'vechi')
})

test('the article body as blocks: old text shows as one block; edits accept only files uploaded for this article; changes are logged', { skip }, async () => {
  await db.websiteEntry.update({ where: { id: 'hernie' }, data: { body: 'Text vechi al articolului', data: { tip: 'situatie', parinte: 'chirurgie-generala', proceduri_legate: [] } } })
  assert.deepEqual((await R.listArticles(me('a'), NOW)).items[0]!.blocks, [{ k: 'long', x: 'Text vechi al articolului' }])
  await db.websiteMedia.create({ data: { entryId: 'hernie', kind: 'image', storageKey: 'h1', url: 'https://cdn.test/art-1.webp', alt: 'cazuistica', mimeType: 'image/webp', sizeBytes: 10, width: 10, height: 10, sortOrder: 0 } })
  const blocks = [{ k: 'h2', x: 'Ce este' }, { k: 'long', x: 'Text nou, scris de medic.' }, { k: 'img', u: 'https://cdn.test/art-1.webp', a: 'schemă', c: 'Anatomie' }]
  await assert.rejects(R.answerArticle(me('a'), 'hernie', { action: 'confirm', edits: { continut: [{ k: 'img', u: 'https://evil.test/x.png' }] } }, NOW), /necunoscut/)
  await assert.rejects(R.answerArticle(me('a'), 'hernie', { action: 'confirm', edits: { continut: [{ k: 'script', x: 'abc' }] as never } }, NOW))
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'hernie' } })).data.continut, undefined, 'a refused edit changes nothing')
  const out = await R.answerArticle(me('a'), 'hernie', { action: 'confirm', edits: { continut: blocks as never } }, NOW) as { edited: string[] }
  assert.deepEqual(out.edited, ['continut'])
  const row = await db.websiteEntry.findUnique({ where: { id: 'hernie' } })
  assert.deepEqual(JSON.parse(row.data.continut), blocks)
  assert.deepEqual((await R.listArticles(me('a'), NOW)).items[0]!.blocks, blocks)
  assert.equal(R.articleFilesInUse(row.data).includes('https://cdn.test/art-1.webp'), true)
  const log = await db.activity.findFirst({ where: { action: 'article_review_confirmed', entityId: 'hernie' }, orderBy: { createdAt: 'desc' } })
  assert.deepEqual(log.details.edited, ['continut'])
  // access for uploads: same rules as reviewing
  assert.equal((await R.articleAccess(me('a'), 'hernie', NOW)).article.id, 'hernie')
  await assert.rejects(R.articleAccess(me('derm'), 'hernie', NOW), /nu există|specialitatea/)
  await assert.rejects(R.articleAccess(me('nocmr'), 'hernie', NOW), /Registrul CMR/)
})
