/**
 * Seeds the SEO price pages (draft entries of the "preturi" collection). Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/seed-prices.ts --line intraconstruct [--apply]
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applyPrices, planPrices } from '../../lib/website/prices/seed'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply]')
  const p = await planPrices(v.line)
  console.log(`Prețuri: colecția ${p.collection ? 'există' : 'va fi creată'} | pagini de creat: ${p.entriesToCreate.length} (existente: ${p.entriesExisting})`)
  for (const e of p.entriesToCreate) console.log(`  /preturi/${e.slug}  (${e.volume} căutări/lună)`)
  if (!v.apply) { console.log('\nREGIM DE PROBĂ: nu s-a scris nimic. Adaugă --apply.'); return }
  const r = await applyPrices(p)
  console.log(`\nGata: ${r.created} pagini create (draft).`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
