import { fetchDomainRanks, fetchSerpTopDomains } from '@/lib/integrations/dataforseo'
import { kdFromRanks, type ArticleProposal } from './proposals'

/** Estimated KD for each term (SERP top 10 → domain authority). Terms whose SERP request failed are left out of the result. */
export async function estimateKd(terms: string[], concurrency = 5): Promise<Map<string, number>> {
  const serps = new Map<string, string[]>()
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, terms.length) }, async () => {
    while (next < terms.length) {
      const t = terms[next++]!
      const d = await fetchSerpTopDomains(t)
      if (d) serps.set(t, d)
    }
  }))
  const ranks = await fetchDomainRanks([...serps.values()].flat())
  const out = new Map<string, number>()
  for (const [t, domains] of serps) {
    const kd = kdFromRanks(domains.map(d => ranks.get(d)).filter((r): r is number => r !== undefined))
    if (kd !== null) out.set(t, kd)
  }
  return out
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
