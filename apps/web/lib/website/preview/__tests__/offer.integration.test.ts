/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, O: typeof import('../offer')
const entry = { county: 'Mureș', city: 'Târgu Mureș', data: { servicii: ['instalatii'] } }

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); O = await import('../offer')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteRuleAudit","WebsiteRule","WebsiteFoundingSlot","WebsiteChannel","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteChannel.create({ data: { businessLineId: 'bl', siteUrl: 'https://x.ro' } })
})
after(async () => { if (db) await db.$disconnect() })

test('no rules: free offer; a pricing rule changes the sentence without code changes', { skip }, async () => {
  const a = await O.buildOffer('bl', entry)
  assert.match(a.lines.join(' '), /gratuite/); assert.equal(a.terms.amountRon, 0)
  await db.websiteRule.create({ data: { id: 'r1', businessLineId: 'bl', kind: 'pricing', name: 'Mureș', priority: 1, isActive: true, conditions: [{ field: 'county', op: 'eq', value: 'Mureș' }], action: { amountRon: 29, freeFirstN: 3 } } })
  const b = await O.buildOffer('bl', entry)
  assert.match(b.lines[1]!, /29 lei \/ cerere, primele 3/); assert.equal(b.terms.amountRon, 29)
  assert.equal((await O.buildOffer('bl', { ...entry, county: 'Cluj' })).terms.amountRon, 0)   // condition not met
})
