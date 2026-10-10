/**
 * CLI: supplier price & stock sync.
 *
 *   npx tsx --env-file=.env.local scripts/commerce/sync-supplier.ts --job=feed --dry-run
 *   npx tsx --env-file=.env.local scripts/commerce/sync-supplier.ts --job=feed --local-dir=/home/asns/data/ecaroseria-feed/extracted --dry-run
 *   npx tsx --env-file=.env.local scripts/commerce/sync-supplier.ts --job=reprice
 *   npx tsx --env-file=.env.local scripts/commerce/sync-supplier.ts --job=all
 *
 * Options: --dry-run  --force  --local-dir=DIR  --data-dir=DIR  --json (print the whole report)
 * Writes happen only when the channel setting priceSync.enabled is true (otherwise the run is a forced dry-run).
 * Exit code: 0 success / unchanged / skipped (another run in progress), 1 failed or aborted.
 */
import { runSupplierSync, type JobName, type SyncReport } from '../../lib/commerce/sync/run'

function arg(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return undefined
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : 'true'
}

function summary(r: SyncReport): string {
  const lines = [`[${r.job}] ${r.status} (${r.mode}) in ${(r.durationMs / 1000).toFixed(1)}s${r.runId ? ` run=${r.runId}` : ''}`]
  for (const n of r.notes) lines.push(`  note: ${n}`)
  for (const w of r.warnings) lines.push(`  warn: ${w}`)
  for (const e of r.errors) lines.push(`  ERROR: ${e}`)
  return lines.join('\n')
}

async function main() {
  const jobArg = arg('job') ?? 'feed'
  const jobs: JobName[] = jobArg === 'all' ? ['feed', 'reprice'] : jobArg === 'feed' || jobArg === 'reprice' ? [jobArg] : []
  if (!jobs.length) throw new Error('--job must be feed, reprice or all')
  let failed = false
  for (const job of jobs) {
    const report = await runSupplierSync({
      job,
      dryRun: arg('dry-run') === 'true',
      force: arg('force') === 'true',
      localDir: arg('local-dir'),
      dataDir: arg('data-dir'),
      triggeredBy: 'cli',
    })
    console.log(arg('json') === 'true' ? JSON.stringify(report, null, 2) : summary(report))
    if (report.status === 'failed' || report.status === 'aborted') failed = true
  }
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error('Sync failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
