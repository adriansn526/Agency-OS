/**
 * Idempotent: enables the Website module for "Rețea Medicală", issues one storefront key per site and creates the collections.
 *
 *   npx tsx --env-file=.env.local scripts/medical/setup-website-channel.ts --keys-file=/home/asns/retea-medicala-keys.txt
 *
 * Plain keys are written (mode 600) to --keys-file, never printed; only their hashes are stored. A brand that already has a key is skipped.
 *
 * Collection keys are the ones the Website module expects (`companii` = the practitioners, `servicii` = the taxonomy, `pagini`, `ghiduri`):
 * requests, routing, partner login and previews look them up by key. The display names are medical; the frontends map the URLs
 * (/medici -> companii, /specialitati -> servicii).
 */
import { chmodSync, writeFileSync } from 'node:fs'
import { db } from '@repo/db'
import { generateWebsiteKey, parseStoredKeys } from '../../lib/website/storefront/keys'

const LINE = 'retea-medicala'
const SITES = [
  { brand: 'topdoctori', brandName: 'TopDoctori', label: 'TopDoctori.ro', siteUrl: 'https://topdoctori.ro' },
  { brand: 'doctorchirurg', brandName: 'DoctorChirurg', label: 'DoctorChirurg.ro', siteUrl: 'https://doctorchirurg.ro' },
  { brand: 'omniamed', brandName: 'OmniaMed', label: 'OmniaMed.ro', siteUrl: 'https://omniamed.ro' },
]

type Field = { key: string; label: string; type: 'text' | 'number' | 'select' | 'date' | 'rating' | 'list'; options?: string[]; filterable?: boolean }
const COLLECTIONS: { key: string; name: string; namePlural: string; kind: string; sortOrder: number; fields: Field[] }[] = [
  {
    key: 'companii', name: 'Medic / Clinică', namePlural: 'Medici și clinici', kind: 'listing', sortOrder: 0,
    fields: [
      { key: 'cod_parafa', type: 'text', label: 'Cod parafă CMR' },
      { key: 'tip', type: 'select', label: 'Tip', options: ['medic', 'clinica'], filterable: true },
      { key: 'specializare', type: 'text', label: 'Specialitate principală', filterable: true },
      { key: 'servicii', type: 'list', label: 'Specialități și afecțiuni tratate (categorii)', filterable: true },
      { key: 'clinici', type: 'list', label: 'Clinici și cabinete (Nume | Oraș sau adresă)' },
      { key: 'tarif_consultatie', type: 'number', label: 'Tarif consultație (RON)' },
      { key: 'limbi', type: 'list', label: 'Limbi vorbite' },
      { key: 'consult_online', type: 'select', label: 'e-Consultanță (consult online)', options: ['da', 'nu'], filterable: true },
      { key: 'program', type: 'text', label: 'Program de lucru' },
      { key: 'certificari', type: 'list', label: 'Competențe și atestate' },
      { key: 'experienta_ani', type: 'number', label: 'Ani de experiență' },
      { key: 'subspecializari', type: 'list', label: 'Subspecializări' },
      { key: 'studii', type: 'list', label: 'Studii și formare' },
      { key: 'afilieri', type: 'list', label: 'Afilieri profesionale' },
      { key: 'intrebari', type: 'list', label: 'Întrebări frecvente (Întrebare | Răspuns)' },
      { key: 'modificari_asteptare', type: 'text', label: 'Modificări propuse de medic (în verificare)' },
      { key: 'tema', type: 'text', label: 'Temă de culoare' },
      { key: 'accent', type: 'text', label: 'Culoare de accent' },
    ],
  },
  {
    key: 'servicii', name: 'Specialitate', namePlural: 'Specialități și afecțiuni', kind: 'article', sortOrder: 1,
    fields: [
      { key: 'tip', type: 'select', label: 'Tip', options: ['grup', 'categorie', 'situatie'], filterable: true },
      { key: 'parinte', type: 'text', label: 'Grup (părinte)', filterable: true },
      { key: 'sinonime', type: 'list', label: 'Sinonime' },
      { key: 'preturi', type: 'list', label: 'Costuri orientative (Procedură | interval | observații)' },
      { key: 'intrebari', type: 'list', label: 'Întrebări frecvente (Întrebare | Răspuns)' },
    ],
  },
  { key: 'ghiduri', name: 'Articol', namePlural: 'Articole și ghiduri', kind: 'article', sortOrder: 2, fields: [{ key: 'autor_medic', type: 'text', label: 'Medic recenzor' }, { key: 'data_revizuirii', type: 'text', label: 'Data revizuirii (AAAA-LL-ZZ)' }, { key: 'surse', type: 'list', label: 'Surse' }, { key: 'brand', type: 'select', label: 'Publicat pe', options: ['omniamed', 'topdoctori', 'doctorchirurg'], filterable: true }] },
  { key: 'pagini', name: 'Pagină', namePlural: 'Pagini', kind: 'article', sortOrder: 3, fields: [{ key: 'pagina', type: 'text', label: 'Adresa paginii' }] },
]

