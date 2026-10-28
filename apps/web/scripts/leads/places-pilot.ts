/**
 * Pilot: for a sample of intraconstruct leads, find the business on Google Maps (Places API New, text search) and write its rating to a CSV.
 * READ-ONLY for the database (nothing is written to Lead); costs one Places request per lead. Dry run by default (shows the sample, no API calls).
 *
 *   npx tsx --env-file=.env.local scripts/leads/places-pilot.ts [--n 250] [--per-domain 50] [--run] [--out ../../docs/SEO/pilot_places.csv]
 *
 * Match: a phone number identical to the lead's = "telefon" (reliable); otherwise a name that shares most words with the lead's company name and sits in the same city = "nume"; otherwise "fara-potrivire".
 */
import { parseArgs } from 'node:util'
import { writeFileSync } from 'node:fs'
import { db } from '@repo/db'
import { normalizePhone } from '../../lib/commerce/partners/csv'

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'
const MASK = 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri'
const strip = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STOP = new Set(['srl', 'sc', 'sa', 'pfa', 'ii', 'if', 'srl-d', 'de', 'si', 'the'])
const words = (s: string) => strip(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w))
const digits = (p: string | null | undefined) => (normalizePhone(p ?? undefined) ?? '').replace(/\D/g, '').slice(-9)
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

interface P { id: string; displayName?: { text: string }; formattedAddress?: string; nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string; rating?: number; userRatingCount?: number; businessStatus?: string; googleMapsUri?: string }

function match(lead: { companyName: string; city: string | null; phone: string | null; phone2: string | null; phone3: string | null }, ps: P[]): { p: P | null; how: string } {
  const lp = [lead.phone, lead.phone2, lead.phone3].map(digits).filter(Boolean)
  for (const p of ps) if (lp.length && [digits(p.nationalPhoneNumber), digits(p.internationalPhoneNumber)].some((d) => d && lp.includes(d))) return { p, how: 'telefon' }
  const lw = words(lead.companyName), city = strip(lead.city ?? '')
  for (const p of ps) {
    const pw = new Set(words(p.displayName?.text ?? ''))
    const share = lw.length ? lw.filter((w) => pw.has(w)).length / lw.length : 0
    if (share >= 0.6 && city && strip(p.formattedAddress ?? '').includes(city)) return { p, how: 'nume' }
  }
  return { p: null, how: 'fara-potrivire' }
}

async function main() {
  const { values: v } = parseArgs({ options: { n: { type: 'string', default: '250' }, 'per-domain': { type: 'string', default: '50' }, run: { type: 'boolean', default: false }, out: { type: 'string', default: '../../docs/SEO/pilot_places.csv' } } })
  const n = Number(v.n), per = Number(v['per-domain'])
  // stratified, deterministic sample: the biggest activity domains, leads with a phone and a city, not opted out, spread by a hash of the id
  const doms = await db.$queryRaw<{ d: string; c: bigint }[]>`select l."activityDomain" d, count(*) c from "Lead" l join "BusinessLine" b on b.id=l."businessLineId" where b.slug='intraconstruct' and l."optOut"=false and l.phone is not null and l.city is not null and l."activityDomain"<>'' group by 1 order by 2 desc limit 8`
  const rows: Awaited<ReturnType<typeof db.lead.findMany>> = []
  for (const { d } of doms) {
    if (rows.length >= n) break
    const take = Math.min(per, n - rows.length)
    rows.push(...await db.$queryRaw<typeof rows>`select l.* from "Lead" l join "BusinessLine" b on b.id=l."businessLineId" where b.slug='intraconstruct' and l."optOut"=false and l.phone is not null and l.city is not null and l."activityDomain"=${d} order by md5(l.id) limit ${take}`)
  }
  console.log(`Eșantion: ${rows.length} leaduri din ${doms.map((x) => x.d).join(' | ')}`)
  if (!v.run) { console.log('PROBĂ: niciun apel către Google. Adaugă --run (un request Places per lead).'); return }
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY lipsește')
  const out = [['lead_id', 'firma', 'domeniu', 'judet', 'oras', 'potrivire', 'place_id', 'nume_google', 'rating', 'nr_recenzii', 'status_google', 'site_google', 'maps'].join(',')]
  const stat: Record<string, number> = {}
  for (const l of rows) {
    let ps: P[] = []
    try {
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': MASK }, body: JSON.stringify({ textQuery: `${l.companyName} ${l.city}`, languageCode: 'ro', regionCode: 'RO', pageSize: 3 }) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      ps = ((await r.json()) as { places?: P[] }).places ?? []
    } catch (e) { console.error(`${l.id}: ${(e as Error).message}`); stat.eroare = (stat.eroare ?? 0) + 1; continue }
    const { p, how } = match(l, ps)
    stat[how] = (stat[how] ?? 0) + 1
    out.push([l.id, l.companyName, l.activityDomain, l.county, l.city, how, p?.id, p?.displayName?.text, p?.rating, p?.userRatingCount, p?.businessStatus, p?.websiteUri, p?.googleMapsUri].map(q).join(','))
    await new Promise((r) => setTimeout(r, 120))
  }
  writeFileSync(v.out!, out.join('\n') + '\n')
  console.log('Rezultat:', stat, '→', v.out)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
