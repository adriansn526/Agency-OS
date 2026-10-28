/**
 * Updates an existing doctor profile of "Rețea Medicală" from a JSON patch (kept OUTSIDE the repo: it holds personal data).
 * Top-level fields (title, summary, body, city, county, address, phone, email, websiteUrl) are replaced; every other key is merged into `data`
 * (arrays and values are replaced as given). `servicii` must exist in the taxonomy. Dry run unless --apply.
 *
 *   npx tsx --env-file=.env.local scripts/medical/update-doctor.ts --slug <slug> --file <patch.json> [--apply]
 */
import { readFileSync } from 'node:fs'
import { db } from '@repo/db'

const TOP = ['title', 'summary', 'body', 'city', 'county', 'address', 'phone', 'email', 'websiteUrl'] as const
const DATA_KEYS = ['specializare', 'servicii', 'clinici', 'tarif_consultatie', 'limbi', 'consult_online', 'program', 'certificari', 'cod_parafa', 'experienta_ani', 'subspecializari', 'studii', 'afilieri', 'tema', 'accent'] as const
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined }

async function main() {
  const slug = arg('slug'), file = arg('file'), apply = process.argv.includes('--apply')
  if (!slug || !file) throw new Error('Usage: update-doctor.ts --slug <slug> --file <patch.json> [--apply]')
  const patch = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
  const bad = Object.keys(patch).filter((k) => !(TOP as readonly string[]).includes(k) && !(DATA_KEYS as readonly string[]).includes(k))
  if (bad.length) throw new Error(`Câmpuri nepermise: ${bad.join(', ')}`)

  const line = await db.businessLine.findUnique({ where: { slug: 'retea-medicala' }, select: { id: true } })
  const e = line && await db.websiteEntry.findFirst({ where: { businessLineId: line.id, collection: { key: 'companii' }, slug }, select: { id: true, data: true, status: true } })
  if (!line || !e) throw new Error(`Profilul ${slug} nu există`)
  if (Array.isArray(patch.servicii)) {
    const tax = await db.websiteEntry.findMany({ where: { businessLineId: line.id, collection: { key: 'servicii' } }, select: { slug: true } })
    const known = new Set(tax.map((t) => t.slug)), unknown = (patch.servicii as string[]).filter((s) => !known.has(s))
    if (unknown.length) throw new Error(`Servicii necunoscute: ${unknown.join(', ')}`)
  }
  const top = Object.fromEntries(Object.entries(patch).filter(([k]) => (TOP as readonly string[]).includes(k)))
  const dataPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => (DATA_KEYS as readonly string[]).includes(k)))
  console.log(`${apply ? 'ACTUALIZEZ' : 'Plan'} ${slug} (${e.status}): ${[...Object.keys(top), ...Object.keys(dataPatch).map((k) => `data.${k}`)].join(', ') || '(nimic)'}`)
  if (!apply) { console.log('Probă: nu s-a scris nimic. Adaugă --apply.'); return }
  await db.websiteEntry.update({ where: { id: e.id }, data: { ...top, data: { ...((e.data ?? {}) as Record<string, unknown>), ...dataPatch } as never } })
  console.log('Gata.')
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) }).finally(() => db.$disconnect())