async function main() {
  const keysFile = process.argv.find((a) => a.startsWith('--keys-file='))?.slice('--keys-file='.length)
  if (!keysFile) throw new Error('Usage: setup-website-channel.ts --keys-file=<path outside the repo>')

  const line = await db.businessLine.findUnique({ where: { slug: LINE }, select: { id: true } })
  if (!line) throw new Error('Linia retea-medicala nu există: rulează întâi setup-retea-medicala.ts')

  const channel = await db.websiteChannel.upsert({
    where: { businessLineId: line.id },
    create: { businessLineId: line.id, siteUrl: SITES[0]!.siteUrl },
    update: {},
  })
  const keys = parseStoredKeys(channel.apiKeys)
  const lines: string[] = []
  for (const s of SITES) {
    const existing = keys.find((k) => k.brand === s.brand)
    if (existing) { existing.brandName = s.brandName; console.log(`cheie existentă: ${s.brand}`); continue }
    const g = generateWebsiteKey(s.label, { brand: s.brand, brandName: s.brandName, siteUrl: s.siteUrl })
    keys.push(g.stored)
    lines.push(`${s.brand}\t${s.siteUrl}\t${g.key}`)
  }
  await db.websiteChannel.update({ where: { id: channel.id }, data: { apiKeys: keys as never } })
  if (lines.length) {
    writeFileSync(keysFile, lines.join('\n') + '\n', { mode: 0o600, flag: 'a' })
    chmodSync(keysFile, 0o600)
    console.log(`${lines.length} chei noi scrise în ${keysFile}`)
  }

  for (const c of COLLECTIONS) {
    const existing = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: c.key } }, select: { id: true, fields: true } })
    if (!existing) {
      await db.websiteCollection.create({ data: { businessLineId: line.id, key: c.key, name: c.name, namePlural: c.namePlural, kind: c.kind, fields: c.fields as never, sortOrder: c.sortOrder } })
      continue
    }
    // an existing collection keeps what the team edited; only fields it does not have yet are added
    const have = (Array.isArray(existing.fields) ? existing.fields : []) as { key: string }[]
    // labels that were made clearer after the first setup (only the label; type, options and the team's edits stay)
    const relabel = new Map(c.fields.filter((f) => ['consult_online', 'clinici'].includes(f.key)).map((f) => [f.key, f.label]))
    const relabeled = have.map((h) => (relabel.has(h.key) && (h as { label?: string }).label !== relabel.get(h.key) ? { ...h, label: relabel.get(h.key) } : h))
    const changed = relabeled.filter((h, i) => h !== have[i]).length
    const missing = c.fields.filter((f) => !have.some((h) => h.key === f.key))
    if (missing.length || changed) {
      await db.websiteCollection.update({ where: { id: existing.id }, data: { fields: [...relabeled, ...missing] as never } })
      console.log(`${c.key}: câmpuri adăugate: ${missing.map((m) => m.key).join(', ') || '-'}; etichete actualizate: ${changed}`)
    }
  }
  console.log(`Canal gata (${keys.length} chei), ${COLLECTIONS.length} colecții`)
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) }).finally(() => db.$disconnect())
