/**
 * Joins the cached Google search volumes (demand-research.ts) with the catalog: for each (part, vehicle) it reports the search volume,
 * how many of OUR products fit, their price, size class and supplier availability. Read-only. Writes a CSV for the stock decision.
 *   npx tsx --env-file=.env.local scripts/commerce/demand-analysis.ts
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { db } from '@repo/db'

import { MAKE_TERM, PART_RE, norm, modelLabel as model, genLabel } from '../../lib/commerce/research/vocab'
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

async function main() {
  const dir = path.join(os.homedir(), 'data', 'ecaroseria-feed', 'research')
  const cache: Record<string, { v: number | null }> = JSON.parse(fs.readFileSync(path.join(dir, 'volumes.json'), 'utf8'))
  const vol = (q: string) => cache[q]?.v ?? 0

  // product facts per (generation, part): count, prices, bulky, availability
  const rows = await db.$queryRaw<Array<{ make: string; model: string; gen: string; gid: string; pid: string; name: string; price: string; bulky: string | null; avail: boolean | null; side: string | null }>>`
    SELECT mk.name AS make, m.name AS model, g.name AS gen, g.id AS gid, p.id AS pid, lower(translate(coalesce(p."nameRo", p."nameEn"), 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaisstt' || 'aaisstt')) AS name,
           l."priceRon"::text AS price, p."bulkyClass" AS bulky, p.side,
           (SELECT bool_or(s."rawFlag" = 1) FROM "CommerceStock" s WHERE s."productId" = p.id) AS avail
    FROM "CommerceFitment" f JOIN "VehicleGeneration" g ON g.id = f."generationId" JOIN "VehicleModel" m ON m.id = g."modelId" JOIN "VehicleMake" mk ON mk.id = m."makeId"
    JOIN "CommerceProduct" p ON p.id = f."productId" AND p."isActive" JOIN "CommerceListing" l ON l."productId" = p.id AND l."businessLineId" = 'cuid_ecaroseria' AND l."isActive" AND l."priceRon" IS NOT NULL
    WHERE mk.name = ANY(${Object.keys(MAKE_TERM)}::text[])`
  type Agg = { make: string; label: string; part: string; pids: Set<string>; prices: number[]; bulky: number; avail: number; known: number }
  const agg = new Map<string, Agg>()
  const res = Object.entries(PART_RE).map(([part, re]) => [part, new RegExp(re)] as const)
  for (const r of rows) {
    const mk = MAKE_TERM[r.make]!
    for (const label of new Set([model(r.model), genLabel(r.gen, r.model)])) {
      for (const [part, re] of res) {
        if (!re.test(r.name)) continue
        const key = `${mk}|${label}|${part}`
        const a = agg.get(key) ?? { make: mk, label, part, pids: new Set(), prices: [], bulky: 0, avail: 0, known: 0 }
        if (!a.pids.has(r.pid)) { a.pids.add(r.pid); a.prices.push(Number(r.price)); if (r.bulky === 'large' || r.bulky === 'xlarge') a.bulky++; if (r.avail != null) { a.known++; if (r.avail) a.avail++ } }
        agg.set(key, a)
      }
    }
  }
  const out = [...agg.values()].map((a) => {
    const v = Math.max(vol(`${a.part} ${a.make} ${a.label}`), vol(`${a.part} ${a.label}`))
    const sorted = [...a.prices].sort((x, y) => x - y)
    return { ...a, volume: v, n: a.pids.size, med: sorted[Math.floor(sorted.length / 2)] ?? 0, min: sorted[0] ?? 0, bulkyShare: a.bulky / a.pids.size, availShare: a.known ? a.avail / a.known : null }
  }).sort((x, y) => y.volume - x.volume || y.n - x.n)

  const file = path.join(dir, `ranking-piese-vehicule-${new Date().toISOString().slice(0, 10)}.csv`)
  fs.writeFileSync(file, '﻿' + 'Marcă,Vehicul,Piesă,Căutări/lună (RO),Produse în catalog,Preț min (RON),Preț median (RON),% voluminoase,% disponibile la furnizor\n' +
    out.filter((o) => o.volume > 0).map((o) => [o.make, o.label, o.part, o.volume, o.n, o.min, o.med, Math.round(o.bulkyShare * 100), o.availShare == null ? '' : Math.round(o.availShare * 100)].map(cell).join(',')).join('\n') + '\n')

  const withVol = out.filter((o) => o.volume > 0)
  const totalVol = (f: (o: (typeof out)[number]) => string) => { const m = new Map<string, number>(); for (const o of out) m.set(f(o), (m.get(f(o)) ?? 0) + o.volume); return [...m].sort((a, b) => b[1] - a[1]) }
  const allQ = Object.keys(cache)
  console.log(JSON.stringify({ interogariInCache: allQ.length, cuVolum: allQ.filter((q) => cache[q]!.v).length, combinatiiPieseVehicul: out.length, cuVolumSiProduse: withVol.length, csv: file }, null, 1))
  console.log('\nTOP piese după volum total (suma peste vehicule; double-count între generații, orientativ):'); for (const [k, v] of totalVol((o) => o.part).slice(0, 12)) console.log('  ', k.padEnd(18), v)
  console.log('\nTOP mărci:'); for (const [k, v] of totalVol((o) => o.make).slice(0, 12)) console.log('  ', k.padEnd(10), v)
  console.log('\nTOP 25 combinații (piesă × vehicul) după căutări, cu oferta noastră:')
  for (const o of withVol.slice(0, 25)) console.log(`  ${String(o.volume).padStart(5)}  ${o.part.padEnd(16)} ${(o.make + ' ' + o.label).padEnd(30)} produse=${String(o.n).padStart(3)}  preț med=${String(Math.round(o.med)).padStart(4)}  voluminos=${Math.round(o.bulkyShare * 100)}%  disp.=${o.availShare == null ? '-' : Math.round(o.availShare * 100) + '%'}`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
