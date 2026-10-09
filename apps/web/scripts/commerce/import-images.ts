/**
 * Import product image references from the public bucket (read-only).
 *   npx tsx --env-file=.env.local scripts/commerce/import-images.ts [--dry-run]
 * Nightly: see scripts/commerce/import-images-cron.sh
 */
import { runImageImport } from '../../lib/commerce/images/import'

runImageImport({ dryRun: process.argv.includes('--dry-run') })
  .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0) })
  .catch((e) => { console.error('[import-images] FAILED:', e instanceof Error ? e.message : e); process.exit(1) })
