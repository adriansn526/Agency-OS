/**
 * Setup of the phone-then-SMS pilot. Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/pilot-setup.ts --line intraconstruct                 # what would change
 *   ... --apply                                                                                         # CRM fields + pilot mark + segment
 *   ... --export /home/asns/data/privat/pilot-apeluri.csv                                               # the list to call (personal data, outside the repo)
 */
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applyPilot, assertOutsideRepo, planPilot, toCsv } from '../../lib/website/pilot/setup'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false }, export: { type: 'string' } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply] [--export <fișier>]')
  const line = await db.businessLine.findUnique({ where: { slug: v.line }, select: { id: true } })
  if (!line) throw new Error('Linia nu există')
  const plan = await planPilot(line.id)
  console.log(`Firme de apelat: ${plan.callable} (fără telefon, omise: ${plan.withoutPhone})`)
  console.log(`Câmpuri CRM de adăugat: ${plan.fieldsToAdd.join(', ') || '—'} | firme de marcat „pilot”: ${plan.leadsToMark} | segmentul „Pilot — acord SMS”: ${plan.segmentExists ? 'există' : 'va fi creat'}`)
  if (v.export) {
    const file = assertOutsideRepo(v.export)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, toCsv(plan.rows), { mode: 0o600 })
    fs.chmodSync(file, 0o600)
    console.log(`Lista de apelat (${plan.rows.length} rânduri) scrisă în ${file} (permisiuni doar pentru proprietar)`)
  }
  if (!v.apply) { console.log('\nREGIM DE PROBĂ: nu s-a scris nimic în CRM. Adaugă --apply.'); return }
  const r = await applyPilot(line.id, plan)
  console.log(`\nGata: ${r.fieldsAdded} câmpuri adăugate, ${r.marked} firme marcate pilot, segment ${r.segmentId ? 'creat' : 'existent'}.`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
