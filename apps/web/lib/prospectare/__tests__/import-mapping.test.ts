/** Run with: npx tsx --test lib/prospectare/__tests__/import-mapping.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyOverlap, mapRow, nationalPhone, type CsvRow } from '../import-mapping'

const ctx = { businessLineId: 'bl_itc', entityType: 'parteneri', status: 'prospect', source: 'prospectare_risco' }
const detail = {
  telefoane: [{ numar: '0721330045', tip: 'mobil' }, { numar: '0726727471', tip: 'mobil' }], persoane: [{ nume: 'Bindea Ioan Adrian', roluri: ['Administrator'] }],
  forma_juridica: 'SA', activa: true, inactiv_fiscal: false, platitor_tva: true, persoana_fizica: false, profit_net: 5400000, an_financiar: 2020,
  caen: { status: 'ok', sectiune: 'Construcții', diviziune: 43, segment: 'lucrari_speciale', specializare: 'Instalații sanitare, termice, climatizare' },
  adresa: { regiune: 'București-Ilfov', sector: 2, cod_postal: '021123', judet_sursa: 'adresa' },
  benzi: { angajati: '50-249 (medie)', cifra_afaceri: '>10M', vechime: '20+ ani' },
  contactabilitate: { are_mobil: true, are_email_propriu_domeniu: true, nr_persoane: 1, canal_recomandat: 'email' },
  etichete: { pagini_aurii: [{ listing_id: 'L1' }], fonduri_digitalizare: [{ ajutor_ron: 100000 }, { ajutor_ron: 50000 }] },
  probleme: ['contact_partajat', 'adresa_trunchiata'],
}
const full = (over: Partial<CsvRow> = {}): CsvRow => ({
  externalSource: 'prospectare-2026-10', externalId: '159', entityType: 'parteneri', status: 'prospect', companyName: 'FRIGOTEHNICA S.A.', contactPerson: 'Bindea Ioan Adrian', contactRole: 'Administrator',
  email: 'office@frigotehnica.ro', email2: 'costin.fratila@frigotehnica.ro', phone: '0721330045', phone2: '0726727471', phone3: '', website: 'https://frigotehnica.ro', cui: '159', city: 'București', county: 'București',
  address: 'Bucuresti Sectorul 2, Str. DELEA VECHE, Nr. 24', industry: 'Lucrări speciale de construcții', activityDomain: 'Instalații sanitare, termice, climatizare', caenCode: '4322',
  caenDescription: 'Lucrari de instalatii sanitare', revenue: '126319079', employees: '127', companyStatus: 'Funcțiune', foundedYear: '1991', optOut: 'false', customFields: JSON.stringify(detail),
  _email_lipsa: 'false', _telefon_lipsa: 'false', ...over,
})
const ok = (row: CsvRow) => { const r = mapRow(row, ctx); assert.equal(r.ok, true, JSON.stringify(r)); return r as Extract<ReturnType<typeof mapRow>, { ok: true }> }

test('a complete row keeps its values and gets the line, type, status and source', () => {
  const { lead, warnings } = ok(full())
  assert.deepEqual([lead.businessLineId, lead.entityType, lead.status, lead.source], ['bl_itc', 'parteneri', 'prospect', 'prospectare_risco'])
  assert.deepEqual([lead.externalSource, lead.externalId, lead.companyName, lead.cui], ['prospectare-2026-10', '159', 'FRIGOTEHNICA S.A.', '159'])
  assert.deepEqual([lead.email, lead.email2, lead.phone, lead.phone2, lead.phone3], ['office@frigotehnica.ro', 'costin.fratila@frigotehnica.ro', '0721330045', '0726727471', null])
  assert.deepEqual([lead.revenue, lead.employees, lead.foundedYear, lead.optOut], [126319079, 127, 1991, false])
  assert.deepEqual(warnings, [])
})

test("missing email and contact person are 'N/A'; missing phone is NULL, never text", () => {
  const { lead } = ok(full({ email: '', email2: '', contactPerson: '', contactRole: '', phone: '', phone2: '' }))
  assert.deepEqual([lead.email, lead.email2, lead.contactPerson, lead.contactRole, lead.phone, lead.phone2], ['N/A', null, 'N/A', null, null, null])
})

test('fara_contact only when there is neither a phone nor a real email', () => {
  const none = ok(full({ email: '', email2: '', phone: '', phone2: '' }))
  assert.equal((none.lead.customFields as any).fara_contact, 'da')
  assert.equal((ok(full({ email: '', email2: '', phone: '0721330045' })).lead.customFields as any).fara_contact, 'nu')
  assert.equal((ok(full({ phone: '', phone2: '' })).lead.customFields as any).fara_contact, 'nu') // has emails
  assert.equal((ok(full({ email: 'N/A', email2: '', phone: '', phone2: '' })).lead.customFields as any).fara_contact, 'da') // 'N/A' is not an email
})

test('segmentation criteria are flat strings/numbers at the top level; the full record sits under detalii', () => {
  const cf = ok(full()).lead.customFields as Record<string, any>
  assert.deepEqual([cf.regiune, cf.segment_caen, cf.specializare, cf.banda_angajati, cf.banda_cifra_afaceri, cf.banda_vechime, cf.forma_juridica],
    ['București-Ilfov', 'lucrari_speciale', 'Instalații sanitare, termice, climatizare', '50-249 (medie)', '>10M', '20+ ani', 'SA'])
  assert.deepEqual([cf.activa, cf.are_mobil, cf.are_email, cf.are_email_domeniu_propriu, cf.canal_recomandat, cf.nr_telefoane, cf.contact_partajat, cf.pagini_aurii, cf.fonduri_digitalizare, cf.fonduri_digitalizare_ron],
    ['da', 'da', 'da', 'da', 'email', 2, 'da', 'da', 'da', 150000])
  for (const [k, v] of Object.entries(cf)) if (k !== 'detalii') assert.ok(typeof v === 'string' || typeof v === 'number', `${k} must be a string or number, got ${typeof v}`)
  assert.equal(cf.detalii.forma_juridica, 'SA'); assert.deepEqual(cf.detalii.telefoane.length, 2)
  assert.equal(cf.probleme, 'contact_partajat,adresa_trunchiata'); assert.equal(cf.adresa_trunchiata, 'da')
})

test('empty criteria are omitted instead of stored as empty strings', () => {
  const cf = ok(full({ customFields: JSON.stringify({}) })).lead.customFields as Record<string, any>
  assert.equal('regiune' in cf, false); assert.equal('specializare' in cf, false); assert.equal(cf.activa, 'nu'); assert.equal(cf.suprapunere_crm, 'nu')
})

test('invalid rows are rejected with a reason', () => {
  for (const [row, reason] of [[full({ companyName: '' }), 'fără denumire'], [full({ companyName: '   ' }), 'fără denumire'], [full({ externalId: '' }), 'fără externalId / externalSource'],
                               [full({ externalSource: '' }), 'fără externalId / externalSource'], [full({ customFields: '{not json' }), 'customFields nu e JSON valid'],
                               [full({ customFields: '[1,2]' }), 'customFields nu e JSON valid']] as const) {
    const r = mapRow(row, ctx); assert.deepEqual([r.ok, (r as any).reason], [false, reason])
  }
})

test('bad optional values become null with a warning, the row is still imported', () => {
  const { lead, warnings } = ok(full({ revenue: 'abc', employees: '12x', foundedYear: '', phone: '123', email: 'nu-e-email' }))
  assert.deepEqual([lead.revenue, lead.employees, lead.foundedYear, lead.phone, lead.email], [null, null, null, null, 'N/A'])
  assert.ok(warnings.some((w) => w.includes('revenue')) && warnings.some((w) => w.includes('employees')) && warnings.some((w) => w.includes('telefon')) && warnings.some((w) => w.includes('email')))
})

test('phones are normalised to the national 10-digit form', () => {
  for (const [raw, want] of [['0721330045', '0721330045'], ['+40 721 330 045', '0721330045'], ['0040721330045', '0721330045'], ['021.311.45.00', '0213114500']] as const) assert.equal(nationalPhone(raw), want, raw)
  for (const raw of ['', null, undefined, '123', 'N/A', '07213300451']) assert.equal(nationalPhone(raw as string), null, String(raw))
})

test('the keys used to detect CRM overlaps are normalised and lower-cased', () => {
  const { keys } = ok(full({ email: 'Office@Frigotehnica.RO', phone: '+40 721 330 045' }))
  assert.deepEqual(keys, { phones: ['0721330045', '0726727471'], emails: ['office@frigotehnica.ro', 'costin.fratila@frigotehnica.ro'], cui: '159' })
})

test('applyOverlap marks the lead and keeps at most five matches', () => {
  const { lead } = ok(full())
  applyOverlap(lead, [])
  assert.equal((lead.customFields as any).suprapunere_crm, 'nu')
  applyOverlap(lead, Array.from({ length: 7 }, (_, i) => ({ leadId: `l${i}`, linie: i % 2 ? 'agency' : 'climaticpro', tip: 'clients', potrivire: 'telefon' })))
  const cf = lead.customFields as any
  assert.deepEqual([cf.suprapunere_crm, cf.suprapunere_crm_linii, cf.detalii.suprapunere_crm.length], ['da', 'agency,climaticpro', 5])
  assert.equal(cf.detalii.forma_juridica, 'SA') // the rest of the detail survives
})
