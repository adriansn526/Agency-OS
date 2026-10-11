/**
 * Candidate SKUs for the first stock of the local warehouse. READ-ONLY. Writes CSVs next to the research data.
 *   npx tsx --env-file=.env.local scripts/commerce/build-stock-list.ts [--budgets=20000,50000,100000]
 *
 * Method (transparent, tweakable):
 *  - demand of a part x vehicle-generation = Google search volume (RO), the larger of "piesa marca model" and "piesa model";
 *  - candidates: active, priced products that fit that generation, are AVAILABLE at the supplier, unit price within [MIN_PRICE, MAX_PRICE];
 *  - per combination and per side (left/right) ONE base variant is picked: the ~30th percentile of the candidate prices (not the cheapest
 *    accessory, not the premium variant); alternatives are listed in the CSV;
 *  - a SKU that fits several combinations keeps its highest demand; bulky items (large/xlarge) go to a separate file (storage cost);
 *  - quantity per SKU: 1 if demand < 300, 2 if < 800, else 3;  priority = demand / unit cost (searches per RON of capital);
 *  - capital is at PURCHASE cost (supplier cost EUR x BNR rate, VAT excluded).
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { db } from '@repo/db'
import { MAKE_TERM, PART_RE, modelLabel, genLabel } from '../../lib/commerce/research/vocab'

const MIN_PRICE = 40, MAX_PRICE = 2000, MIN_VOLUME = 40
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

async function main() {
  const budgets = (process.argv.find((a) => a.startsWith('--budgets=')) ?? '--budgets=20000,50000,100000').split('=')[1]!.split(',').map(Number)
  const dir = path.join(os.homedir(), 'data', 'ecaroseria-feed', 'research')
  const cache: Record<string, { v: number | null }> = JSON.parse(fs.readFileSync(path.join(dir, 'volumes.json'), 'utf8'))
  const vol = (q: string) => cache[q]?.v ?? 0
  const fx = Number((await db.commerceExchangeRate.findFirst({ where: { currency: 'EUR' }, orderBy: { date: 'desc' } }))?.rate ?? 0)
  if (!fx) throw new Error('no EUR rate')

  const rows = await db.$queryRaw<Array<{ make: string; model: string; gen: string; pid: string; sku: string; nameRo: string; name: string; side: string | null; quality: string | null; brand: string | null; price: string; cost: string; bulky: string | null; avail: boolean | null; slug: string; images: bigint }>>`
    SELECT mk.name AS make, m.name AS model, g.name AS gen, p.id AS pid, p."supplierCode" AS sku, coalesce(p."nameRo", p."nameEn") AS "nameRo",
           lower(translate(coalesce(p."nameRo", p."nameEn"), 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaisstt' || 'aaisstt')) AS name, p.side, p.quality, p.brand,
           l."priceRon"::text AS price, p."costPrice"::text AS cost, p."bulkyClass" AS bulky, l.slug,
           (SELECT bool_or(s."rawFlag" = 1) FROM "CommerceStock" s WHERE s."productId" = p.id) AS avail,
           (SELECT count(*) FROM "CommerceProductImage" i WHERE i."productId" = p.id) AS images
    FROM "CommerceFitment" f JOIN "VehicleGeneration" g ON g.id = f."generationId" JOIN "VehicleModel" m ON m.id = g."modelId" JOIN "VehicleMake" mk ON mk.id = m."makeId"
    JOIN "CommerceProduct" p ON p.id = f."productId" AND p."isActive" JOIN "CommerceListing" l ON l."productId" = p.id AND l."businessLineId" = 'cuid_ecaroseria' AND l."isActive" AND l."priceRon" IS NOT NULL
    WHERE mk.name = ANY(${Object.keys(MAKE_TERM)}::text[])`

  type Cand = (typeof rows)[number] & { priceN: number; costRon: number }
  // model-level volume ("far golf") is shared by the generation labels of that model; the effective demand of a generation is the larger of
  // its own volume and its share of the model volume.
  const genLabelsOfModel = new Map<string, Set<string>>()
  for (const r of rows) { const k = `${MAKE_TERM[r.make]}|${modelLabel(r.model)}`; (genLabelsOfModel.get(k) ?? genLabelsOfModel.set(k, new Set()).get(k)!).add(genLabel(r.gen, r.model)) }
  const effVolume = (mk: string, part: string, modelL: string, label: string) => {
    const own = Math.max(vol(`${part} ${mk} ${label}`), vol(`${part} ${label}`))
    const shared = Math.max(vol(`${part} ${mk} ${modelL}`), vol(`${part} ${modelL}`)) / Math.max(1, genLabelsOfModel.get(`${mk}|${modelL}`)?.size ?? 1)
    return Math.max(own, Math.round(shared))
  }
  const combos = new Map<string, { make: string; label: string; part: string; volume: number; bySide: Map<string, Map<string, Cand>> }>()
  const partRe = Object.entries(PART_RE).map(([part, re]) => [part, new RegExp(re)] as const)
  for (const r of rows) {
    const mk = MAKE_TERM[r.make]!, label = genLabel(r.gen, r.model), modelL = modelLabel(r.model)
    const priceN = Number(r.price)
    if (priceN < MIN_PRICE || priceN > MAX_PRICE || r.avail !== true) continue
    for (const [part, re] of partRe) {
      if (!re.test(r.name)) continue
      const volume = effVolume(mk, part, modelL, label)
      if (volume < MIN_VOLUME) continue
      const key = `${mk}|${label}|${part}`
      const c = combos.get(key) ?? { make: mk, label, part, volume, bySide: new Map() }
      const m = c.bySide.get(r.side ?? '-') ?? new Map<string, Cand>()
      m.set(r.pid, { ...r, priceN, costRon: Number(r.cost) * fx })
      c.bySide.set(r.side ?? '-', m); combos.set(key, c)
    }
  }

  // variants per combination and side: cheap / mid / premium (by price percentile) for bigger demand; a SKU keeps its highest-demand combination
  type Pick = { c: Cand; volume: number; combo: string; part: string; alts: number; lo: number; hi: number; rank: number }
  const picks = new Map<string, Pick>()
  for (const c of combos.values()) {
    const variants = c.volume >= 800 ? [0.15, 0.5, 0.85] : c.volume >= 250 ? [0.25, 0.7] : [0.35]
    for (const [side, m] of c.bySide) {
      let list = [...m.values()].sort((a, b) => a.priceN - b.priceN)
      // accessories mislabeled as the part (e.g. a 52 RON "far" when the usual price is ~580): drop candidates below 25% of the median
      const med = list[Math.floor((list.length - 1) / 2)]!.priceN
      list = list.filter((x) => x.priceN >= 0.25 * med)
      variants.forEach((q, rank) => {
        const base = list[Math.round(q * (list.length - 1))]!
        const cur = picks.get(base.pid)
        if (!cur || c.volume > cur.volume) picks.set(base.pid, { c: { ...base, side: side === '-' ? null : side }, volume: c.volume, combo: `${c.make} ${c.label}`, part: c.part, alts: list.length, lo: list[0]!.priceN, hi: list[list.length - 1]!.priceN, rank })
      })
    }
  }
  const all = [...picks.values()].map((p) => ({ ...p, bulky: p.c.bulky === 'large' || p.c.bulky === 'xlarge' }))
  const normal = all.filter((x) => !x.bulky), bulky = all.filter((x) => x.bulky).sort((a, b) => b.volume - a.volume)

  // budget allocation by units: unit k of a SKU is worth volume x weight(k) per RON of cost (diminishing returns); first variant counts most
  const W = [1, 0.55, 0.35, 0.2], VARIANT = [1, 0.7, 0.5]
  const units: Array<{ idx: number; k: number; pri: number; cost: number }> = []
  normal.forEach((x, idx) => { const maxK = x.volume >= 1000 ? 4 : x.volume >= 500 ? 3 : x.volume >= 250 ? 2 : 1; for (let k = 0; k < maxK; k++) units.push({ idx, k, pri: (x.volume * W[k]! * VARIANT[Math.min(x.rank, 2)]!) / Math.max(1, x.c.costRon), cost: x.c.costRon }) })
  units.sort((a, b) => b.pri - a.pri)
  const qtyAt = budgets.map(() => new Array<number>(normal.length).fill(0))
  budgets.forEach((b, bi) => { let spent = 0; for (const u of units) { if (spent + u.cost > b) continue; spent += u.cost; qtyAt[bi]![u.idx]!++ } })
  const order = normal.map((x, idx) => ({ x, idx, first: units.findIndex((u) => u.idx === idx) })).sort((a, b) => a.first - b.first)
  const rowsOut = order.map((o, n) => ({ i: n + 1, x: o.x, q: qtyAt.map((a) => a[o.idx]!) })).filter((o) => o.q.some((v) => v > 0))
  const header = ['Prioritate', 'SKU', 'Denumire', 'Vehicul (cererea)', 'Piesă căutată', 'Căutări/lună (estimat)', 'Parte', 'Calitate', 'Brand', 'Preț vânzare RON (TVA incl.)', 'Cost achiziție RON', 'Adaos net RON/buc', ...budgets.map((b) => `Cant. buget ${b / 1000}k`), 'Variante alternative', 'Interval preț variante RON', 'Poze', 'Slug'].join(',')
  const line = (o: (typeof rowsOut)[number]) => {
    const net = o.x.c.priceN / 1.21 - o.x.c.costRon
    return [o.i, o.x.c.sku, o.x.c.nameRo, o.x.combo, o.x.part, o.x.volume, o.x.c.side ?? '', o.x.c.quality ?? '', o.x.c.brand ?? '', Math.round(o.x.c.priceN), Math.round(o.x.c.costRon), Math.round(net), ...o.q, o.x.alts, `${Math.round(o.x.lo)}-${Math.round(o.x.hi)}`, Number(o.x.c.images), o.x.c.slug].map(cell).join(',')
  }
  const day = new Date().toISOString().slice(0, 10)
  const f1 = path.join(dir, `sku-stoc-initial-${day}.csv`), f2 = path.join(dir, `sku-voluminoase-${day}.csv`)
  fs.writeFileSync(f1, '﻿' + header + '\n' + rowsOut.map(line).join('\n') + '\n')
  fs.writeFileSync(f2, '﻿' + 'SKU,Denumire,Vehicul,Piesă,Căutări/lună,Parte,Preț RON,Cost RON,Clasă volum\n' + bulky.map((x) => [x.c.sku, x.c.nameRo, x.combo, x.part, x.volume, x.c.side ?? '', Math.round(x.c.priceN), Math.round(x.c.costRon), x.c.bulky].map(cell).join(',')).join('\n') + '\n')

  console.log(JSON.stringify({ curs: fx, combinatii: combos.size, skuCandidate: all.length, nevoluminoase: normal.length, voluminoase: bulky.length, fisiere: [f1, f2] }, null, 1))
  budgets.forEach((b, bi) => {
    const sel = rowsOut.filter((o) => o.q[bi]! > 0)
    const units = sel.reduce((a, o) => a + o.q[bi]!, 0), cap = sel.reduce((a, o) => a + o.q[bi]! * o.x.c.costRon, 0)
    const margin = sel.reduce((a, o) => a + o.q[bi]! * (o.x.c.priceN / 1.21 - o.x.c.costRon), 0)
    const seen = new Set<string>(); let vsum = 0; for (const o of sel) { const kk = o.x.combo + '|' + o.x.part; if (!seen.has(kk)) { seen.add(kk); vsum += o.x.volume } }
    const parts = new Map<string, number>(); for (const o of sel) parts.set(o.x.part, (parts.get(o.x.part) ?? 0) + o.q[bi]!)
    const makes = new Map<string, number>(); for (const o of sel) { const mk = o.x.combo.split(' ')[0]!; makes.set(mk, (makes.get(mk) ?? 0) + o.q[bi]!) }
    console.log(`\n## Buget ${b.toLocaleString('ro-RO')} RON: ${sel.length} SKU, ${units} bucăți, capital ${Math.round(cap).toLocaleString('ro-RO')} RON, adaos net dacă se vinde tot ≈ ${Math.round(margin).toLocaleString('ro-RO')} RON, ${seen.size} combinații (${vsum.toLocaleString('ro-RO')} căutări/lună)`)
    console.log('   piese:', [...parts].sort((a, c) => c[1] - a[1]).slice(0, 8).map(([kk, v]) => `${kk} ${v}`).join(' · '))
    console.log('   mărci:', [...makes].sort((a, c) => c[1] - a[1]).map(([kk, v]) => `${kk} ${v}`).join(' · '))
  })
  console.log('\n## Primele 15 SKU-uri:'); for (const o of rowsOut.slice(0, 15)) console.log(`${String(o.i).padStart(3)} ${o.x.c.sku} ${o.x.c.nameRo.slice(0, 38).padEnd(38)} ${o.x.combo.padEnd(20)} ${String(o.x.volume).padStart(5)}/lună ${String(Math.round(o.x.c.priceN)).padStart(5)} RON (cost ${String(Math.round(o.x.c.costRon)).padStart(4)}) cant.${o.q.join('/')} ${o.x.c.side ?? ''}`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
