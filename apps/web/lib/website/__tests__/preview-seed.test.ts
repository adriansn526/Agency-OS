import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPreviewEntry, richness, segmentWhere, type SeedLead } from '../preview-seed'

const lead = (o: Partial<SeedLead> = {}): SeedLead => ({
  id: 'l1', companyName: 'FIRMA TEST SRL', email: 'office@test.ro', phone: '0740111111', website: 'test.ro', cui: '123', city: 'București', county: 'București', address: 'Str. X 1',
  foundedYear: 2005, employees: 5, revenue: 1000, externalId: '123', caenDescription: null,
  customFields: { specializare: 'Instalații electrice', regiune: 'București-Ilfov', banda_angajati: '1-9 (micro)', forma_juridica: 'SRL', are_email_domeniu_propriu: 'da' }, ...o,
})

test('entry uses only CRM data and is a private preview', () => {
  const e = buildPreviewEntry(lead(), 'firma-test-bucuresti')!
  assert.equal(e.status, 'preview'); assert.equal(e.verified, false)
  assert.equal(e.summary, 'FIRMA TEST SRL este o firmă de construcții din București, cu activitate în: instalații electrice.') // county equal to city is not repeated
  assert.equal(e.websiteUrl, 'https://test.ro'); assert.equal(e.data.an_infiintare, 2005); assert.equal(e.externalId, '123')
})
test('placeholder emails and unusable names are dropped', () => {
  assert.equal(buildPreviewEntry(lead({ email: 'N/A' }), 's')!.email, null)
  assert.equal(buildPreviewEntry(lead({ email: 'x@formular.ro' }), 's')!.email, null)
  assert.equal(buildPreviewEntry(lead({ companyName: ' ' }), 's'), null)
})
test('richness grows with the available data', () => {
  assert.ok(richness(lead()) > richness(lead({ website: null, email: 'N/A', address: null, customFields: {} })))
})
test('segment filters keep their meaning, unsupported ones are refused', () => {
  const w = segmentWhere('bl', [{ field: 'cf.forma_juridica', operator: 'contains', value: 'SRL' }, { field: 'cf.are_mobil', operator: 'equals', value: 'da' }]) as any
  assert.equal(w.AND.length, 5)
  assert.deepEqual(w.AND[3], { customFields: { path: ['forma_juridica'], string_contains: 'SRL' } })
  assert.throws(() => segmentWhere('bl', [{ field: 'city', operator: 'equals', value: 'x' }]), /nesuportat/)
  assert.throws(() => segmentWhere('bl', [{ field: 'cf.a', operator: 'in', value: 'x' }]), /nesuportat/)
})
