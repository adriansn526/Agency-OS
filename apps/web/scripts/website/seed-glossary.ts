/**
 * Seeds the service glossary (draft entries) and links company entries to its categories. Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/seed-glossary.ts --line intraconstruct [--apply]
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applyGlossary, planGlossary } from '../../lib/website/glossary/seed'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply]')
  const p = await planGlossary(v.line)
  console.log(`Glosar: colecția ${p.glossaryCollection ? 'există' : 'va fi creată'} | intrări de creat: ${p.entriesToCreate.length} (existente: ${p.entriesExisting})`)
  console.log(`Companii: colecția ${p.companyCollection ? 'există' : 'NU există'} | câmpul „servicii”: ${p.companyFieldMissing ? 'va fi adăugat' : 'ok'} | de legat: ${p.backfill.length} | deja legate: ${p.alreadyLinked}`)
  if (Object.keys(p.unmapped).length) console.log('Fără categorie:', p.unmapped)
  if (!v.apply) { console.log('\nREGIM DE PROBĂ: nu s-a scris nimic. Adaugă --apply.'); return }
  const r = await applyGlossary(p)
  console.log(`\nGata: ${r.created} intrări create (draft), câmp adăugat: ${r.fieldAdded ? 'da' : 'nu'}, ${r.linked} companii legate.`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
