/**
 * Unit tests — run with:  npx tsx --test lib/commerce/sync/__tests__/*.test.ts
 * (no database or network needed; DB-level acceptance checks live in scripts/commerce/sync-acceptance.ts)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { PriceSyncSettings, formulaHash } from '../settings'
import { MarkupNotApprovedError, assertFormulaUsable, changePct, priceFromCost } from '../formula'
import { FeedFormatError, parseOutOfStock, parsePricelist, readFeedFile } from '../parse'
import { planFeedSync, planReprice, type SnapshotProduct } from '../plan'
import { availabilityFromFlags } from '../../availability'
import { parseBnrXml } from '../../bnr'
import { pruneRaw } from '../files'

const S = (over: Partial<PriceSyncSettings> = {}) => PriceSyncSettings.parse({ ...over })

// ─── formula ───
test('formula: zero markup, VAT 21, 2 decimals, single rounding at the end', () => {
  // 40 EUR × 5.3414 × 1.21 = 258.5... ; rounded once
  assert.equal(priceFromCost(40, 5.3414, S()), 258.52)
  assert.equal(priceFromCost('5.59', 6.461 / 1.21, S()), Math.round(5.59 * 6.461 * 100) / 100)
})
test('formula: rounding modes and minimum price', () => {
  assert.equal(priceFromCost(10, 5, S({ vatPct: 0, rounding: '99' })), 49.99)
  assert.equal(priceFromCost(10.2, 5, S({ vatPct: 0, rounding: '99' })), 50.99)
  assert.equal(priceFromCost(10.21, 5, S({ vatPct: 0, rounding: 'integer' })), 52)
  assert.equal(priceFromCost(0.2, 5.34, S({ minPriceRon: 9 })), 9)
  assert.equal(priceFromCost(0, 5, S()), 0)
  assert.equal(priceFromCost(10, 0, S()), 0)
  assert.equal(priceFromCost(10, 1, S({ sourceCurrency: 'RON', vatPct: 0 })), 10)
})
test('formula: no float drift on half-cent values', () => {
  // 1.005 RON must round half-up to 1.01 (binary floats give 1.00)
  assert.equal(priceFromCost('1.005', 1, S({ vatPct: 0 })), 1.01)
})
test('formula: markup needs approval; overrides by category/brand', () => {
  assert.doesNotThrow(() => assertFormulaUsable(S()))
  assert.throws(() => assertFormulaUsable(S({ markupPct: 10 })), MarkupNotApprovedError)
  assert.throws(() => assertFormulaUsable(S({ markupOverrides: [{ categorySlug: 'x', brand: null, markupPct: 5 }] })), MarkupNotApprovedError)
  const s = S({ markupPct: 10, markupApprovedAt: '2026-10-10T00:00:00Z', vatPct: 0, markupOverrides: [{ categorySlug: 'faruri', brand: null, markupPct: 20 }, { categorySlug: null, brand: 'bosch', markupPct: 30 }] })
  assert.doesNotThrow(() => assertFormulaUsable(s))
  assert.equal(priceFromCost(100, 1, s, { categorySlug: 'faruri', brand: null }), 120)
  assert.equal(priceFromCost(100, 1, s, { categorySlug: 'altele', brand: 'BOSCH' }), 130)
  assert.equal(priceFromCost(100, 1, s, { categorySlug: 'altele', brand: null }), 110)
})
test('formula hash changes with the formula but not with switches', () => {
  assert.equal(formulaHash(S()), formulaHash(S({ enabled: true, maxChangePct: 50 })))
  assert.notEqual(formulaHash(S()), formulaHash(S({ vatPct: 19 })))
  assert.notEqual(formulaHash(S()), formulaHash(S({ rounding: '99' })))
})
test('changePct', () => {
  assert.equal(changePct(100, 150), 50)
  assert.equal(changePct(100, 70), -30)
  assert.equal(changePct(0, 5), 0)
})

// ─── availability mapping ───
test('availability: supplier_confirm mapping', () => {
  assert.equal(availabilityFromFlags([1, 0], 'supplier_confirm'), 'confirm_on_order')
  assert.equal(availabilityFromFlags([0, 1], 'supplier_confirm'), 'confirm_on_order')
  assert.equal(availabilityFromFlags([1, 1], 'supplier_confirm'), 'confirm_on_order')
  assert.equal(availabilityFromFlags([0, 0], 'supplier_confirm'), 'out_of_stock')
  assert.equal(availabilityFromFlags([], 'supplier_confirm'), 'confirm_on_order')
  // legacy behaviour is unchanged
  assert.equal(availabilityFromFlags([0, 0], 'unknown'), 'confirm_on_order')
  assert.equal(availabilityFromFlags([1], 'one_in_stock'), 'in_stock')
  assert.equal(availabilityFromFlags([0], 'one_in_stock'), 'out_of_stock')
})

// ─── parsing ───
const line = (code: string, bar: string, price: string, extra: Partial<Record<number, string>> = {}) => {
  const c = [code, 'OE-1', 'ΠΟΡΤΑ', 'TAIL GATE', '', code.slice(0, 4), 'ISUZU', 'ISUZU P/U', price, 'TAIL BODY', bar]
  for (const [i, v] of Object.entries(extra)) c[Number(i)] = v as string
  return c.join(';')
}
// Greek text encoded as ISO-8859-7 by hand: Π=0xD0 Ο=0xCF Ρ=0xD1 Τ=0xD4 Α=0xC1
const iso7 = (s: string) => Buffer.from(s.replace(/ΠΟΡΤΑ/g, '\u0000'), 'latin1').toString('latin1')
test('pricelist: base rows only, decimal comma, CRLF, ISO-8859-7', () => {
  const body = [line('012101480', '012101480', '200,00'), line('607801480', '012101480', '200,00'), line('060407066', '060407066', '5,59')].join('\r\n') + '\r\n'
  const buf = Buffer.concat([Buffer.from(body.replace(/ΠΟΡΤΑ/g, 'XXXXX'), 'latin1')])
  const r = parsePricelist(buf)
  assert.equal(r.totalRows, 3)
  assert.equal(r.base.size, 2)
  assert.equal(r.base.get('060407066')!.price, 5.59)
  assert.equal(r.parseErrors, 0)
  void iso7
})
test('pricelist: greek bytes decode', () => {
  const head = Buffer.from('012101480;OE;', 'latin1')
  const greek = Buffer.from([0xd0, 0xcf, 0xd1, 0xd4, 0xc1]) // ΠΟΡΤΑ in ISO-8859-7
  const tail = Buffer.from(';TAIL;;0121;ISUZU;M;12,50;CAT;012101480\r\n', 'latin1')
  const r = parsePricelist(Buffer.concat([head, greek, tail]))
  assert.equal(r.base.get('012101480')!.nameEl, 'ΠΟΡΤΑ')
})
test('pricelist: malformed rows are counted, not thrown', () => {
  const r = parsePricelist(Buffer.from([line('012101480', '012101480', 'abc'), 'a;b;c', line('0121', '0121', '1,00'), line('012101481', '012101481', '1.234,50')].join('\n'), 'latin1'))
  assert.equal(r.base.size, 0)
  assert.equal(r.parseErrors, 4)
})
test('outofstock: 3 columns, any-1-wins merge, optional barcode column', () => {
  const r = parseOutOfStock(Buffer.from('ath;012101480;1\nthe;012101480;0\nath;607801480;0\nath;607801480;1\nxx;1;1\n', 'latin1'))
  assert.equal(r.byCode.get('012101480')!.get('ath'), 1)
  assert.equal(r.byCode.get('012101480')!.get('the'), 0)
  assert.equal(r.byCode.get('607801480')!.get('ath'), 1)
  assert.equal(r.duplicateRows, 1)
  assert.equal(r.conflictingDuplicates, 1)
  assert.equal(r.parseErrors, 1)
  const withBarcode = parseOutOfStock(Buffer.from('ath;607801480;1;012101480\n', 'latin1'))
  assert.ok(withBarcode.byCode.has('012101480'))
})
function zipOf(name: string, content: string, dir: string): string {
  const z = new AdmZip()
  z.addFile(name, Buffer.from(content, 'latin1'))
  const p = path.join(dir, name.replace(/\.txt$/, '.zip'))
  z.writeZip(p)
  return p
}
test('readFeedFile: valid zip, truncated zip, wrong entry', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'sync-test-'))
  const ok = zipOf('OUTOFSTOCK_ALL.txt', Array.from({ length: 800 }, (_, i) => `ath;${String(100000000 + ((i * 7919) % 99991))};${i % 2}`).join('\n'), dir)
  assert.equal(readFeedFile(ok).entry, 'OUTOFSTOCK_ALL.txt')
  const bytes = require_fs().readFileSync(ok)
  const cut = path.join(dir, 'cut.zip')
  writeFileSync(cut, bytes.subarray(0, Math.floor(bytes.length / 2)))
  assert.throws(() => readFeedFile(cut))
  const bad = path.join(dir, 'bad.zip')
  writeFileSync(bad, 'not a zip at all')
  assert.throws(() => readFeedFile(bad), FeedFormatError)
  const z = new AdmZip(); z.addFile('a.txt', Buffer.from('x')); z.addFile('b.txt', Buffer.from('y')); z.writeZip(path.join(dir, 'two.zip'))
  assert.throws(() => readFeedFile(path.join(dir, 'two.zip')), FeedFormatError)
})
import * as fsMod from 'node:fs'
function require_fs() { return fsMod }

// ─── plan ───
const prod = (code: string, cost: number, price: number | null, over: Partial<SnapshotProduct> = {}): SnapshotProduct => ({
  id: `id-${code}`, code, cost, isActive: true, brand: null, categorySlug: null, missing: false,
  listing: price == null ? null : { id: `l-${code}`, priceRon: price, priceSource: 'rule', manual: false, isActive: true },
  stock: new Map(), ...over,
})
const item = (code: string, price: number) => ({ code, oeMain: '', nameEl: '', nameEn: `P ${code}`, side: '', modelCode: code.slice(0, 4), make: 'M', modelName: 'MM', price, group: 'G' })
const baseOf = (...items: ReturnType<typeof item>[]) => new Map(items.map((i) => [i.code, i]))
const noReviews = () => ({ pending: new Map<string, number>(), rejected: new Map<string, number>() })
const FX = 5.34

test('plan: unchanged, small change applied, large change queued, new product', () => {
  const settings = S()
  const products = [
    prod('100000001', 10, priceFromCost(10, FX, settings)),
    prod('100000002', 10, priceFromCost(10, FX, settings)),
    prod('100000003', 10, priceFromCost(10, FX, settings)),
  ]
  const plan = planFeedSync({
    products, base: baseOf(item('100000001', 10), item('100000002', 11), item('100000003', 15), item('100000009', 3)),
    stock: null, reviews: noReviews(), settings, fx: FX, currentMeaning: 'unknown',
  })
  assert.equal(plan.stats.unchanged, 1)
  assert.deepEqual(plan.priceUpdates.map((r) => r.code), ['100000002'])
  assert.equal(plan.priceUpdates[0]!.newPrice, priceFromCost(11, FX, settings))
  assert.deepEqual(plan.reviewPrice.map((r) => [r.code, r.pct]), [['100000003', 50.01]])
  assert.deepEqual(plan.newItems.map((i) => i.code), ['100000009'])
  assert.ok(plan.touchListingIds.has('l-100000002'))
  assert.ok(!plan.touchListingIds.has('l-100000001'))
  assert.ok(!plan.touchListingIds.has('l-100000003'))
})
test('plan: exactly at the threshold is applied, above it is queued', () => {
  const settings = S({ vatPct: 0 })
  const products = [prod('100000001', 10, 53.4), prod('100000002', 10, 53.4)]
  const plan = planFeedSync({ products, base: baseOf(item('100000001', 13), item('100000002', 13.01)), stock: null, reviews: noReviews(), settings, fx: FX, currentMeaning: 'unknown' })
  assert.deepEqual(plan.priceUpdates.map((r) => r.code), ['100000001'])
  assert.deepEqual(plan.reviewPrice.map((r) => r.code), ['100000002'])
})
test('plan: rejected cost is not flagged again; reverted pending review closes; cost-only without a priced listing', () => {
  const settings = S()
  const products = [prod('100000001', 10, 64.61), prod('100000002', 10, 64.61), prod('100000003', 10, null), prod('100000004', 10, 64.61, { listing: { id: 'l4', priceRon: 99, priceSource: 'rule', manual: true, isActive: true } })]
  const reviews = noReviews()
  reviews.rejected.set('100000001', 2000)
  reviews.pending.set('100000002', 3000)
  const plan = planFeedSync({
    products, base: baseOf(item('100000001', 20), item('100000002', 10), item('100000003', 12), item('100000004', 12)),
    stock: null, reviews, settings, fx: FX, currentMeaning: 'unknown',
  })
  assert.equal(plan.stats.suppressedRejected, 1)
  assert.equal(plan.reviewPrice.length, 0)
  assert.deepEqual(plan.revertedPending, ['100000002'])
  assert.deepEqual(plan.costOnly.map((r) => r.code).sort(), ['100000003', '100000004'])
  assert.equal(plan.priceUpdates.length, 0)
})
test('plan: vanished articles are deactivated, but not beyond the limit; returning ones come back', () => {
  const settings = S({ maxDeactivatePct: 5 })
  const many = Array.from({ length: 100 }, (_, i) => prod(String(100000000 + i), 10, 64.61))
  const keepAll = new Map(many.map((p) => [p.code, item(p.code, 10)]))
  keepAll.delete('100000000')
  let plan = planFeedSync({ products: many, base: keepAll, stock: null, reviews: noReviews(), settings, fx: FX, currentMeaning: 'unknown' })
  assert.deepEqual(plan.deactivate.map((d) => d.code), ['100000000'])
  const half = new Map([...keepAll].slice(0, 50))
  plan = planFeedSync({ products: many, base: half, stock: null, reviews: noReviews(), settings, fx: FX, currentMeaning: 'unknown' })
  assert.equal(plan.deactivate.length, 0)
  assert.match(plan.deactivationBlocked ?? '', /limit/)
  const back = [prod('100000001', 10, 64.61, { isActive: false, missing: true }), prod('100000002', 10, 64.61, { isActive: false, missing: false })]
  plan = planFeedSync({ products: back, base: baseOf(item('100000001', 10), item('100000002', 10)), stock: null, reviews: noReviews(), settings, fx: FX, currentMeaning: 'unknown' })
  assert.deepEqual(plan.reactivate.map((d) => d.code), ['100000001'])
})
test('plan: stock flags, availability mapping and updatedAt only when public availability changes', () => {
  const settings = S()
  const mk = (code: string, stock: [string, number][]) => prod(code, 10, 64.61, { stock: new Map(stock) })
  const products = [
    mk('100000001', [['ath', 1], ['the', 1]]), // → ath 0, the 0 : confirm → out
    mk('100000002', [['ath', 1], ['the', 0]]), // ath 1→0, the 0→1: still available
    mk('100000003', [['ath', 0], ['the', 0]]), // unchanged
  ]
  const stock = new Map<string, Map<string, 0 | 1>>([
    ['100000001', new Map([['ath', 0], ['the', 0]])],
    ['100000002', new Map([['ath', 0], ['the', 1]])],
    ['100000003', new Map([['ath', 0], ['the', 0]])],
    ['999999999', new Map([['ath', 1]])],
  ])
  const supplier = planFeedSync({ products, base: null, stock, reviews: noReviews(), settings, fx: FX, currentMeaning: 'supplier_confirm' })
  assert.equal(supplier.stats.stockRowsChanged, 4)
  assert.deepEqual([...supplier.touchListingIds].sort(), ['l-100000001'])
  assert.deepEqual(supplier.stats.proposedMapping, { in_stock: 0, out_of_stock: 2, confirm_on_order: 1 })
  assert.equal(supplier.stats.stockCodesNotInPricelist, 1)
  // under today's 'unknown' meaning the public value never changes → no updatedAt churn
  const unknown = planFeedSync({ products, base: null, stock, reviews: noReviews(), settings, fx: FX, currentMeaning: 'unknown' })
  assert.equal(unknown.touchListingIds.size, 0)
  assert.deepEqual(unknown.stats.proposedMapping, { in_stock: 0, out_of_stock: 2, confirm_on_order: 1 })
})
test('reprice: only changed prices move, manual/non-rule skipped, big moves queued', () => {
  const settings = S()
  const products = [
    prod('100000001', 10, priceFromCost(10, 5.3414, settings)), // already current
    prod('100000002', 10, 64.61), // 6.461 legacy → tiny move
    prod('100000003', 10, 20), // > 30%
    prod('100000004', 10, 64.61, { listing: { id: 'lm', priceRon: 99, priceSource: 'rule', manual: true, isActive: true } }),
    prod('100000005', 10, 64.61, { listing: { id: 'lc', priceRon: 99, priceSource: 'competitor', manual: false, isActive: true } }),
  ]
  const plan = planReprice(products, settings, 5.3414)
  assert.equal(plan.unchanged, 1)
  assert.deepEqual(plan.updates.map((r) => r.code), ['100000002'])
  assert.deepEqual(plan.review.map((r) => r.code), ['100000003'])
  assert.equal(plan.skippedNotRule, 2)
})

// ─── BNR ───
test('bnr: latest cube of the 10-day file; multiplier handled', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?><DataSet xmlns="http://www.bnr.ro/xsd"><Body>
    <Cube date="2026-10-08"><Rate currency="EUR">5.3470</Rate></Cube>
    <Cube date="2026-10-09"><Rate currency="EUR">5.3414</Rate><Rate currency="HUF" multiplier="100">1.3000</Rate></Cube></Body></DataSet>`
  const r = parseBnrXml(xml)
  assert.equal(r.date, '2026-10-09')
  assert.equal(r.rates.EUR, 5.3414)
  assert.equal(r.rates.HUF, 0.013)
  const single = parseBnrXml(`<DataSet><Body><Cube date="2026-10-09"><Rate currency="EUR">5.3414</Rate></Cube></Body></DataSet>`)
  assert.equal(single.rates.EUR, 5.3414)
  assert.throws(() => parseBnrXml('<html><body>blocked</body></html>'))
})

// ─── retention ───
test('pruneRaw removes only our zips older than 7 days', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sync-raw-'))
  const now = new Date('2026-10-20T10:00:00Z')
  for (const d of ['2026-10-01', '2026-10-19']) mkdirSync(path.join(root, 'raw', d), { recursive: true })
  for (const d of ['2026-10-01', '2026-10-19']) writeFileSync(path.join(root, 'raw', d, 'PRICELIST_34286.zip'), 'x')
  writeFileSync(path.join(root, 'raw', '2026-10-01', 'exclude_products.csv'), 'keep me')
  const removed = pruneRaw(root, 7, now)
  assert.deepEqual(removed, [path.join('2026-10-01', 'PRICELIST_34286.zip')])
  assert.ok(existsSync(path.join(root, 'raw', '2026-10-01', 'exclude_products.csv')))
  assert.ok(existsSync(path.join(root, 'raw', '2026-10-19', 'PRICELIST_34286.zip')))
  assert.deepEqual(readdirSync(path.join(root, 'raw')).sort(), ['2026-10-01', '2026-10-19'])
})
