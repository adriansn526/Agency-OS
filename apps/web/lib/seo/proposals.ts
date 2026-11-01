/**
 * Article proposals of an SEO project: a main term + long tail terms, each with its monthly search volume.
 * Stored in Project.metadata.articleProposals (no schema change).
 */

export const PROPOSAL_STATUSES = ['propus', 'in_lucru', 'publicat', 'respins'] as const
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

/** Share of the monthly searches that turns into clicks for a page ranking around positions 3–5. Used for the estimate only. */
export const EST_CTR = 0.08

export interface ProposalTerm { term: string; volume: number }

export interface ArticleProposal {
  id: string
  mainTerm: string
  mainVolume: number
  longTails: ProposalTerm[]
  status: ProposalStatus
  source: 'gap' | 'manual'
  note?: string
  /** Who picked it up (set from the client portal). */
  claimedBy?: string
  articleUrl?: string
  createdAt: string
  updatedAt: string
}

const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
const vol = (n: unknown) => { const v = Math.round(Number(n)); return Number.isFinite(v) && v > 0 ? Math.min(v, 10_000_000) : 0 }

export function normTerms(raw: unknown, exclude: string): ProposalTerm[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>([exclude.toLowerCase()])
  const out: ProposalTerm[] = []
  for (const t of raw) {
    const term = clean(typeof t === 'string' ? t : (t as any)?.term)
    if (!term || seen.has(term.toLowerCase())) continue
    seen.add(term.toLowerCase())
    out.push({ term, volume: vol(typeof t === 'string' ? 0 : (t as any)?.volume) })
    if (out.length >= 30) break
  }
  return out
}

export function totals(p: Pick<ArticleProposal, 'mainVolume' | 'longTails'>) {
  const volume = p.mainVolume + p.longTails.reduce((s, t) => s + t.volume, 0)
  return { volume, clicks: Math.round(volume * EST_CTR) }
}

export function readProposals(metadata: unknown): ArticleProposal[] {
  const list = (metadata as any)?.articleProposals
  return Array.isArray(list) ? list : []
}

/** Validates input from the UI / API and returns a proposal ready to store. */
export function buildProposal(input: any, prev?: ArticleProposal): ArticleProposal | { error: string } {
  const mainTerm = clean(input?.mainTerm ?? prev?.mainTerm)
  if (!mainTerm) return { error: 'Termenul principal este obligatoriu' }
  const status = input?.status ?? prev?.status ?? 'propus'
  if (!PROPOSAL_STATUSES.includes(status)) return { error: 'Status invalid' }
  const now = new Date().toISOString()
  return {
    id: prev?.id ?? `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    mainTerm,
    mainVolume: input && 'mainVolume' in input ? vol(input.mainVolume) : prev?.mainVolume ?? 0,
    longTails: input && 'longTails' in input ? normTerms(input.longTails, mainTerm) : prev?.longTails ?? [],
    status,
    source: prev?.source ?? (input?.source === 'gap' ? 'gap' : 'manual'),
    note: input && 'note' in input ? clean(input.note) || undefined : prev?.note,
    claimedBy: input && 'claimedBy' in input ? clean(input.claimedBy) || undefined : prev?.claimedBy,
    articleUrl: input && 'articleUrl' in input ? clean(input.articleUrl) || undefined : prev?.articleUrl,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  }
}

// ─── Suggestions from competitor keywords ───

const STOP = new Set(['de', 'si', 'la', 'in', 'cu', 'a', 'al', 'ale', 'din', 'pe', 'sau', 'un', 'o', 'ce', 'cum', 'este', 'pentru', 'cod', 'codul', 'penal', 'art', 'articol', 'articolul'])
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export function stems(s: string): Set<string> {
  return new Set((fold(s).match(/[a-z0-9]+/g) || []).filter(w => !STOP.has(w) && w.length > 2).map(w => w.slice(0, 5)))
}
const articleNo = (s: string) => fold(s).match(/\bart(?:icolul)?\.?\s*(\d{1,4})\b/)?.[1]

export interface RawKeyword { keyword: string; volume: number; competitor?: string }

/**
 * Groups competitor keywords into candidate articles. Keywords of the same law article (art. N) or with
 * overlapping stems go together; the highest-volume one becomes the main term, the rest are long tails.
 * Anything already covered by `covered` (existing proposals / own articles) is dropped.
 */
export function suggestProposals(keywords: RawKeyword[], covered: string[], opts: { minVolume?: number; maxGroups?: number } = {}) {
  const minVolume = opts.minVolume ?? 90
  const coveredStems = covered.map(stems).filter(s => s.size)
  const coveredNos = new Set(covered.map(articleNo).filter(Boolean))
  const isCovered = (k: string) => {
    const no = articleNo(k)
    if (no && coveredNos.has(no)) return true
    const s = stems(k)
    return !s.size || coveredStems.some(c => [...c].every(x => s.has(x)) || [...s].every(x => c.has(x)))
  }
  const byKw = new Map<string, RawKeyword>()
  for (const k of keywords) {
    if (k.volume < minVolume || isCovered(k.keyword)) continue
    const key = fold(k.keyword)
    if (!byKw.has(key) || byKw.get(key)!.volume < k.volume) byKw.set(key, k)
  }
  const sorted = [...byKw.values()].sort((a, b) => b.volume - a.volume)
  const groups: { main: RawKeyword; stems: Set<string>; no?: string; rest: RawKeyword[] }[] = []
  for (const k of sorted) {
    const s = stems(k.keyword), no = articleNo(k.keyword)
    const g = groups.find(g => (no && g.no === no) || (!no && !g.no && overlap(s, g.stems) >= 0.6))
    if (g) g.rest.push(k)
    else groups.push({ main: k, stems: s, no, rest: [] })
  }
  return groups.slice(0, opts.maxGroups ?? 40).map(g => ({
    mainTerm: g.main.keyword,
    mainVolume: g.main.volume,
    longTails: g.rest.slice(0, 10).map(r => ({ term: r.keyword, volume: r.volume })),
    competitors: [...new Set([g.main, ...g.rest].map(r => r.competitor).filter(Boolean) as string[])].slice(0, 3),
  }))
}
function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0
  let n = 0; for (const x of a) if (b.has(x)) n++
  return n / Math.min(a.size, b.size)
}
