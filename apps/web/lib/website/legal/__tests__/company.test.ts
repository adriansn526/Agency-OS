import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildLegalCompany } from '../company'
import { channelPatch } from '../../admin/schemas'

const S = { name: 'ASNS', legalName: 'ADVANCED SYSTEMS & NETWORK SOLUTIONS SRL', cif: ' RO18890424 ', regCom: 'J40/12223/2006', address: 'Sos. Berceni,   Nr.39, Sector 4', email: 'office@asns.ro' }

test('legal company: legal name, tidy whitespace, the line\'s email wins over the company email', () => {
  assert.deepEqual(buildLegalCompany(S, 'parteneri@intraconstruct.ro'), { name: 'ADVANCED SYSTEMS & NETWORK SOLUTIONS SRL', cui: 'RO18890424', reg: 'J40/12223/2006', address: 'Sos. Berceni, Nr.39, Sector 4', email: 'parteneri@intraconstruct.ro' })
  assert.equal(buildLegalCompany(S).email, 'office@asns.ro'); assert.equal(buildLegalCompany(S, '   ').email, 'office@asns.ro')
})
test('missing settings give empty strings, never the word undefined', () => {
  assert.deepEqual(buildLegalCompany(null), { name: '', cui: '', reg: '', address: '', email: '' })
  assert.equal(buildLegalCompany({ name: 'ASNS' }).name, 'ASNS')                       // falls back to the short name when there is no legal name
  assert.deepEqual(buildLegalCompany({ cif: 5 as never, regCom: {} as never }), { name: '', cui: '', reg: '', address: '', email: '' })
})
test('the contact email setting must be an email (or null to clear)', () => {
  assert.deepEqual(channelPatch.parse({ legalEmail: 'parteneri@intraconstruct.ro' }), { legalEmail: 'parteneri@intraconstruct.ro' })
  assert.deepEqual(channelPatch.parse({ legalEmail: null }), { legalEmail: null })
  assert.equal(channelPatch.safeParse({ legalEmail: 'nu e email' }).success, false)
})
