/**
 * Article proposals of an SEO project: a main term + long tail terms, each with its monthly search volume.
 * Stored in Project.metadata.articleProposals (no schema change).
 */

export const PROPOSAL_STATUSES = ['propus', 'in_lucru', 'publicat', 'respins'] as const
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

/** Share of the monthly searches that turns into clicks for a page ranking around positions 3–5. Used for the estimate only. */
export const EST_CTR = 0.08

/** `kd` = estimated keyword difficulty 0–100 (see kdFromRanks); undefined = not computed yet. */
export interface ProposalTerm { term: string; volume: number; kd?: number }

export interface ArticleProposal {
  id: string
  mainTerm: string
  mainVolume: number
  mainKd?: number
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
const kdv = (n: unknown): number | undefined => { const v = Number(n); return n != null && n !== '' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : undefined }
const vol = (n: unknown) => { const v = Math.round(Number(n)); return Number.isFinite(v) && v > 0 ? Math.min(v, 10_000_000) : 0 }

export function normTerms(raw: unknown, exclude: string): ProposalTerm[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>([exclude.toLowerCase()])
  const out: ProposalTerm[] = []
  for (const t of raw) {
    const term = clean(typeof t === 'string' ? t : (t as any)?.term)
    if (!term || seen.has(term.toLowerCase())) continue
    seen.add(term.toLowerCase())
    const kd = typeof t === 'string' ? undefined : kdv((t as any)?.kd)
    out.push({ term, volume: vol(typeof t === 'string' ? 0 : (t as any)?.volume), ...(kd === undefined ? {} : { kd }) })
    if (out.length >= 30) break
  }
  return out
}

/**
 * Difficulty of the whole article = average of its terms' KD weighted by search volume (plain average when no term has volume),
 * counting only the terms that have a KD. null = nothing computed yet.
 */
export function totals(p: Pick<ArticleProposal, 'mainVolume' | 'longTails'> & { mainKd?: number }) {
  const volume = p.mainVolume + p.longTails.reduce((s, t) => s + t.volume, 0)
  const withKd = [{ volume: p.mainVolume, kd: p.mainKd }, ...p.longTails].filter((t): t is { volume: number; kd: number } => typeof t.kd === 'number')
  const w = withKd.reduce((s, t) => s + t.volume, 0)
  const kd = withKd.length === 0 ? null : Math.round(w > 0 ? withKd.reduce((s, t) => s + t.kd * t.volume, 0) / w : withKd.reduce((s, t) => s + t.kd, 0) / withKd.length)
  return { volume, clicks: Math.round(volume * EST_CTR), kd }
}

/**
 * DataForSEO's own KD is 0 for almost every Romanian keyword, so difficulty is estimated from the SERP:
 * the average authority rank (0–1000, DataForSEO backlinks rank) of the domains in the top 10, scaled to 0–100.
 */
export function kdFromRanks(ranks: number[]): number | null {
  const r = ranks.filter(x => Number.isFinite(x) && x >= 0)
  if (!r.length) return null
  return Math.min(100, Math.round(r.reduce((a, b) => a + b, 0) / r.length / 10))
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
    ...(() => { const k = input && 'mainKd' in input ? kdv(input.mainKd) : prev?.mainKd; return k === undefined ? {} : { mainKd: k } })(),
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
