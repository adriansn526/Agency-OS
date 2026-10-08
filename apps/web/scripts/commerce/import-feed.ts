/**
 * CLI: run a supplier feed import.
 *
 *   npx tsx scripts/commerce/import-feed.ts gr-main
 */
import { runFeedImport } from '../../lib/commerce/feed/import'

async function main() {
  const code = process.argv[2] || 'gr-main'
  const t = Date.now()
  const res = await runFeedImport(code, 'cli')
  console.log(JSON.stringify(res.stats, null, 2))
  console.log(`✔ Import ${res.runId} finished in ${((Date.now() - t) / 1000).toFixed(1)}s`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Import failed:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
