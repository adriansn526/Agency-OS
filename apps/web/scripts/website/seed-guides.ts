/**
 * Seeds the guides of a service hub (collection "ghiduri", all DRAFT). Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/seed-guides.ts --line intraconstruct [--apply] [--force]
 *
 * --force rewrites the layout and lists of guides that already exist (the previous layout stays in the history).
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applyGuides, planGuides } from '../../lib/website/guides/seed'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false }, force: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply] [--force]')
  const p = await planGuides(v.line, v.force)
  console.log(`Ghiduri: colecția ${p.collection ? 'există' : 'va fi creată'} | de creat: ${p.toCreate.map((g) => `/ghiduri/${g.slug}`).join(', ') || 'niciunul'}`)
  console.log(`De rescris (--force): ${p.toRewrite.map((g) => g.slug).join(', ') || '-'} | sărite (există): ${p.skipped.join(', ') || '-'}`)
  if (p.problems.length) { console.log('\nPROBLEME:\n' + p.problems.join('\n')); process.exitCode = 1; return }
  if (!v.apply) { console.log('\nREGIM DE PROBĂ: nu s-a scris nimic. Adaugă --apply.'); return }
  const r = await applyGuides(p)
  console.log(`\nGata: ${r.created} ghiduri create, ${r.rewritten} rescrise (toate rămân draft).`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
