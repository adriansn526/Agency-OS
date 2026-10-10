/**
 * Acceptance scenarios for the supplier price & stock sync. DESTRUCTIVE on the database it points to:
 * it refuses to run unless the DATABASE_URL database name ends with "_synctest" (a throw-away copy of the data).
 *
 *   createdb-equivalent + pg_dump copy + commerce_supplier_sync.sql applied on it, then:
 *   DATABASE_URL=postgresql://.../agency_os_synctest npx tsx scripts/commerce/sync-acceptance.ts <scratchDir> [feedDir]
 *
 * feedDir (default /home/asns/data/ecaroseria-feed/extracted) must hold PRICELIST_*.txt and OUTOFSTOCK_*.txt.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { db } from '@repo/db'
import { runSupplierSync, type SyncReport } from '../../lib/commerce/sync/run'
import { sendSyncAlert, type AlertMsg } from '../../lib/commerce/sync/alerts'
import { saveSyncSettings } from '../../lib/commerce/sync/admin'
import { priceFromCost } from '../../lib/commerce/sync/formula'
import { parsePriceSyncSettings } from '../../lib/commerce/sync/settings'

const dbName = new URL(process.env.DATABASE_URL ?? 'postgresql://x/none').pathname.replace(/^\//, '')
if (!dbName.endsWith('_synctest')) {
  console.error(`Refusing to run: database "${dbName}" is not a *_synctest copy`)
  process.exit(2)
}
delete process.env.TELEGRAM_BOT_TOKEN // alerts go to the ERP (SystemAlert) only during tests
delete process.env.TELEGRAM_CHAT_ID

const scratch: string = process.argv[2] ?? (() => { console.error('usage: sync-acceptance.ts <scratchDir> [feedDir]'); process.exit(2) })()
const feedDir = process.argv[3] ?? '/home/asns/data/ecaroseria-feed/extracted'
const dataDir = path.join(scratch, 'data')

let failures = 0
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  if (!ok) failures++
}

const alerts: AlertMsg[] = []
const alertSpy = async (a: AlertMsg) => { alerts.push(a); return sendSyncAlert(a) }
const FX = { currency: 'EUR', rate: 5.3414, date: '2026-10-09', fresh: true }

async function fingerprint() {
  const [r] = await db.$queryRaw<Array<Record<string, string>>>`
    SELECT
      (SELECT md5(string_agg(id || ':' || "costPrice"::text || ':' || "isActive"::text, ',' ORDER BY id)) FROM "CommerceProduct") AS prod,
      (SELECT md5(string_agg(id || ':' || coalesce("priceRon"::text, '') || ':' || "updatedAt"::text || ':' || "isActive"::text, ',' ORDER BY id)) FROM "CommerceListing") AS listing,
      (SELECT md5(string_agg("productId" || warehouse || "rawFlag"::text, ',' ORDER BY "productId", warehouse)) FROM "CommerceStock") AS stock,
      (SELECT count(*)::text FROM "CommerceProduct") AS products,
      (SELECT count(*)::text FROM "CommerceSyncReview") AS reviews`
  return r!
}
const same = (a: Record<string, string>, b: Record<string, string>) => JSON.stringify(a) === JSON.stringify(b)

async function run(job: 'feed' | 'reprice', over: Partial<Parameters<typeof runSupplierSync>[0]> = {}): Promise<SyncReport> {
  return runSupplierSync({ job, triggeredBy: 'acceptance', dataDir, fx: FX, alert: alertSpy, ...over })
}
const brief = (r: SyncReport) => `${r.status}/${r.mode}${r.errors.length ? ` err="${r.errors[0]!.slice(0, 110)}"` : ''}`

async function main() {
  mkdirSync(dataDir, { recursive: true })
  // Working copies of the feed (the originals are never touched)
  const ok = path.join(scratch, 'feed-ok'); mkdirSync(ok, { recursive: true })
  for (const f of ['PRICELIST_34286.txt', 'OUTOFSTOCK_ALL.txt']) copyFileSync(path.join(feedDir, f), path.join(ok, f))

  const bl = (await db.businessLine.findUnique({ where: { slug: 'ecaroseria' } }))!
  await db.$executeRaw`UPDATE "CommerceChannel" SET config = COALESCE(config, '{}'::jsonb) || '{"priceSync": {"enabled": true}}'::jsonb WHERE "businessLineId" = ${bl.id}`
  console.log(`DB ${dbName}: sync enabled on the copy\n`)

  // ── 0. dry-run writes nothing ─────────────────────────────────────────────
  console.log('── 0. dry-run on the real extracted files')
  let fp0 = await fingerprint()
  const dry = await run('feed', { dryRun: true, localDir: ok })
  const dryStats = dry.stats as { pricelist: Record<string, number>; stock: Record<string, unknown> }
  console.log(`   new=${dryStats.pricelist.new} updated=${dryStats.pricelist.updated} unchanged=${dryStats.pricelist.unchanged} queued=${dryStats.pricelist.queuedForReview}`)
  check('dry-run reports changes but writes nothing', dry.status === 'success' && dry.mode === 'dry-run' && same(fp0, await fingerprint()), brief(dry))
  check('base articles in feed match ERP products (110714 matched)', dryStats.pricelist.matched === 110714 && dryStats.pricelist.baseArticlesInFeed === 110730, `feed ${dryStats.pricelist.baseArticlesInFeed} / matched ${dryStats.pricelist.matched}`)

  // ── 1. reprice to the BNR rate (activation order: reprice, then feed) ──────────
  console.log('\n── 1. first reprice at the BNR rate')
  const rp1 = await run('reprice')
  const rs1 = rp1.stats as { priceChanged: number; unchanged: number; queuedForReview: number }
  console.log(`   changed=${rs1.priceChanged} unchanged=${rs1.unchanged} queued=${rs1.queuedForReview}`)
  check('reprice applied', rp1.status === 'success' && rp1.mode === 'apply' && rs1.priceChanged > 100_000, brief(rp1))
  const [chk] = await db.$queryRaw<Array<{ bad: bigint }>>`
    SELECT count(*) AS bad FROM "CommerceListing" l JOIN "CommerceProduct" p ON p.id = l."productId"
    WHERE l."priceRon" IS DISTINCT FROM round(p."costPrice" * 5.3414 * 1.21, 2)`
  check('every listing price == round(cost × 5.3414 × 1.21, 2)', Number(chk!.bad) === 0, `${chk!.bad} differ`)

  // ── 2. feed apply ──────────────────────────────────────────────────────────────────
  console.log('\n── 2. feed apply on the real files')
  const f1 = await run('feed', { localDir: ok })
  const s1 = f1.stats as { pricelist: Record<string, number>; stock: Record<string, number>; applied: Record<string, number> }
  console.log(`   applied: ${JSON.stringify(s1.applied)}`)
  check('feed applied: 130 prices, 21 queued, 16 new created inactive', f1.status === 'success' && s1.applied.pricesUpdated === 130 && s1.pricelist.queuedForReview === 21 && s1.applied.newProductsCreated === 16, brief(f1))
  const [newRows] = await db.$queryRaw<Array<{ inactive: bigint; reviews: bigint }>>`
    SELECT (SELECT count(*) FROM "CommerceProduct" WHERE "isActive" = false) AS inactive,
           (SELECT count(*) FROM "CommerceSyncReview" WHERE kind = 'new_product' AND status = 'pending') AS reviews`
  check('new articles are inactive + in the review queue', Number(newRows!.inactive) === 16 && Number(newRows!.reviews) === 16, `inactive=${newRows!.inactive} reviews=${newRows!.reviews}`)
  const [pend] = await db.$queryRaw<Array<{ n: bigint; moved: bigint }>>`
    SELECT count(*) AS n, count(*) FILTER (WHERE round(p."costPrice", 2) = r."newCost") AS moved
    FROM "CommerceSyncReview" r JOIN "CommerceProduct" p ON p.id = r."productId" WHERE r.kind = 'price_change' AND r.status = 'pending'`
  check('queued price moves were NOT applied', Number(pend!.n) === 21 && Number(pend!.moved) === 0, `pending=${pend!.n} applied=${pend!.moved}`)
  check('large-change alert raised (ERP notification)', alerts.some((a) => /large price changes/.test(a.title)) && (await db.systemAlert.count({ where: { source: 'commerce-sync' } })) > 0)

  // ── 3. second consecutive run ─────────────────────────────────────────────────────────
  console.log('\n── 3. second consecutive run, no new files')
  fp0 = await fingerprint()
  const f2 = await run('feed', { localDir: ok })
  check('second run: unchanged, 0 modifications', f2.status === 'unchanged' && same(fp0, await fingerprint()), brief(f2))
  const f2b = await run('feed', { localDir: ok, force: true })
  const s2b = f2b.stats as { applied: Record<string, number> }
  check('forced re-run of the same files: 0 modifications', f2b.status === 'success' && same(fp0, await fingerprint()) && s2b.applied.costUpdated === 0 && s2b.applied.stockUpserted === 0 && s2b.applied.newProductsCreated === 0, JSON.stringify(s2b.applied))

  // ── 4. truncated files ──────────────────────────────────────────────────────────────────────
  console.log('\n── 4. truncated PRICELIST (50%)')
  const half = path.join(scratch, 'feed-half'); mkdirSync(half, { recursive: true })
  const lines = readFileSync(path.join(ok, 'PRICELIST_34286.txt')).toString('latin1').split('\n')
  writeFileSync(path.join(half, 'PRICELIST_34286.txt'), Buffer.from(lines.slice(0, Math.floor(lines.length / 2)).join('\n') + '\n', 'latin1'))
  copyFileSync(path.join(ok, 'OUTOFSTOCK_ALL.txt'), path.join(half, 'OUTOFSTOCK_ALL.txt'))
  const alertsBefore = alerts.length
  fp0 = await fingerprint()
  const t50 = await run('feed', { localDir: half })
  check('50% PRICELIST: run aborted, nothing written, alert sent', t50.status === 'aborted' && same(fp0, await fingerprint()) && alerts.length > alertsBefore, brief(t50))
  const bad = path.join(scratch, 'feed-corrupt'); mkdirSync(bad, { recursive: true })
  const zipBytes = readFileSync('/home/asns/data/ecaroseria-feed/raw/2026-10-09/PRICELIST_34286.zip')
  writeFileSync(path.join(bad, 'PRICELIST_34286.zip'), zipBytes.subarray(0, Math.floor(zipBytes.length / 2)))
  copyFileSync(path.join(ok, 'OUTOFSTOCK_ALL.txt'), path.join(bad, 'OUTOFSTOCK_ALL.txt'))
  const tcorrupt = await run('feed', { localDir: bad })
  check('truncated zip: run aborted, nothing written', tcorrupt.status === 'aborted' && same(fp0, await fingerprint()), brief(tcorrupt))
  const empty = path.join(scratch, 'feed-empty'); mkdirSync(empty, { recursive: true })
  writeFileSync(path.join(empty, 'PRICELIST_34286.txt'), '')
  copyFileSync(path.join(ok, 'OUTOFSTOCK_ALL.txt'), path.join(empty, 'OUTOFSTOCK_ALL.txt'))
  const tempty = await run('feed', { localDir: empty })
  check('empty PRICELIST: run aborted, nothing written', tempty.status === 'aborted' && same(fp0, await fingerprint()), brief(tempty))

  // ── 5. +50% on 3 articles ────────────────────────────────────────────────────────────────────────
  console.log('\n── 5. +50% on 3 articles')
  const pick = await db.$queryRaw<Array<{ code: string; cost: string; price: string }>>`
    SELECT p."supplierCode" AS code, p."costPrice"::text AS cost, l."priceRon"::text AS price FROM "CommerceProduct" p JOIN "CommerceListing" l ON l."productId" = p.id
    WHERE p."isActive" AND p."costPrice" BETWEEN 20 AND 60 AND NOT EXISTS (SELECT 1 FROM "CommerceSyncReview" r WHERE r."productId" = p.id) ORDER BY p."supplierCode" LIMIT 3`
  const bump = path.join(scratch, 'feed-bump'); mkdirSync(bump, { recursive: true })
  const codes = new Set(pick.map((x) => x.code))
  const out = lines.map((ln) => {
    const c = ln.split(';')
    if (c.length === 11 && c[0] === c[10]!.trim() && codes.has(c[0]!)) c[8] = (Number(c[8]!.replace(',', '.')) * 1.5).toFixed(2).replace('.', ',')
    return c.join(';')
  })
  writeFileSync(path.join(bump, 'PRICELIST_34286.txt'), Buffer.from(out.join('\n'), 'latin1'))
  copyFileSync(path.join(ok, 'OUTOFSTOCK_ALL.txt'), path.join(bump, 'OUTOFSTOCK_ALL.txt'))
  const a0 = alerts.length
  const t5 = await run('feed', { localDir: bump })
  check('+50% run applied', t5.status === 'success', brief(t5))
  const s5 = t5.stats as { pricelist: Record<string, number>; applied: Record<string, number> }
  const after = await db.$queryRaw<Array<{ code: string; cost: string; price: string }>>`
    SELECT p."supplierCode" AS code, p."costPrice"::text AS cost, l."priceRon"::text AS price FROM "CommerceProduct" p JOIN "CommerceListing" l ON l."productId" = p.id WHERE p."supplierCode" = ANY(${[...codes]}::text[]) ORDER BY 1`
  check('3 articles +50%: queued for review, price and cost unchanged', s5.pricelist.queuedForReview === 3 && s5.applied.pricesUpdated === 0 && after.every((a) => pick.find((p) => p.code === a.code)!.price === a.price && pick.find((p) => p.code === a.code)!.cost === a.cost), `queued=${s5.pricelist.queuedForReview} applied=${s5.applied.pricesUpdated}`)
  check('alert raised for the 3 large moves', alerts.length > a0 && /large price changes/.test(alerts.at(-1)!.title), alerts.at(-1)?.title)
  const target = (await db.commerceSyncReview.findFirst({ where: { supplierCode: pick[0]!.code, status: 'pending', kind: 'price_change' } }))!
  const { decideReview } = await import('../../lib/commerce/sync/review')
  const ap = await decideReview(target.id, 'approve', 'acceptance')
  const [pAfter] = await db.$queryRaw<Array<{ cost: string; price: string }>>`SELECT p."costPrice"::text AS cost, l."priceRon"::text AS price FROM "CommerceProduct" p JOIN "CommerceListing" l ON l."productId" = p.id WHERE p."supplierCode" = ${pick[0]!.code}`
  const expect = priceFromCost(Number(target.newCost), 5.3414, parsePriceSyncSettings({ priceSync: {} }))
  check('approving a queued move applies cost + formula price', ap.ok && Number(pAfter!.cost) === Number(target.newCost) && Number(pAfter!.price) === expect, `${ap.message} (expected ${expect})`)
  const rej = (await db.commerceSyncReview.findFirst({ where: { supplierCode: pick[1]!.code, status: 'pending', kind: 'price_change' } }))!
  await decideReview(rej.id, 'reject', 'acceptance')
  const t5b = await run('feed', { localDir: bump, force: true })
  const s5b = t5b.stats as { pricelist: Record<string, number> }
  check('a rejected move is not flagged again at the same supplier price', s5b.pricelist.rejectedBefore === 1, `rejectedBefore=${s5b.pricelist.rejectedBefore}`)

  // ── 6. simulated FX change ───────────────────────────────────────────────────────────────────────────
  console.log('\n── 6. simulated BNR rate change')
  const snap = async () => new Map((await db.$queryRaw<Array<{ id: string; price: string; u: Date }>>`SELECT id, "priceRon"::text AS price, "updatedAt" AS u FROM "CommerceListing"`).map((r) => [r.id, r]))
  const before = await snap()
  const fx2 = { ...FX, rate: 5.3415, date: '2026-10-10' }
  const r6 = await run('reprice', { fx: fx2 })
  const after6 = await snap()
  let priceMoved = 0, touched = 0, touchedWithoutChange = 0, changedWithoutTouch = 0
  for (const [id, a] of after6) {
    const b = before.get(id)!
    const pm = a.price !== b.price, ut = a.u.getTime() !== b.u.getTime()
    if (pm) priceMoved++
    if (ut) touched++
    if (ut && !pm) touchedWithoutChange++
    if (pm && !ut) changedWithoutTouch++
  }
  const rs6 = r6.stats as { priceChanged: number; unchanged: number }
  console.log(`   rate 5.3414 → 5.3415: prices moved=${priceMoved}, unchanged=${rs6.unchanged}, updatedAt moved=${touched}`)
  check('only affected prices were rewritten and only they got a new updatedAt', r6.status === 'success' && priceMoved === rs6.priceChanged && touchedWithoutChange === 0 && changedWithoutTouch === 0 && rs6.unchanged > 0, `moved=${priceMoved} touchedWithoutChange=${touchedWithoutChange} changedWithoutTouch=${changedWithoutTouch}`)
  const r6b = await run('reprice', { fx: fx2 })
  check('same rate again: nothing to do', r6b.status === 'unchanged', brief(r6b))
  const r6c = await run('reprice', { fx: { ...FX, rate: 7.5, date: '2026-10-11' } })
  check('implausible +40% rate jump: reprice aborted, prices untouched', r6c.status === 'aborted' && (await snap()).get([...after6.keys()][0]!)!.price === after6.get([...after6.keys()][0]!)!.price, brief(r6c))

  // ── 7. stock → availability ──────────────────────────────────────────────────────────────────────────────
  console.log('\n── 7. stock flags → public availability')
  const { availabilityFor } = await import('../../lib/commerce/storefront/queries')
  const two = await db.$queryRaw<Array<{ code: string; flags: number[] }>>`
    SELECT p."supplierCode" AS code, array_agg(s."rawFlag" ORDER BY s.warehouse) AS flags FROM "CommerceStock" s JOIN "CommerceProduct" p ON p.id = s."productId"
    WHERE p."isActive" GROUP BY p."supplierCode" HAVING bool_and(s."rawFlag" = 0) OR (min(s."rawFlag") = 0 AND max(s."rawFlag") = 1) LIMIT 400`
  const none = two.find((x) => x.flags.every((f) => f === 0))!
  const one = two.find((x) => x.flags.includes(1) && x.flags.includes(0))!
  await saveSyncSettings({ stockMapping: 'supplier_confirm' })
  check('0 in both warehouses → out_of_stock', availabilityFor(none.flags.map((rawFlag) => ({ rawFlag })), 'supplier_confirm') === 'out_of_stock', `${none.code} flags=${none.flags}`)
  check('1 in one warehouse → confirm_on_order', availabilityFor(one.flags.map((rawFlag) => ({ rawFlag })), 'supplier_confirm') === 'confirm_on_order', `${one.code} flags=${one.flags}`)

  // ── 8. markup needs approval; lock; timeout ─────────────────────────────────────────────────────────────────────
  console.log('\n── 8. guards')
  fp0 = await fingerprint()
  await saveSyncSettings({ markupPct: 10 })
  const m1 = await run('feed', { localDir: ok, force: true })
  check('markup > 0 without approval: run refused, nothing written', m1.status === 'failed' && /approval/i.test(m1.errors[0] ?? '') && same(fp0, await fingerprint()), brief(m1))
  await saveSyncSettings({ markupPct: 0 })
  const [l1, l2] = await Promise.all([run('feed', { localDir: ok, force: true }), run('feed', { localDir: ok, force: true })])
  check('two simultaneous writing runs: exactly one runs, the other is locked out', [l1, l2].filter((r) => r.status === 'locked').length === 1, `${l1.status} / ${l2.status}`)
  fp0 = await fingerprint()
  const to = await run('feed', { localDir: ok, force: true, maxRunMs: 1 })
  check('global timeout stops the run', to.status === 'failed' && /time limit/.test(to.errors[0] ?? '') && same(fp0, await fingerprint()), brief(to))

  console.log(`\n${failures === 0 ? 'ALL PASSED' : `${failures} FAILED`}`)
  await db.$disconnect()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1) })
