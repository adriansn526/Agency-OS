/**
 * Puts the block templates on the seeded price pages and service categories that have no layout yet. Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/seed-content-layouts.ts --line intraconstruct [--apply]
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applyTemplates, planTemplates } from '../../lib/website/content/seed'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply]')
  const p = await planTemplates(v.line)
  console.log(`Pagini de prețuri: ${p.prices.length} (șablon și/sau FAQ) | categorii de servicii: ${p.services.length} | sărite (au deja blocuri): ${p.skipped}`)
  if (!v.apply) { console.log('\nREGIM DE PROBĂ: nu s-a scris nimic. Adaugă --apply.'); return }
  const r = await applyTemplates(p)
  console.log(`\nGata: ${r.layouts} aranjări puse, ${r.faqs} liste FAQ completate. Nimic nu e publicat (șabloanele conțin [DE COMPLETAT]).`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
