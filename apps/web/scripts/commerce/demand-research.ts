/**
 * Demand research for the local-warehouse decision: Google search volume (Romania, ro) for "piesă × model/generație" queries
 * of the main makes, via DataForSEO Keywords Data (Google Ads search volume). READ-ONLY on the ERP; spends DataForSEO credit.
 *   npx tsx --env-file=.env.local scripts/commerce/demand-research.ts [--max-requests=80] [--min-balance=15]
 * Resumable: results are cached in ~/data/ecaroseria-feed/research/volumes.json (queries already answered are skipped).
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { db } from '@repo/db'

import { MAKES, MAKE_TERM, PARTS, norm, modelLabel as model, genLabel } from '../../lib/commerce/research/vocab'

async function main() {
  const maxReq = Number((process.argv.find((a) => a.startsWith('--max-requests=')) ?? '--max-requests=80').split('=')[1])
  const minBal = Number((process.argv.find((a) => a.startsWith('--min-balance=')) ?? '--min-balance=15').split('=')[1])
  const dir = path.join(os.homedir(), 'data', 'ecaroseria-feed', 'research'); fs.mkdirSync(dir, { recursive: true })
  const cacheFile = path.join(dir, 'volumes.json')
  const cache: Record<string, { v: number | null; cpc: number | null; comp: string | null }> = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {}

  const rows = await db.$queryRaw<Array<{ make: string; model: string; gen: string }>>`
    SELECT mk.name AS make, m.name AS model, g.name AS gen FROM "VehicleGeneration" g JOIN "VehicleModel" m ON m.id = g."modelId" JOIN "VehicleMake" mk ON mk.id = m."makeId"
    WHERE g."isActive" AND mk.name = ANY(${MAKES}::text[])`
  const vehicles = new Set<string>() // "make|label"
  for (const r of rows) {
    const mk = MAKE_TERM[r.make]!, mod = model(r.model), gl = genLabel(r.gen, r.model)
    for (const label of new Set([mod, gl])) if (label && label.length >= 2) vehicles.add(`${mk}|${label}`)
  }
  const queries = new Set<string>()
  for (const v of vehicles) { const [mk, label] = v.split('|') as [string, string]; for (const p of PARTS) { queries.add(`${p} ${mk} ${label}`); queries.add(`${p} ${label}`) } }
  const all = [...queries].filter((q) => q.length <= 80)
  const todo = all.filter((q) => !(q in cache))
  console.log(JSON.stringify({ vehicles: vehicles.size, parts: PARTS.length, queries: all.length, alreadyCached: all.length - todo.length, toFetch: todo.length, requests: Math.ceil(todo.length / 1000) }))

  const auth = `Basic ${process.env.DATAFORSEO_AUTH_TOKEN}`
  const api = async (p: string, body?: unknown) => (await (await fetch(`https://api.dataforseo.com/v3/${p}`, { method: body ? 'POST' : 'GET', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json()) as any
  const bal = async () => Number(((await api('appendix/user_data')).tasks?.[0]?.result?.[0]?.money?.balance) ?? 0)
  let balance = await bal(); console.log('sold înainte: $' + balance.toFixed(2))

  let used = 0
  for (let i = 0; i < todo.length && used < maxReq; i += 1000) {
    if (balance < minBal) { console.log('oprit: sold sub limita de siguranță', balance); break }
    const batch = todo.slice(i, i + 1000)
    let res: any = null
    for (let attempt = 0; attempt < 3 && !res; attempt++) {
      try { const r = await api('keywords_data/google_ads/search_volume/live', [{ location_code: 2642, language_code: 'ro', keywords: batch }]); if (r.tasks?.[0]?.status_code === 20000) res = r; else { console.log('răspuns', r.tasks?.[0]?.status_code, r.tasks?.[0]?.status_message); await new Promise((s) => setTimeout(s, 15000)) } }
      catch (e) { console.log('eroare rețea', String(e).slice(0, 80)); await new Promise((s) => setTimeout(s, 15000)) }
    }
    if (!res) { console.log('lot eșuat, oprit'); break }
    const got = new Map<string, any>((res.tasks[0].result ?? []).map((r: any) => [norm(r.keyword), r]))
    for (const q of batch) { const r = got.get(norm(q)); cache[q] = { v: r?.search_volume ?? null, cpc: r?.cpc ?? null, comp: r?.competition ?? null } }
    fs.writeFileSync(cacheFile, JSON.stringify(cache))
    used++; balance -= Number(res.cost ?? 0.09)
    console.log(`lot ${used}: ${batch.length} interogări, cost $${res.cost}, cu volum ${batch.filter((q) => cache[q]?.v).length}`)
    await new Promise((s) => setTimeout(s, 6000))
  }
  console.log('sold după: $' + (await bal()).toFixed(2), '| în cache:', Object.keys(cache).length)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
