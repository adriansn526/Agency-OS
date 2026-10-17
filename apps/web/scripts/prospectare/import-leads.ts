/**
 * Imports the prepared prospecting leads into a business line.
 *
 *   DRY RUN (default, writes nothing, reads the CRM to detect duplicates and overlaps):
 *     npx tsx --env-file=.env.local scripts/prospectare/import-leads.ts \
 *        --file ../../docs/prospectare/import-pregatit/lead_import_constructii_active.csv --line intraconstruct
 *
 *   WRITE (needs the number announced by the dry run):
 *     … --apply --confirm-count=<de_creat>
 *
 *   UNDO one import (only leads nobody touched; dry run unless --apply):
 *     … --rollback --line intraconstruct --source prospectare_risco --external-source prospectare-2026-10 [--apply]
 *
 * Options: --entity-type parteneri  --status prospect  --source prospectare_risco  --limit N  --report <path.json>
 */
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applyImport, checkConfirm, DEFAULT_SOURCE, planImport, rollbackImport, summarize } from '../../lib/prospectare/import-leads'

function target() {
  try { const u = new URL(process.env.DATABASE_URL ?? ''); return `${u.hostname}:${u.port || '5432'}${u.pathname}` } catch { return '(DATABASE_URL lipsește sau e invalid)' }
}

async function main() {
  const { values: v } = parseArgs({
    options: {
      file: { type: 'string' }, line: { type: 'string' }, 'entity-type': { type: 'string' }, status: { type: 'string' }, source: { type: 'string' }, 'external-source': { type: 'string' },
      limit: { type: 'string' }, report: { type: 'string' }, apply: { type: 'boolean', default: false }, 'confirm-count': { type: 'string' }, rollback: { type: 'boolean', default: false },
    },
  })
  if (!v.line) throw new Error('Lipsește --line <slug>')
  console.log(`Bază de date: ${target()}`)

  if (v.rollback) {
    const r = await rollbackImport({ line: v.line, source: v.source ?? DEFAULT_SOURCE, externalSource: v['external-source'], status: v.status ?? 'prospect', apply: v.apply })
    console.log(`${v.apply ? 'ANULARE' : 'ANULARE (probă)'}: găsite ${r.found}, de șters ${r.deletable}, atinse (păstrate) ${r.touched} ${JSON.stringify(r.touchedReasons)}, șterse ${r.deleted}`)
    if (!v.apply) console.log('Nimic nu a fost șters. Adaugă --apply pentru a șterge.')
    return
  }

  if (!v.file) throw new Error('Lipsește --file <csv>')
  const plan = await planImport({ file: path.resolve(v.file), line: v.line, entityType: v['entity-type'], status: v.status, source: v.source, limit: v.limit ? Number(v.limit) : undefined })
  const summary = summarize(plan)
  const reportPath = path.resolve(v.report ?? path.join(path.dirname(path.resolve(v.file)), `import-raport-${v.apply ? 'aplicat' : 'proba'}.json`))
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 1))

  const s = plan.stats
  console.log(`\nȚintă: ${summary.tinta.linie} · tip ${plan.entityType} · etapa ${plan.status} · source ${plan.source}`)
  console.log(`Rânduri citite: ${plan.rowsRead} | de creat: ${plan.toCreate.length} | deja importate (sărite): ${plan.skippedExisting} | invalide: ${plan.invalid.length}`)
  console.log(`  fara_contact: ${s.fara_contact} | suprapunere_crm: ${s.suprapunere_crm} ${JSON.stringify(plan.overlapByLine)} | cu mobil: ${s.cu_mobil} | cu email: ${s.cu_email}`)
  console.log(`  email='N/A': ${s.email_na} | contactPerson='N/A': ${s.contactPerson_na} | fără telefon (NULL): ${s.fara_telefon} | contact partajat: ${s.contact_partajat}`)
  if (Object.keys(plan.warnings).length) console.log(`  avertismente: ${JSON.stringify(plan.warnings)}`)
  if (plan.invalid.length) console.log(`  invalide (primele 5): ${JSON.stringify(plan.invalid.slice(0, 5))}`)
  console.log(`Raport: ${reportPath}`)

  if (!v.apply) {
    console.log(`\nREGIM DE PROBĂ: nu s-a scris nimic. Pentru scriere: --apply --confirm-count=${plan.toCreate.length}`)
    return
  }
  checkConfirm(plan.toCreate.length, v['confirm-count'])
  const t0 = Date.now()
  const r = await applyImport(plan, { onProgress: (d, t) => process.stdout.write(`\r  scrise ${d}/${t}`) })
  console.log(`\nGata: ${r.created} lead-uri create din ${r.planned} planificate în ${Math.round((Date.now() - t0) / 1000)} s.`)
  console.log(`Anulare (doar lead-urile neatinse): --rollback --line ${plan.line.slug} --source ${plan.source} --external-source ${plan.externalSources[0]} [--apply]`)
}

main().catch((e) => { console.error('EȘEC:', e instanceof Error ? e.message : e); process.exitCode = 1 }).finally(() => db.$disconnect())
