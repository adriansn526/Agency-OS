import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as fs from 'fs';
import { getKeywordMetrics } from './lib/integrations/dataforseo';

// Rulare: npx tsx pricelist-volume-sample.ts <pricelist_utf8.txt> <out_dir>
const [, , file = '/tmp/pl/pl_utf8.txt', outDir = '/home/asns/projects/eCaroseria/docs/seo-sample'] = process.argv;

const BRANDS = ['VW', 'BMW', 'MERCEDES', 'RENAULT', 'AUDI', 'TOYOTA', 'FORD', 'OPEL'];
const MODELS_PER_BRAND = 4;

// [regex pe ENG DESCR, termen căutat în RO]
const PARTS: [RegExp, string][] = [
  [/DOOR MIRROR/, 'oglinda retrovizoare'],
  [/HEAD ?LAMP|HEADLIGHT/, 'far'],
  [/TAIL ?LAMP|REAR LAMP|REAR LIGHT/, 'stop'],
  [/^FRONT BUMPER(?! (BRACKET|GRILLE|SIDE|REINF|SPOILER))/, 'bara fata'],
  [/^REAR BUMPER(?! (BRACKET|GRILLE|SIDE|REINF|SPOILER))/, 'bara spate'],
  [/^FENDER|^FRONT FENDER|^WING/, 'aripa'],
  [/RADIATOR/, 'radiator apa'],
  [/DOOR HANDLE/, 'maner usa'],
  [/GRILLE?/, 'grila'],
  [/BONNET|^HOOD/, 'capota'],
  [/WINDOW REGULATOR/, 'macara geam'],
];

const ROMAN: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8', IX: '9', X: '10' };

function modelBase(model: string, brand: string): string {
  return model
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(19|20)\d{2}(-(19|20)?\d{2,4})?\b/g, '')
    .replace(/\b(SDN|S\.W\.|SW|H\/B|HB|SDN\/S\.W\.|P\/U|FACELIFT|F\/L)\b/g, '')
    .replace(/[\/-]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSearchModel(base: string, brand: string): string {
  let m = base.replace(/\s+/g, ' ').trim();
  const b = brand === 'VW' ? 'VW' : brand;
  if (m.toUpperCase().startsWith(b + ' ')) m = m.slice(b.length + 1);
  m = m.replace(/^SERIES (\d)/, 'seria $1').replace(/^(\w+) CLASS/, 'clasa $1').replace(/^CLASS /, 'clasa ');
  m = m.split(' ').map((w) => ROMAN[w] ?? w).join(' ');
  const brandRo = brand === 'VW' ? 'vw' : brand.toLowerCase();
  return `${brandRo} ${m.toLowerCase()}`.replace(/\s+/g, ' ').trim();
}

const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
type Row = { item: string; eng: string; brand: string; model: string; price: number; cat: string };
const rows: Row[] = [];
for (const l of lines) {
  const c = l.split(';');
  if (c.length !== 11 || !BRANDS.includes(c[6])) continue;
  const m = c[7].match(/\b(20\d{2})\b/); // primul an = anul de start
  if (!m || parseInt(m[1], 10) < 2010) continue;
  rows.push({ item: c[0], eng: c[3].toUpperCase(), brand: c[6], model: c[7], price: parseFloat(c[8].replace(',', '.')), cat: c[9] });
}
console.log(`Rânduri post-2010 la top mărci: ${rows.length}`);

// top modele per brand (după nr. piese), grupate pe numele de bază
const combos = new Map<string, { brand: string; search: string; count: number; parts: Map<string, { n: number; min: number; max: number }> }>();
for (const r of rows) {
  const search = toSearchModel(modelBase(r.model, r.brand), r.brand);
  const key = search;
  if (!combos.has(key)) combos.set(key, { brand: r.brand, search, count: 0, parts: new Map() });
  const e = combos.get(key)!;
  e.count++;
  for (const [re, ro] of PARTS) {
    if (re.test(r.eng)) {
      const p = e.parts.get(ro) ?? { n: 0, min: Infinity, max: 0 };
      p.n++; p.min = Math.min(p.min, r.price); p.max = Math.max(p.max, r.price);
      e.parts.set(ro, p);
      break;
    }
  }
}

const selected: typeof combos extends Map<any, infer V> ? V[] : never = [];
for (const b of BRANDS) {
  selected.push(...[...combos.values()].filter((c) => c.brand === b).sort((a, c) => c.count - a.count).slice(0, MODELS_PER_BRAND));
}

const keywords = new Map<string, { brand: string; model: string; part: string; pieces: number; min: number; max: number }>();
for (const s of selected) {
  for (const [part, st] of s.parts) {
    keywords.set(`${part} ${s.search}`, { brand: s.brand, model: s.search, part, pieces: st.n, min: st.min, max: st.max });
  }
}
console.log(`Modele: ${selected.length}, keywords: ${keywords.size}`);

async function main() {
  const kws = [...keywords.keys()];
  const res = await getKeywordMetrics(kws);
  const byKw = new Map(res.map((r) => [r.keyword.toLowerCase(), r]));
  const out = kws.map((k) => {
    const meta = keywords.get(k)!;
    const d = byKw.get(k.toLowerCase());
    return { keyword: k, ...meta, volume: d?.search_volume ?? 0, cpc: d?.cpc ?? 0, competition: d?.competition ?? 0 };
  }).sort((a, b) => b.volume - a.volume);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(`${outDir}/keywords-volume.json`, JSON.stringify(out, null, 2));
  const csv = ['keyword;brand;model;piesa;nr_piese_pricelist;pret_min;pret_max;volum_ro;cpc;competitie']
    .concat(out.map((o) => [o.keyword, o.brand, o.model, o.part, o.pieces, o.min, o.max, o.volume, o.cpc, o.competition].join(';')));
  fs.writeFileSync(`${outDir}/keywords-volume.csv`, csv.join('\n'));

  console.log(`Răspunsuri DFS: ${res.length}/${kws.length}; cu volum>0: ${out.filter((o) => o.volume > 0).length}`);
  console.table(out.slice(0, 25).map((o) => ({ keyword: o.keyword, vol: o.volume, cpc: o.cpc, piese: o.pieces })));
  const sumBy = (key: 'brand' | 'part') => {
    const m: Record<string, number> = {};
    out.forEach((o) => (m[o[key]] = (m[o[key]] || 0) + o.volume));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  console.log('Volum per brand:', sumBy('brand'));
  console.log('Volum per piesă:', sumBy('part'));
}
main();
