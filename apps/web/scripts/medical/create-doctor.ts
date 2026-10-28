/**
 * Creates the PRIVATE profile of a doctor in "Rețea Medicală": a WebsiteEntry in status `preview` (never public) and, when a phone or an email
 * is given, the CRM lead the activation flow needs. The doctor goes public only after (1) accepting through the private link and (2) the team
 * verifying the right to practise in the CMR register and publishing.
 *
 *   npx tsx --env-file=.env.local scripts/medical/create-doctor.ts --file <doctor.json>            # plan
 *   npx tsx --env-file=.env.local scripts/medical/create-doctor.ts --file <doctor.json> --apply
 *
 * The JSON holds personal data: keep it OUTSIDE the repo. Fields: title, slug?, summary?, body?, city?, county?, address?, phone?, email?,
 * websiteUrl?, specializare?, servicii[] (slugs of the `servicii` collection), clinici[]?, tarif_consultatie?, limbi[]?, consult_online?
 * ("da"|"nu"), program?, certificari[]?, cod_parafa?
 * Idempotent on the slug: an existing profile is never overwritten.
 */
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { db } from '@repo/db'

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined)
const list = z.array(z.string().trim().min(1).max(200)).max(30).optional()
const input = z.object({
  title: z.string().trim().min(3).max(150),
  slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,118}$/).optional(),
  summary: opt(500), body: opt(20000), city: opt(80), county: opt(60), address: opt(200),
  phone: opt(40), email: z.string().trim().email().max(200).optional(), websiteUrl: opt(300),
  specializare: opt(120), servicii: z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).min(1).max(40),
  clinici: list, tarif_consultatie: z.number().min(0).max(100000).optional(), limbi: list,
  consult_online: z.enum(['da', 'nu']).optional(), program: opt(200), certificari: list,
  cod_parafa: z.string().trim().regex(/^[A-Za-z0-9]{4,10}$/).optional(),
}).strict()

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

async function main() {
  const file = process.argv.find((a) => a.startsWith('--file='))?.slice(7) ?? process.argv[process.argv.indexOf('--file') + 1]
  if (!file || file.startsWith('--')) throw new Error('Usage: create-doctor.ts --file <doctor.json> [--apply]')
  const apply = process.argv.includes('--apply')
  const d = input.parse(JSON.parse(readFileSync(file, 'utf8')))
  const slug = d.slug ?? slugify(d.title)

  const line = await db.businessLine.findUnique({ where: { slug: 'retea-medicala' }, select: { id: true } })
  if (!line) throw new Error('Linia retea-medicala nu există')
  const col = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: 'companii' } }, select: { id: true } })
  const tax = await db.websiteEntry.findMany({ where: { businessLineId: line.id, collection: { key: 'servicii' }, status: { not: 'suspended' } }, select: { slug: true, data: true } })
  if (!col || !tax.length) throw new Error('Colecțiile sau taxonomia lipsesc (setup-website-channel.ts, seed-taxonomy.ts)')
  const known = new Set(tax.filter((t) => (t.data as { tip?: string } | null)?.tip === 'categorie').map((t) => t.slug))
  const unknown = d.servicii.filter((s) => !known.has(s))
  if (unknown.length) throw new Error(`Servicii necunoscute în taxonomie: ${unknown.join(', ')}`)
  const exists = await db.websiteEntry.findFirst({ where: { businessLineId: line.id, collectionId: col.id, slug }, select: { id: true } })
  if (exists) { console.log(`Profilul ${slug} există deja (${exists.id}); nu se modifică.`); return }

  const data = Object.fromEntries(Object.entries({ specializare: d.specializare, servicii: d.servicii, clinici: d.clinici, tarif_consultatie: d.tarif_consultatie, limbi: d.limbi, consult_online: d.consult_online, program: d.program, certificari: d.certificari, cod_parafa: d.cod_parafa }).filter(([, v]) => v !== undefined))
  console.log(`${apply ? 'CREEZ' : 'Plan'}: ${d.title} (${slug}), status preview, ${d.servicii.length} servicii, lead: ${d.phone || d.email ? 'da' : 'nu (lipsește telefon/email)'}`)
  if (!apply) { console.log('Probă: nu s-a scris nimic. Adaugă --apply.'); return }

  const lead = d.phone || d.email ? await db.lead.create({ data: { businessLineId: line.id, entityType: 'medici', status: 'prospect', companyName: d.title, contactPerson: d.title, email: d.email ?? 'N/A', phone: d.phone, city: d.city, county: d.county, address: d.address, website: d.websiteUrl, source: 'manual', externalSource: 'manual', externalId: slug, customFields: d.cod_parafa ? { cod_parafa: d.cod_parafa } : undefined } }) : null
  const e = await db.websiteEntry.create({ data: {
    businessLineId: line.id, collectionId: col.id, slug, title: d.title, summary: d.summary, body: d.body, status: 'preview', partnerAccess: false,
    city: d.city, county: d.county, address: d.address, phone: d.phone, email: d.email, websiteUrl: d.websiteUrl, data: data as never, leadId: lead?.id, externalSource: 'manual', externalId: slug,
  } })
  console.log(`Creat profilul ${e.id}${lead ? `, lead ${lead.id}` : ''}. Privat (preview): nu apare în API-ul public.`)
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) }).finally(() => db.$disconnect())
