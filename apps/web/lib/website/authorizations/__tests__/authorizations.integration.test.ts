/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { decodeRef, encodeRef, listOperators, norm, parseAuthorizations, registerName, resolveOperator, searchOperators } from '../anre'
import { activeVerified, decodeVerified } from '../service'

const DETALIU = `<table><tr><th>Nr. autorizatie</th><th>Tip autorizatie</th><th>Data emitere</th><th>Data expirare</th><th>Stare</th></tr>
  <tr><td>20939</td><td>PDSB</td><td>13/04/2022</td><td>12/04/2027</td><td>Acordata</td><td></td></tr>
  <tr><td>21213</td><td>PDIB</td><td>07/07/2022</td><td>06/07/2027</td><td>Acordata</td><td></td></tr>
  <tr><td>10001</td><td>EDIB</td><td>01/01/2015</td><td>31/12/2019</td><td>Expirata</td><td></td></tr></table>`

test('parseAuthorizations reads number, type, ISO dates and state from the register table', () => {
  const a = parseAuthorizations(DETALIU)
  assert.deepEqual(a.map((x) => [x.number, x.type, x.issued, x.expires, x.state]), [['20939', 'PDSB', '2022-04-13', '2027-04-12', 'Acordata'], ['21213', 'PDIB', '2022-07-07', '2027-07-06', 'Acordata'], ['10001', 'EDIB', '2015-01-01', '2019-12-31', 'Expirata']])
  assert.deepEqual(parseAuthorizations('<table></table>'), []); assert.deepEqual(parseAuthorizations('garbage'), [])
})
const ROW = (name: string, addr: string, county: string) => ({ NrCrt: 1, Societate: name, Sediu: `${addr};`, Localitate: 'X', Judet: county, TelefonFax: '', ReprezentantLegal: 'Administrator: : Ion POPESCU', Detaliu: DETALIU })
const fakeFetch = ((url: string, init?: any) => {
  const body = String(init?.body ?? '')
  if (url.endsWith('/Dictionary/GetJudete')) return Promise.resolve(new Response(JSON.stringify([{ IdJudet: 1, Nume: 'Alba' }, { IdJudet: 2, Nume: 'Teleorman' }])))
  const id = /Judet%5B0%5D\.IdJudet=(\d+)/.exec(body)?.[1] ?? /Judet\[0\]\.IdJudet=(\d+)/.exec(body)?.[1]
  const rows = id === '2' ? [ROW('MELIORSTAL', 'Str. A nr. 3, Videle', 'Teleorman'), ROW('ALT GAZ', 'Str. B', 'Teleorman'), { ...ROW('FARA DATE', 'x', 'Teleorman'), Sediu: null, TelefonFax: null, ReprezentantLegal: null, Detaliu: null }] : [ROW('MELIORSTAL PLUS', 'Str. C, Alba', 'Alba')]
  return Promise.resolve(new Response(JSON.stringify({ Data: rows, Total: rows.length })))
}) as unknown as typeof fetch
test('register client: lists a county, searches by name (diacritics ignored, one or all counties), resolves a ref from the register itself', async () => {
  const t = await listOperators(2, fakeFetch); assert.deepEqual([t.length, t[0]!.name, t[0]!.address, t[0]!.representative, t[0]!.authorizations.length], [3, 'MELIORSTAL', 'Str. A nr. 3, Videle', 'Ion POPESCU', 3]); assert.deepEqual([t[2]!.address, t[2]!.representative, t[2]!.authorizations.length], ['', '', 0])   // rows with empty fields do not break the list
  assert.deepEqual((await searchOperators('meliorstal', undefined, fakeFetch)).map((o) => o.name), ['MELIORSTAL PLUS', 'MELIORSTAL'])
  assert.deepEqual((await searchOperators('Meliorstal', 'teleorman', fakeFetch)).map((o) => o.name), ['MELIORSTAL']); assert.deepEqual(await searchOperators('xx', undefined, fakeFetch), [])
  const found = (await searchOperators('meliorstal', 'Teleorman', fakeFetch))[0]!
  assert.equal((await resolveOperator(found.ref, fakeFetch))?.address, 'Str. A nr. 3, Videle'); assert.equal(await resolveOperator('garbage', fakeFetch), null); assert.equal(await resolveOperator(encodeRef(2, 'MELIORSTAL', 'Altă adresă'), fakeFetch), null)
  assert.deepEqual(decodeRef(encodeRef(2, 'A', 'B')), { countyId: 2, name: 'A', address: 'B' }); assert.equal(decodeRef('%%'), null); assert.equal(norm('Țeavă  Ăă'), 'teava aa')
})
test('registerName drops the legal form', () => {
  assert.equal(registerName('MELIORSTAL SRL'), 'MELIORSTAL'); assert.equal(registerName('Gaz Instal S.R.L.'), 'Gaz Instal'); assert.equal(registerName('ALFA & BETA S.A.'), 'ALFA & BETA')
})
test('decodeVerified ignores malformed items; activeVerified drops expired ones', () => {
  const ok = 'ANRE|PDIB|1|2022-07-07|2027-07-06|2026-10-18|Adrian|MELIORSTAL', old = 'ANRE|EDIB|2|2015-01-01|2020-01-01|2026-10-18|Adrian|MELIORSTAL'
  const d = decodeVerified([ok, old, 'nope', '{"x":1}', 'ANRE|PDIB|x|2022-07-07|2027-07-06|a|b|c', 5, null]); assert.equal(d.length, 2); assert.deepEqual([d[0]!.verifiedBy, d[0]!.operator], ['Adrian', 'MELIORSTAL'])
  assert.deepEqual(activeVerified(d, new Date('2026-10-18')).map((a) => a.number), ['1'])
  assert.deepEqual(decodeVerified(undefined), [])
})

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../service'), A: typeof import('../../admin/service')
const NOW = new Date('2026-10-18T10:00:00Z')
const op = (o: object = {}) => ({ ref: 'REF1', name: 'MELIORSTAL', address: 'Aleea Pietei, nr. 3, Videle', locality: 'Videle', county: 'Teleorman', phone: '', representative: 'Cosmin Ionut OLTEANU', authorizations: parseAuthorizations(DETALIU), ...o })
const deps = (operators = [op()]) => ({ search: async (q: string, _county?: string) => operators.filter((o) => o.name.includes(q.toUpperCase())), resolve: async (ref: string) => operators.find((o) => o.ref === ref) ?? null })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../service'); A = await import('../../admin/service')
  await db.$executeRawUnsafe(`TRUNCATE "Activity","WebsiteEntry","WebsiteCollection","WebsiteChannel","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [{ key: 'program', label: 'Program', type: 'text' }] } })
  await db.websiteEntry.create({ data: { id: 'e1', businessLineId: 'bl', collectionId: 'c', slug: 'm', title: 'MELIORSTAL SRL', status: 'preview', data: { program: 'L-V' } } })
})
after(async () => { if (db) await db.$disconnect() })

test('search suggests candidates from the register without saving anything', { skip }, async () => {
  const r = await S.searchAnre('bl', 'e1', undefined, undefined, deps() as any)
  assert.equal(r.query, 'MELIORSTAL'); assert.equal(r.operators[0]!.representative, 'Cosmin Ionut OLTEANU'); assert.deepEqual(r.current, [])
  assert.equal(((await db.websiteEntry.findUnique({ where: { id: 'e1' } })).data as any).autorizatii_verificate, undefined)
  await assert.rejects(S.searchAnre('bl', 'nope', undefined, undefined, deps() as any), /nu există/)
})
test('confirm stores only valid granted authorizations, re-read from the register, declares the field and logs who verified', { skip }, async () => {
  const r = await S.confirmAnre('bl', 'e1', 'REF1', { id: 'u1', name: 'Adrian' }, deps() as any, NOW)
  assert.deepEqual(r.verified.map((a) => [a.type, a.number]), [['PDSB', '20939'], ['PDIB', '21213']])   // the expired EDIB is not stored
  const e = await db.websiteEntry.findUnique({ where: { id: 'e1' } })
  const stored = S.decodeVerified((e.data as any).autorizatii_verificate); assert.deepEqual([stored.length, stored[0]!.verifiedBy, stored[0]!.verifiedAt], [2, 'Adrian', NOW.toISOString().slice(0, 10)]); assert.equal((e.data as any).program, 'L-V')
  assert.ok(((await db.websiteCollection.findUnique({ where: { id: 'c' } })).fields as any[]).some((f) => f.key === 'autorizatii_verificate'))
  const act = await db.activity.findFirst({ where: { action: 'authorizations_verified' } }); assert.equal(act.details.operator, 'MELIORSTAL')
  // saving the entry from the admin keeps them (the field is declared now)
  await A.updateEntry('bl', 'e1', { summary: 'x'.repeat(80) }); assert.equal(S.decodeVerified(((await db.websiteEntry.findUnique({ where: { id: 'e1' } })).data as any).autorizatii_verificate).length, 2)
  await A.updateEntry('bl', 'e1', { data: { ...(e.data as object), program: 'L-V 9-17' } }); assert.equal(S.decodeVerified(((await db.websiteEntry.findUnique({ where: { id: 'e1' } })).data as any).autorizatii_verificate).length, 2)
})
test('confirming again replaces the ANRE items; unknown operator or no valid authorization is refused; removing works', { skip }, async () => {
  await S.confirmAnre('bl', 'e1', 'REF1', { name: 'Adrian' }, deps([op({ authorizations: parseAuthorizations(DETALIU).filter((a) => a.type === 'PDIB') })]) as any, NOW)
  assert.deepEqual(S.decodeVerified(((await db.websiteEntry.findUnique({ where: { id: 'e1' } })).data as any).autorizatii_verificate).map((a) => a.number), ['21213'])
  await assert.rejects(S.confirmAnre('bl', 'e1', 'NOPE', {}, deps() as any, NOW), /nu există în registrul/)
  await assert.rejects(S.confirmAnre('bl', 'e1', 'REF1', {}, deps([op({ authorizations: parseAuthorizations(DETALIU).filter((a) => a.type === 'EDIB') })]) as any, NOW), /nu are autorizații valide/)
  await assert.rejects(S.removeVerified('bl', 'e1', '000', {}), /nu există/)
  await S.removeVerified('bl', 'e1', '21213', { name: 'Adrian' }); assert.deepEqual(S.decodeVerified(((await db.websiteEntry.findUnique({ where: { id: 'e1' } })).data as any).autorizatii_verificate), [])
})
