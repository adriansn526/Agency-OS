/** Service layer for the admin "Sincronizare preț și stoc" page and its API routes. */
import { z } from 'zod'
import { db } from '@repo/db'
import { MarkupOverride, PriceSyncSettings, parsePriceSyncSettings } from './settings'
import { runSupplierSync, type JobName } from './run'
import { syncTablesReady } from './store'

const SLUG = () => process.env.COMMERCE_SYNC_BUSINESS_LINE || 'ecaroseria'
const FEED = () => process.env.COMMERCE_SYNC_FEED || 'gr-main'

export const SettingsPatch = z.object({
  enabled: z.boolean(),
  sourceCurrency: z.enum(['EUR', 'USD', 'RON']),
  vatPct: z.number().min(0).max(100),
  markupPct: z.number().min(0).max(500),
  markupOverrides: z.array(MarkupOverride).max(200),
  approveMarkup: z.boolean(),
  rounding: z.enum(['none', '99', '90', 'integer']),
  minPriceRon: z.number().min(0).max(1e6),
  maxChangePct: z.number().min(1).max(1000),
  fxMinChangePct: z.number().min(0).max(10),
  minRowsRatio: z.number().min(0.5).max(1),
  maxDeactivatePct: z.number().min(0).max(100),
  vatIncludedLabel: z.boolean().nullable(),
  stockMapping: z.enum(['unknown', 'supplier_confirm']),
}).partial()

export async function getSyncOverview() {
  const bl = await db.businessLine.findUnique({ where: { slug: SLUG() }, select: { id: true, name: true } })
  const feed = await db.commerceSupplierFeed.findUnique({ where: { code: FEED() }, select: { id: true, code: true, stockFlagMeaning: true, currency: true } })
  if (!bl || !feed) return { ready: false as const, error: 'Canalul sau feed-ul nu există' }
  const channel = await db.commerceChannel.findUnique({ where: { businessLineId: bl.id }, select: { config: true } })
  const settings = parsePriceSyncSettings(channel?.config)
  const ready = await syncTablesReady()
  const rate = await db.commerceExchangeRate.findFirst({ where: { currency: settings.sourceCurrency }, orderBy: { date: 'desc' } })
  const base = { businessLine: bl.name, feed, settings, latestStoredRate: rate ? { rate: Number(rate.rate), date: rate.date.toISOString().slice(0, 10) } : null }
  if (!ready) return { ready: false as const, ...base, error: 'Tabelele de sincronizare nu există: aplică packages/db/prisma/sql/commerce_supplier_sync.sql' }

  const [runs, files, counts, reviews] = await Promise.all([
    db.commerceSyncRun.findMany({ where: { feedId: feed.id }, orderBy: { startedAt: 'desc' }, take: 20 }),
    db.commerceSyncFile.findMany({ where: { feedId: feed.id } }),
    db.$queryRaw<Array<{ kind: string; n: bigint }>>`SELECT kind, count(*) AS n FROM "CommerceSyncReview" WHERE "feedId" = ${feed.id} AND status = 'pending' GROUP BY kind`,
    db.$queryRaw<Array<{
      id: string; kind: string; supplierCode: string; name: string | null; oldCost: string | null; newCost: string | null
      oldPriceRon: string | null; newPriceRon: string | null; changePct: string | null; createdAt: Date
    }>>`
      SELECT r.id, r.kind, r."supplierCode", COALESCE(p."nameRo", p."nameEn") AS name, r."oldCost"::text, r."newCost"::text,
             r."oldPriceRon"::text, r."newPriceRon"::text, r."changePct"::text, r."createdAt"
      FROM "CommerceSyncReview" r LEFT JOIN "CommerceProduct" p ON p.id = r."productId"
      WHERE r."feedId" = ${feed.id} AND r.status = 'pending'
      ORDER BY r.kind, abs(COALESCE(r."changePct", 0)) DESC, r."createdAt" DESC LIMIT 200`,
  ])
  return {
    ready: true as const, ...base,
    runs: runs.map((r) => ({ id: r.id, job: r.job, status: r.status, dryRun: r.dryRun, triggeredBy: r.triggeredBy, startedAt: r.startedAt, durationMs: r.durationMs, error: r.error, alerted: r.alerted, stats: r.stats })),
    files: files.map((f) => ({ name: f.name, remoteMtime: f.remoteMtime, size: f.size, rows: f.rows, appliedAt: f.appliedAt })),
    pendingCounts: Object.fromEntries(counts.map((c) => [c.kind, Number(c.n)])),
    reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt })),
    running: runs.some((r) => r.status === 'running' && !r.dryRun) || inFlight.size > 0,
  }
}

