/**
 * Supplier price & stock sync — orchestration of the two jobs.
 *
 *   feed     PRICELIST + OUTOFSTOCK  → cost price, shop price, stock flags, new / vanished articles
 *   reprice  BNR rate or formula changed → recompute shop prices from the stored cost
 *
 * Safety model:
 *   - writes happen only in `apply` mode, which needs priceSync.enabled = true; otherwise the run is a forced dry-run
 *   - one writing run at a time (unique "running" row), global time limit, read-only FTP
 *   - truncated / corrupt files abort before anything is written
 *   - price moves above maxChangePct are queued for review instead of applied
 */
import os from 'node:os'
import path from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { db } from '@repo/db'
import { getFxQuote, type FxQuote } from '../bnr'
import { acquireFiles, pruneRaw, type FileKey, type FileSource, type FtpLike } from './files'
import { SupplierFtp, ftpSettingsFromEnv } from './ftp'
import { assertFormulaUsable } from './formula'
import { FeedFormatError, parseOutOfStock, parsePricelist, readFeedFile, type PricelistResult, type StockResult } from './parse'
import { planFeedSync, planReprice, type FeedPlan, type RepricePlan } from './plan'
import { formulaHash, parsePriceSyncSettings, type PriceSyncSettings } from './settings'
import {
  SyncTimeoutError, applyFeedPlan, applyReprice, finishRun, loadFileState, loadReviews, loadSnapshot, saveAppliedState, saveFileState,
  applyStockForCodes, startRun, syncTablesReady,
} from './store'
import { createNewProducts } from './newproducts'
import { sendSyncAlert, type AlertMsg } from './alerts'

export type JobName = 'feed' | 'reprice'
export type RunMode = 'apply' | 'dry-run' | 'forced-dry-run'
export type RunStatus = 'success' | 'unchanged' | 'aborted' | 'failed' | 'locked'

export interface SyncOptions {
  job: JobName
  dryRun?: boolean
  /** process files even if unchanged / re-price even if fx and formula are unchanged */
  force?: boolean
  triggeredBy: string
  feedCode?: string
  businessLineSlug?: string
  /** read the feed files from this directory instead of the FTP (tests, replays) */
  localDir?: string
  dataDir?: string
  maxRunMs?: number
  // injection points for tests
  fx?: FxQuote
  ftp?: FtpLike
  alert?: (a: AlertMsg) => Promise<boolean>
  now?: () => Date
}

export interface SyncReport {
  job: JobName
  mode: RunMode
  status: RunStatus
  runId: string | null
  feedCode: string
  businessLine: string
  startedAt: string
  durationMs: number
  files: Record<string, { name: string; size: number; remoteMtime: string; sha256: string; rows: number; changed: boolean } | { unchanged: true }>
  fx: { rate: number; date: string; fresh: boolean; pricingRate: number } | null
  formula: { hash: string; vatPct: number; markupPct: number; rounding: string; minPriceRon: number; maxChangePct: number; appliedBefore: PriceSyncSettings['applied'] }
  stats: Record<string, unknown>
  topPriceChanges: Array<{ code: string; oldPrice: number | null; newPrice: number | null; pct: number | null; oldCost?: number; newCost?: number; queued?: boolean }>
  notes: string[]
  warnings: string[]
  errors: string[]
  stages: Record<string, number>
}

const DEFAULT_MAX_RUN_MS = 45 * 60_000
/** A reprice that would queue more rows than this is a bulk shift (formula/fx jump), not noise: abort and ask a human. */
const MAX_BULK_REVIEW = 1_000
const STALE_FEED_HOURS = 36

export function defaultDataDir(): string {
  return process.env.COMMERCE_SYNC_DATA_DIR || path.join(os.homedir(), 'data', 'ecaroseria-feed')
}

class AbortRun extends Error {
  constructor(message: string, readonly alert: boolean = true) { super(message) }
}

