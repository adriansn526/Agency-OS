/**
 * Audit of AI Romanian product names: lists SUSPICIOUS translations, ordered by severity and demand. READ-ONLY.
 *   npx tsx --env-file=.env.local scripts/commerce/translation-audit.ts
 * Rules (a translation unit = one distinct English name):
 *  A. head mismatch  - the English head noun is a component (REGULATOR, BRACKET, SEAL, ...) but the Romanian name starts like a major part (Far, Stop, Bară...)
 *  B. rare mapping   - this English head word is almost always translated one way (>=70%), this unit uses a rare alternative (<=3%)
 *  C. atypical price - price far from the median of products with the same Romanian name stem (<25% or >400%)
 *  D. English left   - English words left untranslated in the Romanian name
 *  E. Greek words   (rule F 'identical to English' was dropped: it only matched international technical names)
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { db } from '@repo/db'
import { MAKE_TERM, PART_RE, norm, modelLabel, genLabel } from '../../lib/commerce/research/vocab'

/** English component head word -> Romanian words that show it was translated (NOT 'reglaj': that is how the headlight regulator was lost) */
const COMPONENT_RO: Record<string, string[]> = {
  REGULATOR: ['regulator', 'motoras', 'actuator'], ACTUATOR: ['actuator', 'motoras', 'motor'], BRACKET: ['suport'], HOLDER: ['suport', 'port', 'dulie'], COVER: ['capac', 'husa', 'acoperi', 'protectie'],
  SEAL: ['garnitura', 'etans', 'sigiliu'], CAP: ['capac', 'dop'], SWITCH: ['comutator', 'intrerupator', 'buton', 'butoan'], BULB: ['bec'], SENSOR: ['senzor'], RELAY: ['releu'], GASKET: ['garnitura'],
  WASHER: ['spalator', 'saiba', 'duza', 'pompa'], NOZZLE: ['duza', 'pulverizator'], CABLE: ['cablu', 'fir', 'cablaj', 'cabluri'], CLIP: ['clips', 'clema', 'cleme', 'agrafa'], SCREW: ['surub'],
  HINGE: ['balama'], LOCK: ['broasca', 'incuietoare', 'zavor', 'blocaj'], SPRING: ['arc', 'amortizor', 'resort'], RUBBER: ['cauciuc', 'garnitura', 'etans'], STRIP: ['banda', 'profil', 'lamela'],
  HOSE: ['furtun'], PIPE: ['teava', 'conducta', 'tub'], FILTER: ['filtru'], MOTOR: ['motor', 'motoras'], KIT: ['set', 'kit'], SET: ['set', 'kit'],
}
const MAJOR = new Set('far stop proiector bara aripa oglinda grila capota usa haion parbriz radiator lampa geam'.split(' '))
const EN_LEFT = new Set('front rear left right upper lower inner outer with without for the and bumper grille mirror door hood fender bracket lamp head tail cover holder glass seal cap handle lock wheel panel reinforcement'.split(' '))
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

function enHead(en: string): string | null {
  let t = en.toUpperCase()
  for (let i = 0; i < 3; i++) t = t.replace(/\([^()]*\)/g, ' ')
  t = t.split(/\sW\/O?\s?|\sWITH\s|\sWITHOUT\s|\sFOR\s| - |,/)[0]!
  t = t.replace(/\d[\d.\-/]*/g, ' ')
  const w = t.split(/\s+/).filter((x) => /^[A-Z]{3,}$/.test(x))
  return w.length ? w[w.length - 1]! : null
}
const stem = (ro: string) => norm(ro.replace(/\([^)]*\)/g, ' ')).split(' ').slice(0, 2).join(' ')

