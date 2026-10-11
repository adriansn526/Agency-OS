/**
 * CLI: keep partner coordinates valid (Google Place ID refresh before the 30-day limit, OpenStreetMap fallback).
 *
 *   npx tsx --env-file=.env.local scripts/commerce/refresh-partner-coords.ts [--dry-run]
 *
 * Daily is plenty (see docs/commerce-supplier-sync.md for the crontab line style). Exit code 1 only on a crash.
 */
import { refreshPartnerCoords } from '../../lib/commerce/partners/coords'

refreshPartnerCoords({ dryRun: process.argv.includes('--dry-run') })
  .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0) })
  .catch((e) => { console.error('Coordinate refresh failed:', e instanceof Error ? e.message : e); process.exit(1) })
