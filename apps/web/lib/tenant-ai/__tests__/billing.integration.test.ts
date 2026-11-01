/** DB-backed checks of the billed tenant AI actions. Needs TENANT_AI_TEST_DATABASE_URL = a SCRATCH database with the full schema
 *  (the test truncates the credit tables). The provider call is replaced, so no money is spent. */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.TENANT_AI_TEST_DATABASE_URL
const skip = !URL_ || /\/agency_os(\?|$)/.test(URL_) ? 'set TENANT_AI_TEST_DATABASE_URL to a scratch database (never agency_os)' : false
if (URL_ && !skip) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../service')

const fake = (over: object = {}) => async () => ({
  content: JSON.stringify({ scor_calitate: 70, probleme_juridice: [], lipsuri_de_continut: ['x'], recomandari_seo: [], titluri_alternative: ['a'], rezumat_155_caractere: 'r' }),
  provider: 'gemini' as const, model: 'gemini-3.8-flash', usage: { promptTokens: 1000, completionTokens: 700, thinkingTokens: 1100 },
  finishReason: 'STOP', truncated: false, costUsd: 0.007, ...over,
})

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); S = await import('../service')
  process.env.GEMINI_API_KEY = 'test-key'
  await db.$executeRawUnsafe(`TRUNCATE "CreditUsage","CreditPackage","TenantInstance","CreditPricingRule" CASCADE`)
  await db.creditPricingRule.createMany({ data: [
    { serviceName: 'ai_article_analyze', costPerUnitEur: 0.014, creditsPerUnit: 2, unitDescription: 'analiza' },
    { serviceName: 'ai_article_generate', costPerUnitEur: 0.042, creditsPerUnit: 5, unitDescription: 'generare' },
  ] })
  await db.tenantInstance.create({ data: { id: 't1', tenantId: 't1', tenantName: 'T', tenantSlug: 't1', licenseKey: 'KEY1', balanceCredits: 10 } })
  await db.tenantInstance.create({ data: { id: 't2', tenantId: 't2', tenantName: 'T2', tenantSlug: 't2', licenseKey: 'KEY2', balanceCredits: 2 } })
  await db.tenantInstance.create({ data: { id: 't3', tenantId: 't3', tenantName: 'T3', tenantSlug: 't3', licenseKey: 'KEY3', balanceCredits: 50, status: 'suspended' } })
})
after(async () => { if (db) await db.$disconnect() })

const bal = async (id: string) => (await db.tenantInstance.findUnique({ where: { id } })).balanceCredits

test('successful action charges the rule price and logs real provider cost with thinking tokens', { skip }, async () => {
  const r = await S.runAction('KEY1', 'analyze', { text: 'articol', keyword: 'furt' }, { generate: fake() as any })
  assert.equal(r.credits.charged, 2)
  assert.equal(r.credits.balance, 8)
  assert.equal(await bal('t1'), 8)
  const u = await db.creditUsage.findFirst({ where: { instanceId: 't1' } })
  assert.equal(u.amount, 2); assert.equal(u.type, 'ai'); assert.equal(u.provider, 'gemini'); assert.equal(u.rawCostUsd, 0.007)
  assert.equal(u.metadata.thinkingTokens, 1100)
})

test('invalid or missing license key and suspended tenants are refused', { skip }, async () => {
  await assert.rejects(S.runAction(null, 'analyze', { text: 'x' }, { generate: fake() as any }), { status: 401 })
  await assert.rejects(S.runAction('NOPE', 'analyze', { text: 'x' }, { generate: fake() as any }), { status: 403 })
  await assert.rejects(S.runAction('KEY3', 'analyze', { text: 'x' }, { generate: fake() as any }), { status: 403 })
})

test('not enough credits: refused before calling the provider', { skip }, async () => {
  let called = false
  await assert.rejects(S.runAction('KEY2', 'generate', { topic: 't' }, { generate: (async () => { called = true; return fake()() }) as any }), { status: 402 })
  assert.equal(called, false)
  assert.equal(await bal('t2'), 2)
})

test('truncated, empty or malformed answers are never charged', { skip }, async () => {
  const before_ = await bal('t1')
  await assert.rejects(S.runAction('KEY1', 'analyze', { text: 'x' }, { generate: fake({ truncated: true }) as any }), { status: 502 })
  await assert.rejects(S.runAction('KEY1', 'analyze', { text: 'x' }, { generate: fake({ content: 'nu este json' }) as any }), { status: 502 })
  await assert.rejects(S.runAction('KEY1', 'generate', { topic: 'x' }, { generate: fake({ content: 'scurt' }) as any }), { status: 502 })
  await assert.rejects(S.runAction('KEY1', 'analyze', { text: 'x' }, { generate: (async () => { throw new Error('boom') }) as any }), { status: 502 })
  assert.equal(await bal('t1'), before_)
})

test('parallel requests can never push the balance below zero', { skip }, async () => {
  await db.tenantInstance.update({ where: { id: 't2' }, data: { balanceCredits: 2 } })
  const out = await Promise.allSettled(Array.from({ length: 5 }, () => S.runAction('KEY2', 'analyze', { text: 'x' }, { generate: fake() as any })))
  assert.equal(out.filter((o) => o.status === 'fulfilled').length, 1) // 2 credits = exactly one analysis at 2 credits
  assert.equal(await bal('t2'), 0)
})

test('unknown pricing rule is a configuration error, not a free call', { skip }, async () => {
  await assert.rejects(S.runAction('KEY1', 'review', { text: 'x' }, { generate: fake() as any }), { status: 500 })
})

test('balance info lists the AI prices', { skip }, async () => {
  const b = await S.balanceInfo('KEY1')
  assert.deepEqual(b.prices.map((p: any) => [p.service, p.credits]), [['ai_article_analyze', 2], ['ai_article_generate', 5]])
})
