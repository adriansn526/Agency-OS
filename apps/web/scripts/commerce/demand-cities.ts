/**
 * City-level demand: Google Ads Keyword Planner volumes (Romanian) for the queries that matter nationally, for 3 cities.
 * Spends no money (Google Ads API) but is rate limited. Results cached in ~/data/ecaroseria-feed/research/volumes-cities.json.
 *   npx tsx --env-file=.env.local scripts/commerce/demand-cities.ts
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { db } from '@repo/db'
import { getKeywordVolumes } from '../../lib/integrations/google-ads'
import { MAKE_TERM, PARTS, genLabel, modelLabel } from '../../lib/commerce/research/vocab'

const CITIES: Record<string, string> = { Romania: 'geoTargetConstants/2642', Bucuresti: 'geoTargetConstants/1011795', 'Cluj-Napoca': 'geoTargetConstants/1011806', Iasi: 'geoTargetConstants/1011828' }
const MIN_NATIONAL = 50
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

async function main() {
  const dir = path.join(os.homedir(), 'data', 'ecaroseria-feed', 'research')
  const base: Record<string, { v: number | null }> = JSON.parse(fs.readFileSync(path.join(dir, 'volumes.json'), 'utf8'))
  const queries = Object.entries(base).filter(([, x]) => (x.v ?? 0) >= MIN_NATIONAL).map(([q]) => q)
  console.log('interogări cu volum național ≥', MIN_NATIONAL, ':', queries.length)

  const cid = (await db.client.findFirst({ where: { googleAdsCustomerId: { not: null }, deletedAt: null }, select: { googleAdsCustomerId: true } }))?.googleAdsCustomerId
  if (!cid) throw new Error('no Google Ads customer id')
  const file = path.join(dir, 'volumes-cities.json')
  const res: Record<string, Record<string, number>> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  for (const [city, geo] of Object.entries(CITIES)) {
    if (res[city] && Object.keys(res[city]!).length >= queries.length * 0.95) { console.log(city, 'din cache'); continue }
    res[city] = await getKeywordVolumes(cid, queries, { geoTargetConstants: [geo], language: 'languageConstants/1032' })
    fs.writeFileSync(file, JSON.stringify(res)); console.log(city, 'ok', Object.keys(res[city]!).length)
    await new Promise((r) => setTimeout(r, 6000))
  }

  // attribute each query to a part and a make
  const vehicles = await db.$queryRaw<Array<{ make: string; model: string; gen: string }>>`
    SELECT mk.name AS make, m.name AS model, g.name AS gen FROM "VehicleGeneration" g JOIN "VehicleModel" m ON m.id = g."modelId" JOIN "VehicleMake" mk ON mk.id = m."makeId" WHERE mk.name = ANY(${Object.keys(MAKE_TERM)}::text[])`
  const labelMake = new Map<string, string>()
  for (const v of vehicles) for (const l of [modelLabel(v.model), genLabel(v.gen, v.model)]) if (!labelMake.has(l)) labelMake.set(l, MAKE_TERM[v.make]!)
  const parts = [...PARTS].sort((a, b) => b.length - a.length)
  const makes = new Set(Object.values(MAKE_TERM))
  const parse = (q: string) => {
    const part = parts.find((p) => q.startsWith(p + ' ')); if (!part) return null
    const tail = q.slice(part.length + 1); const first = tail.split(' ')[0]!
    const make = makes.has(first) ? first : labelMake.get(tail) ?? null
    return { part, make, tail }
  }

  const names = Object.keys(CITIES).filter((c) => c !== 'Romania')
  const sum = (f: (q: string) => boolean, city: string) => queries.filter(f).reduce((a, q) => a + (res[city]?.[q] ?? 0), 0)
  const line = (label: string, f: (q: string) => boolean) => {
    const nat = sum(f, 'Romania'); if (nat === 0) return
    console.log(label.padEnd(14), String(nat).padStart(7), ...names.map((c) => `${c} ${String(sum(f, c)).padStart(5)} (${(100 * sum(f, c) / nat).toFixed(1)}%)`.padEnd(24)))
  }
  console.log('\n== TOTAL (suma pe interogările analizate)'); line('toate', () => true)
  console.log('\n== pe MARCĂ'); for (const mk of [...makes]) line(mk, (q) => parse(q)?.make === mk)
  console.log('\n== pe PIESĂ (primele 12 după volum)'); for (const p of parts.map((p) => [p, sum((q) => parse(q)?.part === p, 'Romania')] as const).sort((a, b) => b[1] - a[1]).slice(0, 12)) line(p[0], (q) => parse(q)?.part === p[0])
  // CSV
  const out = path.join(dir, `cerere-pe-orase-${new Date().toISOString().slice(0, 10)}.csv`)
  fs.writeFileSync(out, '﻿' + ['Interogare', 'Piesă', 'Marcă', 'România', ...names].join(',') + '\n' + queries.map((q) => { const p = parse(q); return [q, p?.part ?? '', p?.make ?? '', res['Romania']?.[q] ?? 0, ...names.map((c) => res[c]?.[q] ?? 0)].map(cell).join(',') }).join('\n') + '\n')
  console.log('\nCSV:', out)
  // over-indexed queries per city (national >= 250)
  for (const c of names) {
    const natTot = sum(() => true, 'Romania'), cityTot = sum(() => true, c), avg = cityTot / natTot
    const top = queries.filter((q) => (res.Romania?.[q] ?? 0) >= 250).map((q) => ({ q, nat: res.Romania![q]!, city: res[c]?.[q] ?? 0 })).map((x) => ({ ...x, idx: x.city / x.nat / avg })).sort((a, b) => b.idx - a.idx).slice(0, 5)
    console.log(`\n${c}: cota medie ${(100 * avg).toFixed(1)}% — interogări supra-reprezentate (național ≥250):`, top.map((x) => `${x.q} (${x.city}/${x.nat}, ×${x.idx.toFixed(1)})`).join('; '))
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
