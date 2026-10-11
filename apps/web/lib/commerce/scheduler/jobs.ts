/** The jobs the scheduler can run. Adding one = adding an entry here (and nothing else): the UI lists whatever is registered. */
import { refreshPartnerCoords } from '../partners/coords'
import { runSupplierSync, type SyncReport } from '../sync/run'
import type { Schedule } from './schedule'

export interface JobResult {
  status: 'success' | 'unchanged' | 'skipped' | 'aborted' | 'failed'
  summary: Record<string, unknown>
  error?: string | null
}

export interface JobDef {
  key: string
  label: string
  description: string
  defaultSchedule: Schedule
  /** A scheduled run that is later than this (server was down/restarting) is skipped instead of fired late. */
  graceMs: number
  /** The run is reported as failed after this long (the underlying work has its own limits too). */
  timeoutMs: number
  /** Dry-run capability shown as a button in the UI. */
  supportsDryRun: boolean
  run(opts: { dryRun: boolean }): Promise<JobResult>
}

const H = 3_600_000
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

function fromSync(r: SyncReport): JobResult {
  const status = r.status === 'locked' ? 'skipped' : r.status
  const stats = r.stats as { pricelist?: Record<string, unknown> | null; stock?: Record<string, unknown> | null; priceChanged?: number; queuedForReview?: number }
  return {
    status,
    error: r.errors[0] ?? null,
    summary: {
      mode: r.mode, runId: r.runId, durationMs: r.durationMs, note: r.notes[0] ?? null, warnings: r.warnings.length,
      ...(r.job === 'feed'
        ? { new: stats.pricelist?.new, updated: stats.pricelist?.updated, queuedForReview: stats.pricelist?.queuedForReview, stockRowsChanged: stats.stock?.stockRowsChanged }
        : { priceChanged: stats.priceChanged, queuedForReview: stats.queuedForReview }),
    },
  }
}

export const JOBS: Record<string, JobDef> = {
  feed_sync: {
    key: 'feed_sync',
    label: 'Sincronizare preț și stoc (furnizor)',
    description: 'Descarcă PRICELIST și OUTOFSTOCK de pe FTP, validează și actualizează costuri, prețuri și stoc. Furnizorul regenerează fișierele în jur de 04:23; rulările fără fișiere noi nu fac nimic. Scrie doar dacă „Scriere activată” este bifat în Sincronizare preț și stoc, altfel rulează ca dry-run.',
    defaultSchedule: { mode: 'interval', days: ALL_DAYS, everyHours: 2, from: '05:00', to: '13:00' },
    graceMs: 3 * H, timeoutMs: 50 * 60_000, supportsDryRun: true,
    run: async ({ dryRun }) => fromSync(await runSupplierSync({ job: 'feed', dryRun, triggeredBy: 'scheduler' })),
  },
  reprice: {
    key: 'reprice',
    label: 'Repreț la cursul BNR',
    description: 'Recalculează prețurile din costul stocat când s-a schimbat cursul BNR sau formula (BNR publică în jur de 13:00). Fără schimbare de curs nu face nimic.',
    defaultSchedule: { mode: 'times', days: [1, 2, 3, 4, 5], times: ['13:30', '15:30'] },
    graceMs: 2 * H, timeoutMs: 50 * 60_000, supportsDryRun: true,
    run: async ({ dryRun }) => fromSync(await runSupplierSync({ job: 'reprice', dryRun, triggeredBy: 'scheduler' })),
  },
  partner_coords: {
    key: 'partner_coords',
    label: 'Coordonate service-uri partenere',
    description: 'Reîmprospătează coordonatele Google ale partenerilor înainte să treacă 30 de zile (prin Place ID) și geocodează cu OpenStreetMap ce lipsește. Fără parteneri sau cu coordonate valide nu face nimic.',
    defaultSchedule: { mode: 'times', days: ALL_DAYS, times: ['06:15'] },
    graceMs: 6 * H, timeoutMs: 10 * 60_000, supportsDryRun: true,
    run: async ({ dryRun }) => {
      const r = await refreshPartnerCoords({ dryRun })
      const changed = r.refreshedGoogle + r.geocodedOsm + r.clearedExpired
      return { status: r.failed > 0 && changed === 0 ? 'failed' : r.checked === 0 ? 'unchanged' : 'success', summary: { ...r }, error: r.notes.find((n) => !n.startsWith('dry-run')) ?? null }
    },
  },
}
