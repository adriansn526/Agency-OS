/** HTTP-level checks of /api/storefront/website/partner/*: key + session header, no secrets in responses. Needs PARTNER_ROUTES_TEST_DATABASE_URL = a SCRATCH database (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.PARTNER_ROUTES_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, key = '', session = '', routes: Record<string, any> = {}

const call = (route: any, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', o: { key?: string | null; session?: string; body?: unknown; params?: Record<string, string>; url?: string } = {}) => {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (o.key !== null) headers.authorization = `Bearer ${o.key ?? key}`
  if (o.session) headers['x-partner-session'] = o.session
  return route[method](new Request(o.url ?? 'http://x/api', { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) }), { params: Promise.resolve(o.params ?? {}) }) as Promise<Response>
}

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db'))
  const { generateWebsiteKey } = await import('../../storefront/keys'); const { invalidateWebsiteKeyCache } = await import('../../storefront/auth')
  const { hashLoginLink } = await import('../auth')
  routes = {
    verify: await import('../../../../app/api/storefront/website/partner/verify/route'), me: await import('../../../../app/api/storefront/website/partner/me/route'),
    logout: await import('../../../../app/api/storefront/website/partner/logout/route'), login: await import('../../../../app/api/storefront/website/partner/login/route'),
  }
  await db.$executeRawUnsafe(`TRUNCATE "WebsitePartnerSession","WebsitePartnerLogin","WebsiteEntry","WebsiteCollection","WebsiteChannel","Activity","Lead","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  const g = generateWebsiteKey('t'); key = g.key
  await db.websiteChannel.create({ data: { businessLineId: 'bl', apiKeys: [g.stored], siteUrl: 'https://intraconstruct.ro' } })
  invalidateWebsiteKeyCache()
  const col = await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  await db.websiteEntry.create({ data: { id: 'a', businessLineId: 'bl', collectionId: col.id, slug: 'a', title: 'Firma A', email: 'a@a.ro', status: 'preview', partnerAccess: true, tenantId: 'tn-secret', data: { cui: '111' } } })
  const token = 'pl_' + 'q'.repeat(43)
  await db.websitePartnerLogin.create({ data: { entryId: 'a', channel: 'email', codeHash: hashLoginLink(token), expiresAt: new Date(Date.now() + 600_000) } })
  const r = await call(routes.verify, 'POST', { body: { token, userAgent: 'UA', ip: '1.1.1.1' } })
  assert.equal(r.status, 200); session = (await r.json()).sessionToken
})
after(async () => { if (db) await db.$disconnect() })

test('every route needs the API key; me needs the session too', { skip }, async () => {
  assert.equal((await call(routes.me, 'GET', { key: null, session })).status, 401)
  assert.equal((await call(routes.me, 'GET', { key: 'ws_' + 'z'.repeat(30), session })).status, 401)
  assert.equal((await call(routes.me, 'GET')).status, 401)
  assert.equal((await call(routes.me, 'GET', { session: 'ps_' + 'a'.repeat(43) })).status, 401)
  assert.equal((await call(routes.verify, 'POST', { key: null, body: { token: 'x' } })).status, 401)
})

test('verify: invalid proof is 401 with no detail; login always answers ok', { skip }, async () => {
  const bad = await call(routes.verify, 'POST', { body: { token: 'pl_' + 'w'.repeat(43) } })
  assert.equal(bad.status, 401); assert.deepEqual(await bad.json(), { error: 'invalid_or_expired' })
  const l1 = await call(routes.login, 'POST', { body: { identifier: 'nobody@nowhere.ro' } }), l2 = await call(routes.login, 'POST', { body: { identifier: 'garbage' } }), l3 = await call(routes.login, 'POST', { body: null })
  for (const l of [l1, l2, l3]) { assert.equal(l.status, 200); assert.deepEqual(await l.json(), { ok: true }) }
})

test('me: profile without CRM / ERP ids; edits are live; bad data is 422; locked fields cannot change', { skip }, async () => {
  const me = await call(routes.me, 'GET', { session }); const text = await me.text()
  assert.equal(me.status, 200); assert.ok(!/tn-secret|tenantId|leadId|previewTokenHash|partnerAccess/.test(text)); assert.equal(JSON.parse(text).title, 'Firma A')
  const ok = await call(routes.me, 'PATCH', { session, body: { summary: 'Nou', servicii: ['demolari'] } })
  assert.equal(ok.status, 200); const j = await ok.json(); assert.deepEqual(j.changed.sort(), ['servicii', 'summary']); assert.equal(j.profile.summary, 'Nou')
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'a' } })).summary, 'Nou')
  const bad = await call(routes.me, 'PATCH', { session, body: { title: 'Hack' } }); assert.equal(bad.status, 422)
  assert.equal((await db.websiteEntry.findUnique({ where: { id: 'a' } })).title, 'Firma A')
  assert.equal((await call(routes.me, 'PATCH', { session, body: null })).status, 422)
})

test('logout ends the session', { skip }, async () => {
  assert.equal((await call(routes.logout, 'POST', { session })).status, 200)
  assert.equal((await call(routes.me, 'GET', { session })).status, 401)
})