export async function runSupplierSync(opts: SyncOptions): Promise<SyncReport> {
  const now = opts.now ?? (() => new Date())
  const t0 = Date.now()
  const maxRunMs = opts.maxRunMs ?? DEFAULT_MAX_RUN_MS
  const dataDir = opts.dataDir ?? defaultDataDir()
  const alert = opts.alert ?? sendSyncAlert
  const stages: Record<string, number> = {}
  let lap = Date.now()
  const stage = (name: string) => { stages[name] = Date.now() - lap; lap = Date.now() }
  const tick = () => { if (Date.now() - t0 > maxRunMs) throw new SyncTimeoutError() }

  const feedCode = opts.feedCode ?? process.env.COMMERCE_SYNC_FEED ?? 'gr-main'
  const slug = opts.businessLineSlug ?? process.env.COMMERCE_SYNC_BUSINESS_LINE ?? 'ecaroseria'
  const feed = await db.commerceSupplierFeed.findUnique({ where: { code: feedCode } })
  if (!feed) throw new Error(`Feed "${feedCode}" not found`)
  const bl = await db.businessLine.findUnique({ where: { slug }, select: { id: true } })
  if (!bl) throw new Error(`Business line "${slug}" not found`)
  const channel = await db.commerceChannel.findUnique({ where: { businessLineId: bl.id } })
  if (!channel) throw new Error(`Commerce channel for "${slug}" not found`)
  const settings = parsePriceSyncSettings(channel.config)
  const ready = await syncTablesReady()

  const mode: RunMode = opts.dryRun ? 'dry-run' : !settings.enabled ? 'forced-dry-run' : 'apply'
  const apply = mode === 'apply'
  if (apply && !ready) throw new Error('Supplier sync tables are missing: apply packages/db/prisma/sql/commerce_supplier_sync.sql first')

  const report: SyncReport = {
    job: opts.job, mode, status: 'success', runId: null, feedCode, businessLine: slug, startedAt: now().toISOString(), durationMs: 0,
    files: {}, fx: null,
    formula: { hash: formulaHash(settings), vatPct: settings.vatPct, markupPct: settings.markupPct, rounding: settings.rounding, minPriceRon: settings.minPriceRon, maxChangePct: settings.maxChangePct, appliedBefore: settings.applied },
    stats: {}, topPriceChanges: [], notes: [], warnings: [], errors: [], stages,
  }
  if (mode === 'forced-dry-run') report.notes.push('Price sync is not enabled (priceSync.enabled = false): this run is a dry-run, nothing is written to the catalog.')

  // Lock (writing runs only). Dry-runs are read-only and may overlap anything.
  let runId: string | null = null
  if (ready) {
    const id = await startRun(feed.id, opts.job === 'feed' ? 'feed_sync' : 'reprice', mode !== 'apply', opts.triggeredBy, maxRunMs + 5 * 60_000)
    if (id === 'locked') {
      report.status = 'locked'
      report.notes.push('Another sync run is already in progress; this one was skipped.')
      return finalizeReport(report, t0, dataDir, null)
    }
    runId = id
    report.runId = id
  }

  let alertMsg: AlertMsg | null = null
  try {
    if (opts.job === 'feed') {
      alertMsg = await runFeedJob({ opts, report, feed, bl: bl.id, channelSettings: settings, ready, apply, dataDir, tick, stage, runId: runId ?? 'dry', now })
    } else {
      alertMsg = await runRepriceJob({ opts, report, feed, bl: bl.id, channelSettings: settings, ready, apply, tick, stage, runId: runId ?? 'dry' })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    report.errors.push(msg)
    if (e instanceof AbortRun) {
      report.status = 'aborted'
      if (e.alert) alertMsg = { severity: 'high', title: `${opts.job === 'feed' ? 'feed' : 'reprice'} aborted`, lines: [msg], runId }
    } else {
      report.status = 'failed'
      alertMsg = { severity: 'high', title: `${opts.job === 'feed' ? 'feed sync' : 'reprice'} failed`, lines: [msg], runId }
    }
  }

  let alerted = false
  if (alertMsg && apply) alerted = await alert({ ...alertMsg, runId }).catch(() => false)
  report.durationMs = Date.now() - t0
  if (runId) {
    await finishRun(runId, report.status === 'locked' ? 'failed' : report.status, report, report.errors[0] ?? null, report.durationMs, alerted).catch((e) => console.error('[commerce-sync] could not store run:', e))
  }
  return finalizeReport(report, t0, dataDir, runId)
}

function finalizeReport(report: SyncReport, t0: number, dataDir: string, _runId: string | null): SyncReport {
  report.durationMs = Date.now() - t0
  try {
    const dir = path.join(dataDir, 'reports')
    mkdirSync(dir, { recursive: true })
    const stamp = report.startedAt.replace(/[:.]/g, '-')
    writeFileSync(path.join(dir, `sync-${stamp}-${report.job}${report.mode === 'apply' ? '' : '-dry'}.json`), JSON.stringify(report, null, 2))
  } catch (e) {
    report.warnings.push(`could not write report file: ${e instanceof Error ? e.message : e}`)
  }
  return report
}

// ─────────────────────────────────────────────────────────────
// Job 1: PRICELIST + OUTOFSTOCK
// ─────────────────────────────────────────────────────────────
interface JobCtx {
  opts: SyncOptions
  report: SyncReport
  feed: { id: string; code: string; currency: string; stockFlagMeaning: string }
  bl: string
  channelSettings: PriceSyncSettings
  ready: boolean
  apply: boolean
  tick: () => void
  stage: (n: string) => void
  runId: string
}

async function runFeedJob(c: JobCtx & { dataDir: string; now: () => Date }): Promise<AlertMsg | null> {
  const { opts, report, feed, bl, channelSettings: settings, ready, apply, tick, stage, runId } = c
  let alertOut: AlertMsg | null = null

  // 1. files ----------------------------------------------------------------
  const prev = ready ? await loadFileState(feed.id) : new Map()
  const names: Record<FileKey, string> = {
    pricelist: process.env.COMMERCE_FTP_PRICELIST || 'PRICELIST_34286.zip',
    outofstock: process.env.COMMERCE_FTP_OUTOFSTOCK || 'OUTOFSTOCK_ALL.zip',
  }
  const source: FileSource = opts.localDir
    ? { kind: 'local', dir: opts.localDir }
    : { kind: 'ftp', ftp: opts.ftp ?? new SupplierFtp(ftpSettingsFromEnv()), names }
  // Dry-runs always look at the files (full report); writing runs skip what has not changed.
  const force = !!opts.force || !apply
  const acquired = await acquireFiles({ source, dataDir: c.dataDir, runId, prev, force, want: { pricelist: true, outofstock: true }, tick })
  stage('files')

  for (const k of acquired.unchanged) report.files[k] = { unchanged: true }
  if (!Object.keys(acquired.files).length) {
    report.status = 'unchanged'
    report.notes.push('Supplier files have not changed since the last applied run.')
    const stale = prev.get('pricelist') ? (c.now().getTime() - prev.get('pricelist')!.remoteMtime.getTime()) / 3_600_000 : null
    if (stale != null && stale > STALE_FEED_HOURS) {
      report.warnings.push(`Supplier files are ${Math.round(stale)}h old (regenerated daily): the supplier may have stopped publishing.`)
      alertOut = { severity: 'medium', title: 'supplier feed is stale', lines: [`The supplier files have not changed for ${Math.round(stale)} hours (they are normally regenerated daily around 04:23 Romanian time).`] }
    }
    return alertOut
  }

  // 2. parse + validate -----------------------------------------------------
  let pl: PricelistResult | null = null
  let st: StockResult | null = null
  const rowsOf: Partial<Record<FileKey, number>> = {}
  try {
    const f = acquired.files.pricelist
    if (f) { const r = readFeedFile(f.path); pl = parsePricelist(r.buf); rowsOf.pricelist = pl.totalRows }
    const g = acquired.files.outofstock
    if (g) { const r = readFeedFile(g.path); st = parseOutOfStock(r.buf); rowsOf.outofstock = st.totalRows }
  } catch (e) {
    if (e instanceof FeedFormatError) throw new AbortRun(`Corrupt supplier file: ${e.message}`)
    throw e
  }
  stage('parse')
  for (const key of ['pricelist', 'outofstock'] as const) {
    const f = acquired.files[key]
    if (!f) continue
    const rows = rowsOf[key] ?? 0
    report.files[key] = { name: f.name, size: f.size, remoteMtime: f.mtime.toISOString(), sha256: f.sha256, rows, changed: true }
    const p = prev.get(key)
    if (rows === 0) throw new AbortRun(`${f.name} is empty`)
    if (p && rows < p.rows * settings.minRowsRatio) {
      throw new AbortRun(`${f.name} looks truncated: ${rows} rows vs ${p.rows} in the last applied run (limit ${Math.round(settings.minRowsRatio * 100)}%)`)
    }
  }
  if (pl) {
    if (pl.parseErrors / Math.max(1, pl.totalRows) > 0.001) throw new AbortRun(`PRICELIST has ${pl.parseErrors} malformed rows (${pl.errorSamples.slice(0, 3).join('; ')})`)
    if (pl.base.size === 0) throw new AbortRun('PRICELIST contains no base articles')
    if (pl.parseErrors) report.warnings.push(`PRICELIST: ${pl.parseErrors} malformed rows skipped (e.g. ${pl.errorSamples.slice(0, 3).join('; ')})`)
    if (pl.duplicateBaseCodes) report.warnings.push(`PRICELIST: ${pl.duplicateBaseCodes} duplicate base codes (first one kept)`)
  }
  if (st) {
    if (st.parseErrors / Math.max(1, st.totalRows) > 0.001) throw new AbortRun(`OUTOFSTOCK has ${st.parseErrors} malformed rows (${st.errorSamples.slice(0, 3).join('; ')})`)
    if (st.parseErrors) report.warnings.push(`OUTOFSTOCK: ${st.parseErrors} malformed rows skipped`)
  }

  // 3. price inputs -------------------------------------------------------------
  assertFormulaUsable(settings)
  const quote = opts.fx ?? await getFxQuote(settings.sourceCurrency, { dryRun: !apply })
  const pricingRate = settings.applied?.fxRate ?? quote.rate
  report.fx = { rate: quote.rate, date: quote.date, fresh: quote.fresh, pricingRate }
  if (!quote.fresh) report.warnings.push(`BNR rate unavailable, using the last stored one (${quote.date})`)
  if (settings.applied && settings.applied.formulaHash !== formulaHash(settings)) {
    report.warnings.push('The price formula changed since the last reprice: run the reprice job so all prices follow it (new prices from this run already use the new formula).')
  }

  // 4. plan -------------------------------------------------------------------------
  const products = await loadSnapshot(feed.id, bl, ready)
  const reviews = await loadReviews(feed.id, ready)
  stage('snapshot')
  const plan = planFeedSync({
    products, base: pl?.base ?? null, stock: st?.byCode ?? null, knownCodes: pl?.allCodes, reviews, settings, fx: pricingRate, currentMeaning: feed.stockFlagMeaning,
  })
  stage('plan')
  if (plan.deactivationBlocked) {
    report.warnings.push(plan.deactivationBlocked)
    alertOut = { severity: 'high', title: 'too many products missing from the price list', lines: [plan.deactivationBlocked] }
  }
  if (st) {
    report.stats.stockFile = {
      rows: st.totalRows, codes: st.byCode.size, duplicateRows: st.duplicateRows, conflictingDuplicates: st.conflictingDuplicates,
      codesNotInPricelist: plan.stats.stockCodesNotInPricelist, codesNotInPricelistSample: plan.stats.stockCodesNotInPricelistSample,
    }
  }
  if (pl) report.stats.pricelistFile = { rows: pl.totalRows, baseArticles: pl.base.size, parseErrors: pl.parseErrors, similarCodeRows: pl.totalRows - pl.baseRows }

  // 5. apply -----------------------------------------------------------------------------
  let counts: Awaited<ReturnType<typeof applyFeedPlan>> | null = null
  let newCreated = 0
  if (apply) {
    counts = await applyFeedPlan(feed.id, runId, plan, plan.revertedPending, tick)
    if (pl && plan.newItems.length) {
      newCreated = await createNewProducts(feed.id, feed.currency, plan.newItems, runId, tick)
      if (st) {
        const rows = plan.newItems.flatMap((i) => [...(st!.byCode.get(i.code) ?? [])].map(([warehouse, flag]) => ({ code: i.code, warehouse, flag })))
        counts.stockUpserted += await applyStockForCodes(feed.id, rows, tick)
      }
    }
    stage('apply')
    for (const key of ['pricelist', 'outofstock'] as const) {
      const f = acquired.files[key]
      if (f) await saveFileState(feed.id, key, { remoteMtime: f.mtime, size: f.size, sha256: f.sha256, rows: rowsOf[key] ?? 0 })
    }
    if (!opts.localDir) {
      const removed = pruneRaw(c.dataDir, 7, c.now())
      if (removed.length) report.notes.push(`Removed ${removed.length} raw file(s) older than 7 days`)
    }
  }

  // 6. report ----------------------------------------------------------------------------------
  const s = plan.stats
  report.stats = {
    ...report.stats,
    pricelist: pl ? {
      baseArticlesInFeed: s.feedBase, productsInErp: s.dbProducts, matched: s.matched, unchanged: s.unchanged,
      new: s.newProducts, updated: s.costChanged - s.suppressedRejected,
      priceApplied: s.priceApplied, costOnlyNoPricedListing: s.costOnly, queuedForReview: s.queuedForReview, alreadyInReviewQueue: s.alreadyQueued,
      rejectedBefore: s.suppressedRejected, manualOrNonRulePrice: s.manualOrOtherSource,
      deactivated: plan.deactivate.length, reactivated: plan.reactivate.length, deactivationBlocked: plan.deactivationBlocked,
      newSample: plan.newItems.slice(0, 10).map((i) => ({ code: i.code, name: i.nameEn, price: i.price })),
    } : null,
    stock: st ? {
      productsMatched: s.stockProductsMatched, stockRowsChanged: s.stockRowsChanged, activeProductsWithoutStockRow: s.stockMissingForProducts,
      publicAvailabilityChanged: s.availabilityChanged, currentMeaning: feed.stockFlagMeaning,
      publicAvailabilityNow: s.currentMapping, publicAvailabilityWithProposedMapping: s.proposedMapping,
    } : null,
    listingsWithUpdatedAt: plan.touchListingIds.size + (counts?.pricesUpdated ?? plan.priceUpdates.length),
    applied: counts ? { ...counts, newProductsCreated: newCreated } : null,
  }
  report.topPriceChanges = plan.top.map((r) => ({
    code: r.code, oldPrice: r.oldPrice, newPrice: r.newPrice, pct: r.pct, oldCost: r.oldCost, newCost: r.newCost,
    queued: plan.reviewPrice.includes(r),
  }))
  if (counts && counts.priceConflicts) report.warnings.push(`${counts.priceConflicts} row(s) were changed by someone else during the run and were skipped (next run retries)`)

  if (apply && plan.reviewPrice.length && plan.stats.queuedForReview > 0) {
    const biggest = plan.top.filter((r) => plan.reviewPrice.includes(r)).slice(0, 5).map((r) => `${r.code}: ${r.oldPrice} → ${r.newPrice} RON (${r.pct}%)`)
    alertOut = alertOut ?? {
      severity: 'medium', title: 'large price changes need review',
      lines: [`${plan.stats.queuedForReview} price change(s) above ±${settings.maxChangePct}% were NOT applied and wait in the review queue.`, ...biggest],
    }
  }
  if (plan.newItems.length && apply) report.notes.push(`${newCreated} new supplier article(s) created inactive, waiting for approval in the review queue.`)
  report.status = 'success'
  return alertOut
}

// ─────────────────────────────────────────────────────────────
// Job 2: reprice at the BNR rate (or after a formula change)
// ─────────────────────────────────────────────────────────────
async function runRepriceJob(c: JobCtx): Promise<AlertMsg | null> {
  const { opts, report, feed, bl, channelSettings: settings, ready, apply, tick, stage, runId } = c
  assertFormulaUsable(settings)
  const quote = opts.fx ?? await getFxQuote(settings.sourceCurrency, { dryRun: !apply })
  report.fx = { rate: quote.rate, date: quote.date, fresh: quote.fresh, pricingRate: quote.rate }
  stage('fx')
  const hash = formulaHash(settings)
  const applied = settings.applied
  let alertOut: AlertMsg | null = null

  if (!quote.fresh) {
    report.warnings.push(`BNR rate unavailable, using the last stored one (${quote.date})`)
    if (applied && applied.fxDate === quote.date && applied.formulaHash === hash) {
      report.status = 'unchanged'
      report.notes.push('BNR is unreachable and prices already use the latest stored rate.')
      return { severity: 'low', title: 'BNR rate could not be fetched', lines: ['Prices were not repriced; the last stored rate is already applied.'] }
    }
  }
  if (!opts.force && applied && applied.formulaHash === hash && settings.fxMinChangePct > 0
      && Math.abs(quote.rate / applied.fxRate - 1) * 100 < settings.fxMinChangePct) {
    report.status = 'unchanged'
    report.notes.push(`Rate ${quote.rate} moved ${(Math.abs(quote.rate / applied.fxRate - 1) * 100).toFixed(3)}% since ${applied.fxDate} (${applied.fxRate}), below the ${settings.fxMinChangePct}% threshold: prices kept.`)
    return null
  }
  if (!opts.force && applied && applied.fxRate === quote.rate && applied.formulaHash === hash) {
    report.status = 'unchanged'
    report.notes.push(`Rate (${quote.rate} on ${quote.date}) and formula are unchanged since the last reprice.`)
    return null
  }

  const products = await loadSnapshot(feed.id, bl, ready)
  stage('snapshot')
  const plan: RepricePlan = planReprice(products, settings, quote.rate)
  stage('plan')
  if (plan.review.length > MAX_BULK_REVIEW) {
    throw new AbortRun(`This reprice would move ${plan.review.length} prices by more than ±${settings.maxChangePct}% (a formula/rate jump, not routine drift). Nothing was applied — review the formula (VAT/markup/currency) and rerun.`)
  }

  let res: { updated: number; conflicts: number; queued: number } | null = null
  if (apply) {
    res = await applyReprice(feed.id, runId, plan.updates, plan.review, tick)
    stage('apply')
    await saveAppliedState(bl, { fxRate: quote.rate, fxDate: quote.date, formulaHash: hash, at: new Date().toISOString() })
  }
  report.stats = {
    rateBefore: applied ? { fxRate: applied.fxRate, fxDate: applied.fxDate } : null,
    rateNow: { fxRate: quote.rate, fxDate: quote.date },
    listingsChecked: plan.updates.length + plan.review.length + plan.unchanged,
    priceChanged: plan.updates.length, queuedForReview: plan.review.length, unchanged: plan.unchanged,
    skippedManualOrNonRule: plan.skippedNotRule, skippedNoPrice: plan.skippedNoPrice,
    applied: res,
  }
  report.topPriceChanges = plan.top.map((r) => ({ code: r.code, oldPrice: r.oldPrice, newPrice: r.newPrice, pct: r.pct, oldCost: r.cost, newCost: r.cost, queued: plan.review.includes(r) }))
  if (res?.conflicts) report.warnings.push(`${res.conflicts} listing(s) changed during the run and were skipped`)
  if (apply && plan.review.length) {
    alertOut = { severity: 'medium', title: 'large price changes need review', lines: [`${plan.review.length} price(s) would move by more than ±${settings.maxChangePct}% on this reprice and were queued instead of applied.`] }
  }
  report.status = 'success'
  return alertOut
}

export type { FeedPlan }
