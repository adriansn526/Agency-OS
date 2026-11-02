import * as dotenv from "dotenv"; dotenv.config({ path: "/home/asns/projects/AdvancedSystems/agency-os/apps/web/.env.local" });
import fs from "fs";
import { getAdsCustomer, getKeywordVolumes } from "./lib/integrations/google-ads";
import { regroupBySerp, stems } from "./lib/seo/proposals";
import { fetchSerps, kdFromSerps } from "./lib/seo/proposals-kd";
const S = process.env.S!, CUST = "5006254552", OPTS = { geoTargetConstants: ["geoTargetConstants/2642"], language: "languageConstants/1032" };
const MAX_LTT = 10, MIN_VOL = 20;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
async function ideas(seed: string): Promise<[string, number][]> {
  const c: any = getAdsCustomer(CUST);
  for (let a = 0; ; a++) {
    try {
      const r = await c.keywordPlanIdeas.generateKeywordIdeas({ customer_id: CUST, language: OPTS.language, geo_target_constants: OPTS.geoTargetConstants, keyword_plan_network: "GOOGLE_SEARCH", keyword_seed: { keywords: [seed] }, page_size: 80 });
      return (r.results ?? r).map((x: any) => [String(x.text), Number(x.keyword_idea_metrics?.avg_monthly_searches ?? 0)]);
    } catch (e: any) {
      const m = String(e?.errors?.[0]?.message ?? e?.message ?? e); const w = /retry in (\d+) seconds/i.exec(m);
      if (w && a < 4) { await sleep((Number(w[1]) + 1) * 1000); continue }
      if (a < 2) { await sleep(2000); continue }
      console.error("ideas fail", seed, m.slice(0, 120)); return [];
    }
  }
}
(async () => {
  const arts: { id: string; slug: string; kw: string; sec: string }[] = JSON.parse(fs.readFileSync(S + "/arts.json", "utf8"));
  const secOf = (a: any) => a.sec.split(",").map((x: string) => x.trim()).filter(Boolean);
  const vols = await getKeywordVolumes(CUST, [...new Set(arts.flatMap(a => [a.kw, ...secOf(a)]))], OPTS);
  const volOf = (t: string) => vols[t] ?? vols[t.toLowerCase()] ?? 0;
  console.log("volume principale/secundare obținute:", Object.keys(vols).length);
  const cand = new Map<string, { term: string; volume: number }[]>();
  let i = 0;
  for (const a of arts) {
    const core = stems(a.kw); const artNo = (a.slug.match(/art-?(\d{2,3})/) ?? [])[1] ?? (a.slug.match(/-(\d{3})$/) ?? [])[1];
    const have = new Set([fold(a.kw)]);
    const list: { term: string; volume: number }[] = [];
    for (const t of secOf(a)) if (!have.has(fold(t))) { have.add(fold(t)); list.push({ term: t, volume: volOf(t) }) }
    for (const [t, v] of (await ideas(a.kw)).sort((x, y) => y[1] - x[1])) {
      if (v < MIN_VOL || have.has(fold(t))) continue;
      const s = stems(t); const isArt = artNo ? new RegExp(`\\bart\\w*\\.?\\s*${artNo}\\b`).test(fold(t)) : false; if (!isArt && ![...core].every(x => s.has(x))) continue;
      have.add(fold(t)); list.push({ term: t, volume: v });
    }
    cand.set(a.id, list.sort((x, y) => y.volume - x.volume).slice(0, MAX_LTT + 4));
    if (++i % 10 === 0) console.log("idei", i, "/", arts.length);
  }
  const allTerms = [...new Set(arts.flatMap(a => [a.kw, ...cand.get(a.id)!.map(t => t.term)]))];
  console.log("termeni pentru SERP:", allTerms.length);
  const cachedS: Record<string, any> = fs.existsSync(S + '/serps-all.json') ? JSON.parse(fs.readFileSync(S + '/serps-all.json', 'utf8')) : {}; const serps = new Map<string, any>(Object.entries(cachedS)); const missing = allTerms.filter(t => !serps.has(t)); console.log('SERP noi:', missing.length); for (const [t, r] of await fetchSerps(missing, 6)) serps.set(t, r); console.log("SERP-uri:", serps.size);
  fs.writeFileSync(S + "/serps-all.json", JSON.stringify(Object.fromEntries(serps)));
  const kd = await kdFromSerps(serps);
  const urls = new Map([...serps].map(([t, r]) => [t, r.map(x => x.url)]));
  const out: any[] = [], extra: any[] = [];
  for (const a of arts) {
    const core = stems(a.kw); const artNo = (a.slug.match(/art-?(\d{2,3})/) ?? [])[1] ?? (a.slug.match(/-(\d{3})$/) ?? [])[1];
    const direct = (t: string) => { const st = stems(t); return (st.size === core.size && [...core].every(x => st.has(x))) || (artNo !== undefined && new RegExp(`\\bart\\w*\\.?\\s*${artNo}\\b`).test(fold(t))); };
    const all = cand.get(a.id)!, sure = all.filter(t => direct(t.term)), unsure = all.filter(t => !direct(t.term));
    const groups = regroupBySerp({ mainTerm: a.kw, mainVolume: volOf(a.kw), longTails: unsure }, urls);
    const g = groups[0]!; const same = [...sure, ...g.longTails].sort((x, y) => y.volume - x.volume).slice(0, MAX_LTT);
    out.push({ id: a.id, slug: a.slug, kw: a.kw, volume: volOf(a.kw), kd: kd.get(a.kw) ?? null, ltt: same.map(t => ({ term: t.term, volume: t.volume, kd: kd.get(t.term) ?? null })) });
    for (const o of groups.slice(1)) extra.push({ from: a.slug, term: o.mainTerm, volume: o.mainVolume, kd: kd.get(o.mainTerm) ?? null, ltt: o.longTails.map(t => t.term) });
  }
  fs.writeFileSync(S + "/analysis.json", JSON.stringify(out)); fs.writeFileSync(S + "/analysis-extra.json", JSON.stringify(extra));
  console.log("GATA", out.length, "articole;", extra.length, "subiecte separate găsite");
})();
