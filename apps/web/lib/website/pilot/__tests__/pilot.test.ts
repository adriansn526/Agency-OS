import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { assertOutsideRepo, CALL_COLUMNS, csvCell, PILOT_FIELDS, SEGMENT_FILTERS, toCsv, type CallRow } from '../setup'

test('csv cells: quoting, and no spreadsheet formulas from data', () => {
  assert.equal(csvCell('simplu'), 'simplu'); assert.equal(csvCell('cu, virgulă'), '"cu, virgulă"'); assert.equal(csvCell('ghilimele "x"'), '"ghilimele ""x"""'); assert.equal(csvCell(null), '')
  for (const evil of ['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)']) assert.ok(csvCell(evil).replace(/^"/, '').startsWith("'"), evil)
  assert.equal(csvCell('07 numar'), '07 numar')
})
test('the call list never goes inside the repository', () => {
  const root = '/home/asns/projects/AdvancedSystems/agency-os'
  assert.throws(() => assertOutsideRepo(path.join(root, 'docs/lista.csv'), root), /nu o scriu în repo/)
  assert.throws(() => assertOutsideRepo(root, root), /nu o scriu în repo/)
  assert.throws(() => assertOutsideRepo(root + '/../agency-os/x.csv', root), /nu o scriu în repo/)       // a path that only looks outside
  assert.equal(assertOutsideRepo('/home/asns/data/privat/pilot.csv', root), '/home/asns/data/privat/pilot.csv')
  assert.equal(assertOutsideRepo('/home/asns/projects/AdvancedSystems/agency-os-other/x.csv', root), '/home/asns/projects/AdvancedSystems/agency-os-other/x.csv') // a sibling folder is fine
})
test('the sheet has the columns the caller fills in (consent and outcome) and a BOM for Excel', () => {
  const row = Object.fromEntries(CALL_COLUMNS.map((c) => [c, ''])) as unknown as CallRow
  const csv = toCsv([{ ...row, firma: 'FIRMA, SRL', telefon: '0730111111' }])
  assert.ok(csv.startsWith('﻿firma,telefon,')); assert.match(csv, /acord_sms,acord_email,rezultat_apel,data_apel\n/); assert.ok(csv.includes('"FIRMA, SRL",0730111111'))
})
test('pilot fields and segment filters line up (the segment reads the same keys the CRM fields write)', () => {
  assert.deepEqual(PILOT_FIELDS.map((f) => f.key), ['acord_sms', 'acord_email', 'rezultat_apel', 'data_apel', 'alte_portaluri', 'alte_portaluri_nume', 'alte_portaluri_motiv'])
  for (const f of SEGMENT_FILTERS) { assert.ok(f.field.startsWith('cf.')); assert.equal(f.operator, 'equals') }
  assert.deepEqual(SEGMENT_FILTERS.map((f) => f.field), ['cf.pilot', 'cf.acord_sms'])
  assert.deepEqual(PILOT_FIELDS.find((f) => f.key === 'acord_sms')!.options, ['da', 'nu'])   // the segment value 'da' is one of the choices
})