export async function saveSyncSettings(patch: z.infer<typeof SettingsPatch>): Promise<PriceSyncSettings> {
  const bl = await db.businessLine.findUnique({ where: { slug: SLUG() }, select: { id: true } })
  if (!bl) throw new Error('Business line not found')
  const channel = await db.commerceChannel.findUnique({ where: { businessLineId: bl.id }, select: { config: true } })
  if (!channel) throw new Error('Channel not found')
  const cur = parsePriceSyncSettings(channel.config)
  const { approveMarkup, stockMapping, ...fields } = patch
  const next = PriceSyncSettings.parse({ ...cur, ...fields })

  // Any change to a markup value invalidates the approval; it is only set again by an explicit approveMarkup.
  const markupChanged = next.markupPct !== cur.markupPct || JSON.stringify(next.markupOverrides) !== JSON.stringify(cur.markupOverrides)
  const hasMarkup = next.markupPct > 0 || next.markupOverrides.some((o) => o.markupPct > 0)
  if (!hasMarkup) next.markupApprovedAt = null
  else if (approveMarkup) next.markupApprovedAt = new Date().toISOString()
  else if (markupChanged) next.markupApprovedAt = null

  const json = JSON.stringify(next)
  await db.$executeRaw`
    UPDATE "CommerceChannel"
    SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('priceSync', ${json}::jsonb), "updatedAt" = now()
    WHERE "businessLineId" = ${bl.id}`

  if (stockMapping) {
    const feed = await db.commerceSupplierFeed.findUnique({ where: { code: FEED() }, select: { id: true, stockFlagMeaning: true } })
    if (feed && feed.stockFlagMeaning !== stockMapping) {
      await db.commerceSupplierFeed.update({ where: { id: feed.id }, data: { stockFlagMeaning: stockMapping } })
      // Public availability of products that are out in every warehouse flips with the mapping: tell the sitemap.
      await db.$executeRaw`
        UPDATE "CommerceListing" l SET "updatedAt" = now()
        WHERE l."businessLineId" = ${bl.id} AND l."isActive"
          AND EXISTS (SELECT 1 FROM "CommerceStock" s WHERE s."productId" = l."productId")
          AND NOT EXISTS (SELECT 1 FROM "CommerceStock" s WHERE s."productId" = l."productId" AND s."rawFlag" = 1)`
    }
  }
  return next
}

const inFlight = new Map<string, Promise<unknown>>()

/** Starts a run in this process and returns immediately; progress is read back from the run history. */
export async function startBackgroundRun(job: JobName, dryRun: boolean, userId: string): Promise<{ started: boolean; reason?: string }> {
  const key = `${job}`
  if (inFlight.size > 0) return { started: false, reason: 'O sincronizare rulează deja' }
  if (await syncTablesReady()) {
    const feed = await db.commerceSupplierFeed.findUnique({ where: { code: FEED() }, select: { id: true } })
    const running = feed ? await db.commerceSyncRun.findFirst({ where: { feedId: feed.id, status: 'running', dryRun: false, startedAt: { gt: new Date(Date.now() - 60 * 60_000) } } }) : null
    if (running && !dryRun) return { started: false, reason: 'O sincronizare rulează deja' }
  }
  const p = runSupplierSync({ job, dryRun, triggeredBy: `admin:${userId}`, force: true })
    .catch((e) => console.error('[commerce-sync] background run failed:', e instanceof Error ? e.message : e))
    .finally(() => { inFlight.delete(key) })
  inFlight.set(key, p)
  return { started: true }
}
