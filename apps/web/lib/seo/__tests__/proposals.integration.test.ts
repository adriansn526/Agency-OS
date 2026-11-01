/** DB-backed check of the proposals API (dashboard + tenant). Needs SEO_PROPOSALS_TEST_DATABASE_URL = a SCRATCH database with the full schema. */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.SEO_PROPOSALS_TEST_DATABASE_URL
const skip = !URL_ || /\/agency_os(\?|$)/.test(URL_) ? 'set SEO_PROPOSALS_TEST_DATABASE_URL to a scratch database (never agency_os)' : false
if (URL_ && !skip) process.env.DATABASE_URL = URL_
let db: any, dash: any, ten: any
let projectId = ''
const { NextRequest } = await import('next/server')
const req = (method: string, body?: any, headers: Record<string, string> = {}, qs = '') =>
  new NextRequest('http://x/api' + qs, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json', ...headers } })

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db'))
  dash = await import('../../../app/api/seo/proposals/route'); ten = await import('../../../app/api/tenant-seo/proposals/route')
  await db.$executeRawUnsafe(`TRUNCATE "Project","TenantInstance" CASCADE`)
  await db.tenantInstance.create({ data: { id: 't1', tenantId: 't1', tenantName: 'Z', tenantSlug: 'zoana-partners', licenseKey: 'KEY1' } })
  await db.tenantInstance.create({ data: { id: 't2', tenantId: 't2', tenantName: 'Other', tenantSlug: 'other', licenseKey: 'KEY2' } })
  await db.$executeRawUnsafe(`TRUNCATE "BusinessLine" CASCADE`)
  const bl = await db.businessLine.create({ data: { name: 'SEO', slug: 'seo-t', icon: 'x', color: '#000', config: {} } })
  const cl = await db.client.create({ data: { companyName: 'C', businessLineId: bl.id, entityType: 'pj', contactPerson: 'P', email: 'c@example.invalid' } })
  const p = await db.project.create({ data: { name: 'SEO', businessLineId: bl.id, clientId: cl.id, templateId: 'seo_project', metadata: { tenantSlug: 'zoana-partners', other: 1 } } })
  projectId = p.id
})
after(async () => { if (db) await db.$disconnect() })

test('dashboard add / dedupe / patch / delete keeps other metadata', { skip }, async () => {
  let r = await dash.POST(req('POST', { projectId, proposals: [
    { mainTerm: 'fals intelectual', mainVolume: 720, longTails: [{ term: 'falsul intelectual', volume: 100 }] },
    { mainTerm: 'Fals Intelectual' }, { mainTerm: 'control judiciar', mainVolume: 1300 },
  ] }))
  assert.deepEqual((await r.json()).data, { added: 2, skipped: 1 })
  const list = (await (await dash.GET(req('GET', undefined, {}, `?projectId=${projectId}`))).json()).data
  assert.equal(list.length, 2); assert.equal(list[0].volume, 820); assert.equal(list[0].clicks, 66)
  r = await dash.PATCH(req('PATCH', { projectId, id: list[1].id, status: 'respins' })); assert.equal(r.status, 200)
  r = await dash.PATCH(req('PATCH', { projectId, id: 'nope', status: 'publicat' })); assert.equal(r.status, 404)
  r = await dash.PATCH(req('PATCH', { projectId, id: list[0].id, status: 'zzz' })); assert.equal(r.status, 400)
  assert.equal((await db.project.findUnique({ where: { id: projectId } })).metadata.other, 1)
})

test('concurrent adds do not lose writes', { skip }, async () => {
  await Promise.all(Array.from({ length: 6 }, (_, i) => dash.POST(req('POST', { projectId, proposal: { mainTerm: `termen ${i}`, mainVolume: 10 } }))))
  const list = (await (await dash.GET(req('GET', undefined, {}, `?projectId=${projectId}`))).json()).data
  assert.equal(list.length, 8)
})

test('tenant sees only its project, hides rejected, can claim and publish', { skip }, async () => {
  assert.equal((await ten.GET(req('GET'))).status, 401)
  assert.equal((await ten.GET(req('GET', undefined, { 'x-license-key': 'bad' }))).status, 403)
  assert.equal((await ten.GET(req('GET', undefined, { 'x-license-key': 'KEY2' }))).status, 404)
  const h = { 'x-license-key': 'KEY1' }
  const list = (await (await ten.GET(req('GET', undefined, h))).json()).data
  assert.equal(list.length, 7); assert.ok(!list.some((p: any) => p.status === 'respins'))
  assert.equal(list.find((p: any) => p.mainTerm === 'fals intelectual').volume, 820)
  const id = list[0].id
  let r = await ten.PATCH(req('PATCH', { id, status: 'in_lucru', claimedBy: 'av. Matei' }, h))
  assert.equal((await r.json()).data.claimedBy, 'av. Matei')
  r = await ten.PATCH(req('PATCH', { id, status: 'respins' }, h)); assert.equal(r.status, 400)
  r = await ten.PATCH(req('PATCH', { id, status: 'propus' }, h)); assert.equal((await r.json()).data.claimedBy, undefined)
})
