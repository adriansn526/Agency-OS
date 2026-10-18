/**
 * Adds the partner-invitation templates (email + SMS) to the Marketing templates of a line, as DRAFTS: unfinished spots stay as [DE COMPLETAT: …] and a message
 * containing one is refused at delivery. Existing templates with the same name are left alone. Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/marketing/seed-partner-templates.ts --line intraconstruct [--apply]
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'

export const TEMPLATES = [
  {
    name: 'Invitație partener — email (ciornă)', channel: 'email', subject: 'Am pregătit pagina {{company_name}} în portalul IntraConstruct',
    body: `Bună ziua,

Am pregătit pentru {{company_name}} o pagină în IntraConstruct.ro, portalul firmelor de construcții și instalații, folosind date publice (ONRC și site-ul firmei). O puteți vedea aici, privat, până la {{preview_expires}}:
{{preview_link}}

Dacă vă convine, o publicăm și puteți primi cereri de ofertă de la clienți din {{county}}.
{{founder_offer}}

Nu vă convine? Puteți corecta datele sau refuza direct din pagină, iar noi nu vă mai contactăm.

Cu respect,
Echipa IntraConstruct

Am obținut datele din surse publice (ONRC, site-ul firmei), pe baza interesului legitim de a vă propune această listare. Politica de confidențialitate: https://intraconstruct.ro/confidentialitate
Nu mai doriți mesaje: {{unsubscribe_link}}`,
  },
  {
    name: 'Invitație partener — SMS (ciornă)', channel: 'sms', subject: null,
    body: 'IntraConstruct: pagina {{company_name}} e pregatita: {{preview_link}} (pana la {{preview_expires}}). Dezabonare: intraconstruct.ro/stop',
  },
]

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply]')
  const line = await db.businessLine.findUnique({ where: { slug: v.line }, select: { id: true } })
  if (!line) throw new Error('Linia nu există')
  for (const t of TEMPLATES) {
    const exists = await db.marketingTemplate.findFirst({ where: { businessLineId: line.id, name: t.name }, select: { id: true } })
    const variables = [...new Set((t.body.match(/\{\{\w+\}\}/g) ?? []).map((x) => x.replace(/\{\{|\}\}/g, '')))]
    console.log(`${exists ? 'există  ' : 'de creat '} ${t.name} (${t.channel}) — variabile: ${variables.join(', ')}${t.channel === 'sms' ? ` — ${t.body.length} caractere` : ''}`)
    if (v.apply && !exists) await db.marketingTemplate.create({ data: { businessLineId: line.id, name: t.name, channel: t.channel, subject: t.subject, body: t.body, variables } })
  }
  if (!v.apply) console.log('\nREGIM DE PROBĂ: nu s-a creat nimic. Adaugă --apply.')
}
if (process.argv[1]?.endsWith('seed-partner-templates.ts')) main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
