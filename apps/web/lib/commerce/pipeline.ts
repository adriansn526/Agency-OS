/**
 * Daily commerce pipeline: feed import → (limited) translation → listings & prices.
 * Used by the cron route and the admin "run now" action.
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import { db } from '@repo/db'
import { runFeedImport } from './feed/import'
import { translatePendingNames } from './translate'
import { syncListingsAndPrices } from './listings'
import { sendTelegramAlert } from '../notifications/telegram'

export interface PipelineResult {
  feeds: { code: string; ok: boolean; runId?: string; error?: string }[]
  translate?: unknown
  prices: { businessLine: string; ok: boolean; result?: unknown; error?: string }[]
}

/** Constant-time check of `Authorization: Bearer <CRON_SECRET>`. Fails closed if the secret is unset. */
export function isAuthorizedCron(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || secret.length < 16 || !authHeader) return false
  const a = createHash('sha256').update(authHeader).digest()
  const b = createHash('sha256').update(`Bearer ${secret}`).digest()
  return timingSafeEqual(a, b)
}

export async function runCommercePipeline(opts: { triggeredBy: string; translateLimit?: number }): Promise<PipelineResult> {
  const result: PipelineResult = { feeds: [], prices: [] }

  const feeds = await db.commerceSupplierFeed.findMany({ where: { isActive: true }, select: { code: true } })
  for (const f of feeds) {
    try {
      const r = await runFeedImport(f.code, opts.triggeredBy)
      result.feeds.push({ code: f.code, ok: true, runId: r.runId })
    } catch (e) {
      result.feeds.push({ code: f.code, ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  const limit = opts.translateLimit ?? 1500
  if (limit > 0 && process.env.GEMINI_API_KEY) {
    try {
      result.translate = await translatePendingNames({ limit, batchSize: 60, concurrency: 3 })
    } catch (e) {
      result.translate = { error: e instanceof Error ? e.message : String(e) }
    }
  }

  const channels = await db.commerceChannel.findMany({
    where: { isEnabled: true },
    select: { businessLineId: true, businessLine: { select: { slug: true } } },
  })
  for (const c of channels) {
    try {
      const r = await syncListingsAndPrices(c.businessLineId)
      result.prices.push({ businessLine: c.businessLine.slug, ok: true, result: r })
    } catch (e) {
      result.prices.push({ businessLine: c.businessLine.slug, ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  const failures = [
    ...result.feeds.filter((f) => !f.ok).map((f) => `feed ${f.code}: ${f.error}`),
    ...result.prices.filter((p) => !p.ok).map((p) => `prices ${p.businessLine}: ${p.error}`),
  ]
  if (failures.length) {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    await sendTelegramAlert(`⚠️ <b>Commerce pipeline</b>: ${failures.length} erori\n${esc(failures.join('\n').slice(0, 3000))}`, 'HTML')
      .catch(() => false)
  }
  return result
}
