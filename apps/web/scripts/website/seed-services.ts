/**
 * Seeds the new service categories and the written pilot pages of the glossary (all DRAFT). Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/seed-services.ts --line intraconstruct [--apply] [--force] [--only slug,slug]
 *
 * --force rewrites the layout and lists of pages that already have blocks (the previous layout stays in the history).
 * --only a,b writes just those pages (no new categories, no re-routing): e.g. `--only hidroizolatii --force` for the pillar of the hidroizolații hub.
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applyServices, planServices } from '../../lib/website/services/seed'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false }, force: { type: 'boolean', default: false }, only: { type: 'string' } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply] [--force] [--only slug,slug]')
  const only = v.only ? v.only.split(',').map((x) => x.trim()).filter(Boolean) : undefined
  const p = await planServices(v.line, v.force, only)
  console.log(`Câmpuri de adăugat în colecție: ${p.fieldsToAdd.join(', ') || 'niciunul'}`)
  console.log(`Categorii noi (draft): ${p.categoriesToCreate.map((c) => c.slug).join(', ') || 'niciuna'}`)
  console.log(`Pagini de scris: ${p.pagesToWrite.map((c) => c.slug).join(', ') || 'niciuna'} | sărite (au deja blocuri): ${p.pagesSkipped.join(', ') || '-'}`)
  console.log(`Pagini de prețuri mutate la categorii mai potrivite (doar draft): ${p.reroutes.length ? p.reroutes.map((r) => `${r.slug}: ${r.from} → ${r.to}`).join(', ') : 'niciuna'}`)
  if (p.problems.length) { console.log('\nPROBLEME:\n' + p.problems.join('\n')); process.exitCode = 1; return }
  if (!v.apply) { console.log('\nREGIM DE PROBĂ: nu s-a scris nimic. Adaugă --apply.'); return }
  const r = await applyServices(p)
  console.log(`\nGata: ${r.created} categorii create, ${r.written} pagini scrise (toate rămân draft), ${r.rerouted} pagini de prețuri mutate.`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
