/**
 * Database-backed checks of the lead importer. Skipped unless IMPORT_TEST_DATABASE_URL points at a SCRATCH database with the FULL schema
 * (docker exec agency-os-postgres pg_dump -U agency_os -d agency_os -s | psql … scratch). It deletes leads: never production.
 *
 *   IMPORT_TEST_DATABASE_URL=postgresql://…/scratch npx tsx --test lib/prospectare/__tests__/import-leads.integration.test.ts
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const URL_ = process.env.IMPORT_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_

let db: any, imp: typeof import('../import-leads'), file = '', limitFile = ''

const COLS = ['externalSource', 'externalId', 'entityType', 'status', 'companyName', 'contactPerson', 'contactRole', 'email', 'email2', 'phone', 'phone2', 'phone3', 'website', 'cui', 'city', 'county', 'address',
  'industry', 'activityDomain', 'caenCode', 'caenDescription', 'revenue', 'employees', 'companyStatus', 'foundedYear', 'optOut', 'customFields', '_email_lipsa', '_telefon_lipsa']
const q = (v: unknown) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const row = (o: Record<string, string>) => COLS.map((c) => q(({ externalSource: 'prospectare-2026-10', entityType: 'parteneri', status: 'prospect', optOut: 'false', customFields: '{}', ...o } as Record<string, string>)[c])).join(',')
const detail = JSON.stringify({ forma_juridica: 'SRL', activa: true, caen: { sectiune: 'Construcții', segment: 'lucrari_speciale', specializare: 'Instalații electrice' }, adresa: { regiune: 'Transilvania' },
  benzi: { angajati: '1-9 (micro)', cifra_afaceri: '500k-2M', vechime: '10-20 ani' }, contactabilitate: { are_mobil: true, nr_persoane: 1, canal_recomandat: 'mobil' }, probleme: ['contact_partajat'], telefoane: [{ numar: '0740111111' }] })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db'))
  imp = await import('../import-leads')
  await db.$executeRawUnsafe(`TRUNCATE "Activity","CampaignLead","Communication","Lead","BusinessLine" CASCADE`)
  const mk = (id: string, types: unknown) => db.businessLine.create({ data: { id, slug: id, name: id.toUpperCase(), icon: 'x', color: '#000', config: { entityTypes: types } } })
  await mk('itc', [{ id: 'parteneri', name: 'Partener', namePlural: 'Parteneri', icon: 'x', financialFlow: 'income', customFields: [], pipeline: [{ key: 'prospect', label: 'Prospect', color: 'info' }, { key: 'activ', label: 'Activ', color: 'success' }] }])
  await mk('agency', [{ id: 'clients', name: 'Client', namePlural: 'Clienți', icon: 'x', financialFlow: 'income', customFields: [], pipeline: [{ key: 'nou', label: 'Nou', color: 'info' }] }])
  await mk('climaticpro', [])
  const base = { entityType: 'clients', status: 'nou', contactPerson: 'x' }
  await db.lead.createMany({ data: [
    { ...base, businessLineId: 'agency', companyName: 'Existent după CUI', email: 'a@a.ro', cui: '777' },
    { ...base, businessLineId: 'agency', companyName: 'Existent după telefon', email: 'b@b.ro', phone: '+40 722 111 222' },
    { ...base, businessLineId: 'climaticpro', companyName: 'Existent după email', email: 'dup@x.ro', phone: 'N/A' },
    // same import source and id as a CSV row: must be skipped, and must not count as an overlap
    { ...base, businessLineId: 'itc', entityType: 'parteneri', status: 'prospect', companyName: 'Deja importat', email: 'N/A', source: 'prospectare_risco', externalSource: 'prospectare-2026-10', externalId: '110', cui: '110', phone: '0749999999' },
  ] })
  const rows = [
    row({ externalId: '100', companyName: 'FIRMA A SRL', contactPerson: 'Ion Popescu', contactRole: 'Administrator', email: 'office@a.ro', phone: '0740111111', cui: '100', county: 'Cluj', city: 'Cluj-Napoca', revenue: '1500000', employees: '5', foundedYear: '2005', customFields: detail }),
    row({ externalId: '101', companyName: 'FIRMA B SRL', cui: '101', customFields: detail }),                                   // no contact at all
    row({ externalId: '102', companyName: 'FIRMA C SRL', phone: '0733000001', cui: '777' }),                                   // overlap by CUI
    row({ externalId: '103', companyName: 'FIRMA D SRL', phone: '0722111222', cui: '103' }),                                   // overlap by phone
    row({ externalId: '104', companyName: 'FIRMA E SRL', email: 'DUP@X.RO', cui: '104' }),                                     // overlap by email (case differs)
    row({ externalId: '105', companyName: '', cui: '105' }),                                                                  // invalid: no name
    row({ externalId: '100', companyName: 'FIRMA A DUPLICAT', cui: '100' }),                                                  // invalid: same id twice in the file
    row({ externalId: '107', companyName: 'FIRMA G SRL', customFields: '{not json', cui: '107' }),                            // invalid: bad JSON
    row({ externalId: '108', companyName: 'FIRMA H SRL', revenue: 'abc', phone: '0733000002', cui: '108' }),                  // imported, with a warning
    row({ externalId: '110', companyName: 'DEJA IMPORTAT SRL', phone: '0749999999', cui: '110' }),                           // already in the CRM from this import
  ]
  file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'imp-')), 'leads.csv')
  fs.writeFileSync(file, '﻿' + COLS.join(',') + '\n' + rows.join('\n') + '\n')
})
after(async () => { if (db) await db.$disconnect() })

const opts = () => ({ file, line: 'itc' })
const count = (where: object = {}) => db.lead.count({ where: { businessLineId: 'itc', ...where } })

test('plan: classifies every row and writes nothing', { skip }, async () => {
  const before = await db.lead.count()
  const p = await imp.planImport(opts())
  assert.equal(p.rowsRead, 10)
  assert.equal(p.toCreate.length, 6)                    // A B C D E H
  assert.equal(p.skippedExisting, 1)                    // 110
  assert.deepEqual(p.invalid.map((i) => [i.externalId, i.reason]).sort(), [['100', 'duplicat în fișier'], ['105', 'fără denumire'], ['107', 'customFields nu e JSON valid']])
  assert.equal(await db.lead.count(), before)           // nothing was written
  assert.equal(p.stats.fara_contact, 1)                 // only B
  assert.equal(p.stats.suprapunere_crm, 3)              // C (cui), D (telefon), E (email)
  assert.deepEqual(p.overlapByLine, { agency: 2, climaticpro: 1 })
  assert.equal(p.warnings['revenue nu e număr: ignorat'], 1)
})

test('mapping of the planned rows: N/A, null phone, overlap flags, no self-overlap', { skip }, async () => {
  const p = await imp.planImport(opts())
  const by = (id: string) => p.toCreate.find((l: any) => l.externalId === id) as any
  assert.equal(by('101').email, 'N/A'); assert.equal(by('101').contactPerson, 'N/A'); assert.equal(by('101').phone, null)
  assert.equal(by('101').customFields.fara_contact, 'da')
  assert.equal(by('100').email, 'office@a.ro'); assert.equal(by('100').contactPerson, 'Ion Popescu'); assert.equal(by('100').phone, '0740111111')
  assert.equal(by('100').customFields.regiune, 'Transilvania'); assert.equal(by('100').customFields.suprapunere_crm, 'nu')
  assert.equal(by('102').customFields.suprapunere_crm, 'da'); assert.equal(by('102').customFields.suprapunere_crm_linii, 'agency')
  assert.equal(by('103').customFields.suprapunere_crm_linii, 'agency')
  assert.equal(by('104').customFields.suprapunere_crm_linii, 'climaticpro')
  assert.equal(by('108').revenue, null)
  assert.equal(p.toCreate.some((l: any) => l.externalId === '110'), false)
})

test('target validation: unknown line, entity type and stage are refused', { skip }, async () => {
  await assert.rejects(imp.planImport({ ...opts(), line: 'nope' }), /nu există/)
  await assert.rejects(imp.planImport({ ...opts(), entityType: 'clients' }), /nu are tipul/)
  await assert.rejects(imp.planImport({ ...opts(), status: 'zzz' }), /nu are etapa/)
})

test('confirm guard', () => {
  assert.throws(() => imp.checkConfirm(6, undefined), /--confirm-count=6/)
  assert.throws(() => imp.checkConfirm(6, '7'), /nu corespunde/)
  assert.throws(() => imp.checkConfirm(6, '6x'), /nu corespunde/)
  assert.doesNotThrow(() => imp.checkConfirm(6, '6'))
})

test('apply creates the planned rows; a re-run adds nothing', { skip }, async () => {
  const before = await count()
  const p = await imp.planImport(opts())
  const r = await imp.applyImport(p, { batchSize: 2 })
  assert.deepEqual(r, { created: 6, planned: 6 })
  assert.equal(await count(), before + 6)
  const a = await db.lead.findFirst({ where: { externalId: '100', businessLineId: 'itc' } })
  assert.equal(a.entityType, 'parteneri'); assert.equal(a.status, 'prospect'); assert.equal(a.source, 'prospectare_risco'); assert.equal(a.revenue, 1500000)
  const p2 = await imp.planImport(opts())
  assert.equal(p2.toCreate.length, 0); assert.equal(p2.skippedExisting, 7)
  assert.equal((await imp.applyImport(p2)).created, 0)
  assert.equal(await count(), before + 6)
  // the rows of this import no longer count as CRM overlaps of themselves
  assert.equal(p2.stats.suprapunere_crm, 0)
})

test('rollback skips touched leads and is a dry run without apply', { skip }, async () => {
  const edited = await db.lead.findFirstOrThrow({ where: { externalId: '100', businessLineId: 'itc' } })
  await db.lead.update({ where: { id: edited.id }, data: { notes: 'sunat' } })
  const withAct = await db.lead.findFirstOrThrow({ where: { externalId: '101', businessLineId: 'itc' } })
  await db.activity.create({ data: { leadId: withAct.id, action: 'note', entityType: 'lead', entityId: withAct.id, entityName: 'x' } })
  const args = { line: 'itc', source: 'prospectare_risco', externalSource: 'prospectare-2026-10', status: 'prospect' }
  const dry = await imp.rollbackImport({ ...args, apply: false })
  assert.equal(dry.deleted, 0); assert.equal(dry.touchedReasons['editat (note/responsabil/acțiune)'], 1); assert.equal(dry.touchedReasons['activități'], 1)
  const total = await count()
  const real = await imp.rollbackImport({ ...args, apply: true })
  assert.equal(real.deleted, real.deletable)
  assert.equal(await count(), total - real.deleted)
  assert.ok((await count({ id: edited.id })) === 1)                   // edited lead survives
  assert.equal(await count({ id: withAct.id }), 1)                    // lead with activity survives
})