async function main() {
  const dir = path.join(os.homedir(), 'data', 'ecaroseria-feed', 'research'); fs.mkdirSync(dir, { recursive: true })
  const prods = await db.$queryRaw<Array<{ id: string; sku: string; en: string; ro: string; price: number | null }>>`
    SELECT p.id, p."supplierCode" AS sku, p."nameEn" AS en, p."nameRo" AS ro, l."priceRon"::float AS price
    FROM "CommerceProduct" p LEFT JOIN "CommerceListing" l ON l."productId" = p.id AND l."businessLineId" = 'cuid_ecaroseria'
    WHERE p."isActive" AND p."nameRo" IS NOT NULL AND p."nameRoSource" = 'ai'`
  type Unit = { en: string; ro: string; ids: string[]; skus: string[]; prices: number[]; reasons: string[]; sev: number }
  const units = new Map<string, Unit>()
  for (const p of prods) {
    const k = p.en + '\u0000' + p.ro
    const u = units.get(k) ?? { en: p.en, ro: p.ro, ids: [], skus: [], prices: [], reasons: [], sev: 0 }
    u.ids.push(p.id); u.skus.push(p.sku); if (p.price != null) u.prices.push(p.price); units.set(k, u)
  }
  const list = [...units.values()]

  // B: dominant mapping per English head word
  const headMap = new Map<string, Map<string, number>>()
  for (const u of list) { const h = enHead(u.en); if (!h) continue; const r = norm(u.ro).split(' ').slice(0, 2).join(' '); const m = headMap.get(h) ?? new Map(); m.set(r, (m.get(r) ?? 0) + u.ids.length); headMap.set(h, m) }
  // C: median price per Romanian stem
  const stemPrices = new Map<string, number[]>()
  for (const p of prods) if (p.price != null) { const s = stem(p.ro); (stemPrices.get(s) ?? stemPrices.set(s, []).get(s)!).push(p.price) }
  const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]! }

  for (const u of list) {
    const eh = enHead(u.en), roFirst = norm(u.ro).split(' ')[0]!
    if (eh && COMPONENT_RO[eh] && MAJOR.has(roFirst) && !COMPONENT_RO[eh]!.some((w) => norm(u.ro).includes(w))) { u.reasons.push(`A: capul englez „${eh}” lipsește din RO, care începe cu „${roFirst}”`); u.sev += 3 }
    if (eh) {
      const m = headMap.get(eh); const total = m ? [...m.values()].reduce((a, b) => a + b, 0) : 0
      if (m && total >= 30) {
        const [dom, domN] = [...m].sort((a, b) => b[1] - a[1])[0]!
        const mine = m.get(norm(u.ro).split(' ').slice(0, 2).join(' ')) ?? 0
        if (domN / total >= 0.7 && norm(u.ro).split(' ').slice(0, 2).join(' ') !== dom && mine / total <= 0.03) { u.reasons.push(`B: „${eh}” se traduce de obicei „${dom}” (${Math.round(100 * domN / total)}%)`); u.sev += 2 }
      }
    }
    if (u.prices.length) {
      const sp = stemPrices.get(stem(u.ro)); const avg = u.prices.reduce((a, b) => a + b, 0) / u.prices.length
      if (sp && sp.length >= 8) { const med = median(sp); if (avg < 0.15 * med) { u.reasons.push(`C: preț mediu ${Math.round(avg)} RON vs ${Math.round(med)} RON (mediana tipului)`); u.sev += 2 } }
    }
    const left = norm(u.ro.replace(/\([^)]*\)/g, ' ')).split(' ').filter((w) => EN_LEFT.has(w))
    const leftInParen = (u.ro.match(/\(([^)]*)\)/g) ?? []).join(' ').split(/[^A-Za-z]+/).filter((w) => w.length >= 4 && EN_LEFT.has(w.toLowerCase()) && w === w.toUpperCase())
    if (left.length || leftInParen.length) { u.reasons.push(`D: cuvinte englezești rămase: ${[...new Set([...left, ...leftInParen.map((w) => w.toLowerCase())])].join(', ')}`); u.sev += left.length >= 2 ? 2 : 1 }
    if (/[Ͱ-Ͽ]{3,}/.test(u.ro)) { u.reasons.push('E: litere grecești'); u.sev += 3 }
  }
  const flagged = list.filter((u) => u.sev > 0)

  // demand for the flagged units: Google volume of the matched part for the product's vehicles + storefront views + ordered units
  const vol: Record<string, { v: number | null }> = JSON.parse(fs.readFileSync(path.join(dir, 'volumes.json'), 'utf8'))
  const v = (q: string) => vol[q]?.v ?? 0
  const ids = flagged.flatMap((u) => u.ids)
  const fit = ids.length ? await db.$queryRaw<Array<{ pid: string; make: string; model: string; gen: string }>>`
    SELECT f."productId" AS pid, mk.name AS make, m.name AS model, g.name AS gen FROM "CommerceFitment" f JOIN "VehicleGeneration" g ON g.id = f."generationId"
    JOIN "VehicleModel" m ON m.id = g."modelId" JOIN "VehicleMake" mk ON mk.id = m."makeId" WHERE f."productId" = ANY(${ids}::text[]) AND mk.name = ANY(${Object.keys(MAKE_TERM)}::text[])` : []
  const fitBy = new Map<string, Array<{ mk: string; label: string; modelL: string }>>()
  for (const f of fit) (fitBy.get(f.pid) ?? fitBy.set(f.pid, []).get(f.pid)!).push({ mk: MAKE_TERM[f.make]!, label: genLabel(f.gen, f.model), modelL: modelLabel(f.model) })
  const views = new Map((await db.$queryRaw<Array<{ pid: string; n: bigint }>>`SELECT "productId" AS pid, sum(views) AS n FROM "CommerceDemandDaily" WHERE "productId" = ANY(${ids}::text[]) AND day >= current_date - 30 GROUP BY 1`).map((r) => [r.pid, Number(r.n)]))
  const ordered = new Map((await db.$queryRaw<Array<{ pid: string; n: bigint }>>`SELECT i."productId" AS pid, sum(i.qty) AS n FROM "CommerceOrderItem" i WHERE i."productId" = ANY(${ids}::text[]) GROUP BY 1`).map((r) => [r.pid, Number(r.n)]))
  const partRe = Object.entries(PART_RE).map(([p, re]) => [p, new RegExp(re)] as const)
  const rows = flagged.map((u) => {
    const part = partRe.find(([, re]) => re.test(norm(u.ro)))?.[0] ?? ''
    let demand = 0
    if (part) for (const id of u.ids.slice(0, 40)) for (const f of fitBy.get(id) ?? []) demand = Math.max(demand, v(`${part} ${f.mk} ${f.label}`), v(`${part} ${f.label}`), v(`${part} ${f.mk} ${f.modelL}`) / 3)
    const vw = u.ids.reduce((a, id) => a + (views.get(id) ?? 0), 0), od = u.ids.reduce((a, id) => a + (ordered.get(id) ?? 0), 0)
    const avg = u.prices.length ? Math.round(u.prices.reduce((a, b) => a + b, 0) / u.prices.length) : 0
    return { u, part, demand: Math.round(demand), vw, od, avg }
  }).sort((a, b) => b.u.sev - a.u.sev || (b.demand + 50 * b.od + b.vw) - (a.demand + 50 * a.od + a.vw) || b.u.ids.length - a.u.ids.length)

  const out = path.join(dir, `traduceri-suspecte-${new Date().toISOString().slice(0, 10)}.csv`)
  fs.writeFileSync(out, '﻿' + 'Prioritate,Severitate,Motive,Denumire EN,Denumire RO (curentă),Produse afectate,Preț mediu RON,Piesă (căutare),Cerere Google max/lună,Vizualizări 30z,Unități comandate,SKU exemplu,Corectură propusă (de completat)\n' +
    rows.map((r, i) => [i + 1, r.u.sev, r.u.reasons.join(' | '), enHead(r.u.en) ?? '', r.u.en, r.u.ro, r.u.ids.length, r.avg, r.part, r.demand, r.vw, r.od, r.u.skus.slice(0, 3).join(' '), ''].map(cell).join(',')).join('\n') + '\n')

  const count = (p: string) => rows.filter((r) => r.u.reasons.some((x) => x.startsWith(p))).length
  const groups = new Map<string, { units: number; prods: number; ex: string; rule: string }>()
  for (const r of rows) { const rule = r.u.reasons[0]!.slice(0, 1); const k = rule + '|' + (enHead(r.u.en) ?? '?'); const g = groups.get(k) ?? { units: 0, prods: 0, ex: `${r.u.en.slice(0, 34)} → ${r.u.ro.slice(0, 34)}`, rule }; g.units++; g.prods += r.u.ids.length; groups.set(k, g) }
  console.log('\n== GRUPE (regulă | cap englez): unități / produse'); for (const [k, g] of [...groups].sort((a, b) => b[1].prods - a[1].prods).slice(0, 18)) console.log(`   ${k.padEnd(16)} ${String(g.units).padStart(4)} / ${String(g.prods).padStart(4)}   ex: ${g.ex}`)
  console.log(JSON.stringify({ produseAuditate: prods.length, denumiriDistincte: list.length, suspecte: rows.length, produseAfectate: rows.reduce((a, r) => a + r.u.ids.length, 0), pe_reguli: { A_cap_componenta: count('A'), B_mapare_rara: count('B'), C_pret_atipic: count('C'), D_engleza_ramasa: count('D'), E_greaca: count('E') }, severitate3plus: rows.filter((r) => r.u.sev >= 3).length, csv: out }, null, 1))
  for (const rule of ['A', 'B', 'C', 'D', 'E']) { console.log(`\n== exemple regula ${rule}:`); for (const r of rows.filter((x) => x.u.reasons.some((y) => y.startsWith(rule))).slice(0, 5)) console.log(`   ${r.u.en.slice(0, 38).padEnd(38)} → ${r.u.ro.slice(0, 36).padEnd(36)} ${r.u.ids.length}prod ${r.avg}RON | ${r.u.reasons.find((y) => y.startsWith(rule))!.slice(0, 64)}`) }
  console.log('\nTOP 30 după severitate și cerere:')
  for (const r of rows.slice(0, 30)) console.log(`sev${r.u.sev} ${String(r.u.ids.length).padStart(3)}prod ${String(r.avg).padStart(5)}RON cerere=${String(r.demand).padStart(4)}  ${r.u.en.slice(0, 40).padEnd(40)} → ${r.u.ro.slice(0, 38).padEnd(38)} | ${r.u.reasons[0]!.slice(0, 70)}`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
