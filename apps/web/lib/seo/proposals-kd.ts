import { fetchDomainRanks, fetchSerpTop } from '@/lib/integrations/dataforseo'
import { kdFromRanks, type ArticleProposal } from './proposals'

/** Minimum number of top results with a known authority rank needed to estimate KD. */
export const MIN_RANKED = 4

export type Serp = { domain: string; url: string }[]

/** SERP top 10 per term, a few requests at a time. Terms whose request failed are absent from the map. */
export async function fetchSerps(terms: string[], concurrency = 5): Promise<Map<string, Serp>> {
  const serps = new Map<string, Serp>()
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, terms.length) }, async () => {
    while (next < terms.length) {
      const t = terms[next++]!
      const r = await fetchSerpTop(t)
      if (r) serps.set(t, r)
    }
  }))
  return serps
}

/** Estimated KD per term from already fetched SERPs (one backlinks-rank request for all domains). */
export async function kdFromSerps(serps: Map<string, Serp>): Promise<Map<string, number>> {
  const ranks = await fetchDomainRanks([...serps.values()].flatMap(s => s.map(r => r.domain)))
  const out = new Map<string, number>()
  for (const [t, serp] of serps) {
    // fewer than 4 ranked results (SERPs full of features) make the average swing wildly between runs: better no figure than a random one
    const rs = serp.map(r => ranks.get(r.domain)).filter((r): r is number => r !== undefined)
    const kd = rs.length >= MIN_RANKED ? kdFromRanks(rs) : null
    if (kd !== null) out.set(t, kd)
  }
  return out
}

/** Estimated KD for each term (SERP top 10 → domain authority). Terms whose SERP request failed are left out of the result. */
export async function estimateKd(terms: string[], concurrency = 5): Promise<Map<string, number>> {
  return kdFromSerps(await fetchSerps(terms, concurrency))
}

/** Terms of the given proposals that still have no KD. */
export function termsNeedingKd(list: ArticleProposal[]): string[] {
  const s = new Set<string>()
  for (const p of list) {
    if (p.mainKd === undefined) s.add(p.mainTerm)
    for (const t of p.longTails) if (t.kd === undefined) s.add(t.term)
  }
  return [...s]
}

export function applyKd(list: ArticleProposal[], kd: Map<string, number>): ArticleProposal[] {
  return list.map(p => ({
    ...p,
    ...(kd.has(p.mainTerm) ? { mainKd: kd.get(p.mainTerm)! } : {}),
    longTails: p.longTails.map(t => (kd.has(t.term) ? { ...t, kd: kd.get(t.term)! } : t)),
  }))
}

export function clearKd(list: ArticleProposal[]): ArticleProposal[] {
  return list.map(({ mainKd: _m, ...p }) => ({ ...p, longTails: p.longTails.map(({ kd: _k, ...t }) => t) }))
}
