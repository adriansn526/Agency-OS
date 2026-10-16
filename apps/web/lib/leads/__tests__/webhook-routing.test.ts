/** Run with: npx tsx --test lib/leads/__tests__/*.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDomain, resolveWebhookTarget } from '../webhook-routing'

const cfg = (...types: [string, string[]][]) => ({
  entityTypes: types.map(([id, stages]) => ({ id, pipeline: stages.map((key) => ({ key })) })),
})
const agency = { id: 'bl_agency', domain: null, config: cfg(['clients', ['nou', 'contactat']]) }
const itc = {
  id: 'bl_itc',
  domain: 'intraconstruct.ro',
  config: cfg(['cereri_oferta', ['cerere_noua', 'trimisa']], ['parteneri', ['prospect', 'activ']]),
}
const client = { businessLineId: 'bl_agency', entityType: 'clients' }

test('routes by key domain to the matching line, ignoring the client line', () => {
  const t = resolveWebhookTarget({ keyDomain: 'intraconstruct.ro', client, lines: [agency, itc], requestedEntityType: 'cereri_oferta' })
  assert.deepEqual(t, { businessLineId: 'bl_itc', entityType: 'cereri_oferta', status: 'cerere_noua', via: 'domain' })
})

test('matches domain regardless of www, case and protocol', () => {
  assert.equal(normalizeDomain('https://WWW.IntraConstruct.ro/'), 'intraconstruct.ro')
  const t = resolveWebhookTarget({ keyDomain: 'www.intraconstruct.ro', client, lines: [agency, itc], requestedEntityType: 'parteneri' })
  assert.equal(t.businessLineId, 'bl_itc')
  assert.equal(t.status, 'prospect')
})

test('ignores an entity type the line does not define', () => {
  const t = resolveWebhookTarget({ keyDomain: 'intraconstruct.ro', client, lines: [agency, itc], requestedEntityType: 'clients' })
  assert.equal(t.entityType, 'cereri_oferta') // first type of the line, not the unknown request
})

test('falls back to the client line and type when no line owns the domain', () => {
  const t = resolveWebhookTarget({ keyDomain: 'inchideriterase.ro', client, lines: [agency, itc] })
  assert.deepEqual(t, { businessLineId: 'bl_agency', entityType: 'clients', status: 'nou', via: 'client' })
})

test('keeps the legacy behaviour when the line config is unreadable', () => {
  const t = resolveWebhookTarget({ keyDomain: 'x.ro', client, lines: [{ id: 'bl_agency', domain: null, config: null }] })
  assert.deepEqual(t, { businessLineId: 'bl_agency', entityType: 'clients', status: 'nou', via: 'client' })
})
