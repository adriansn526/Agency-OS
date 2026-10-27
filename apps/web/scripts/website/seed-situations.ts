/**
 * Seeds the situation pages of a category (glossary entries of type "situație", all DRAFT and ticked "în construcție"). Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/seed-situations.ts --line intraconstruct [--apply] [--force]
 *
 * --force rewrites the layout and lists of situations that already exist (the previous layout stays in the history).
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applySituations, planSituations } from '../../lib/website/situations/seed'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false }, force: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply] [--force]')
  const p = await planSituations(v.line, v.force)
  console.log(`Situații de creat: ${p.toCreate.map((g) => g.slug).join(', ') || 'niciuna'}${p.addOption ? ' | se adaugă opțiunea „situație” la câmpul Tip' : ''}`)
  console.log(`De rescris (--force): ${p.toRewrite.map((g) => g.slug).join(', ') || '-'} | sărite (există): ${p.skipped.join(', ') || '-'}`)
  if (p.problems.length) { console.log('\nPROBLEME:\n' + p.problems.join('\n')); process.exitCode = 1; return }
  if (!v.apply) { console.log('\nREGIM DE PROBĂ: nu s-a scris nimic. Adaugă --apply.'); return }
  const r = await applySituations(p)
  console.log(`\nGata: ${r.created} situații create, ${r.rewritten} rescrise (toate rămân draft).`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
