/**
 * Adds the fields partners can fill in "Profilul meu" (program, certificari) to the companies collection. Idempotent; dry run by default.
 *   npx tsx --env-file=.env.local scripts/website/add-partner-fields.ts --line intraconstruct [--apply]
 */
import { parseArgs } from 'node:util'
import { db, Prisma } from '@repo/db'
import type { CollectionField } from '../../lib/website/admin/entry-data'

const NEW_FIELDS: CollectionField[] = [
  { key: 'program', label: 'Program de lucru', type: 'text' },
  { key: 'certificari', label: 'Autorizații și certificări', type: 'list' },
  { key: 'tema', label: 'Temă de culoare', type: 'text' },
  { key: 'accent', label: 'Culoare de accent', type: 'text' },
]

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply]')
  const line = await db.businessLine.findUnique({ where: { slug: v.line }, select: { id: true } })
  if (!line) throw new Error('Linia nu există')
  const col = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: 'companii' } }, select: { id: true, fields: true } })
  if (!col) throw new Error('Colecția „companii” nu există')
  const fields = (col.fields ?? []) as unknown as CollectionField[]
  const missing = NEW_FIELDS.filter((f) => !fields.some((x) => x.key === f.key))
  console.log(missing.length ? `De adăugat: ${missing.map((f) => f.key).join(', ')}` : 'Câmpurile există deja.')
  if (!v.apply || !missing.length) { if (missing.length) console.log('REGIM DE PROBĂ: adaugă --apply.'); return }
  await db.websiteCollection.update({ where: { id: col.id }, data: { fields: [...fields, ...missing] as unknown as Prisma.InputJsonValue } })
  console.log('Adăugat.')
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
