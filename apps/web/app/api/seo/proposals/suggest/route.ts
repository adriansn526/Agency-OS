import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { readProposals, regroupBySerp, suggestProposals, totals, type Candidate, type RawKeyword } from '@/lib/seo/proposals'
import { fetchSerps, kdFromSerps } from '@/lib/seo/proposals-kd'
import { fetchRankedKeywords } from '@/lib/integrations/dataforseo'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Cap on SERP requests per analysis (cost control). */
const MAX_SERP_TERMS = 200

/**
 * POST { projectId, competitors: string[], covered?: string[], minVolume?, verifySerp? (default true) }
 * Pulls the keywords each competitor ranks for (top 20), drops what the project already covers and returns grouped
 * article candidates (main term + long tails with volumes). With verifySerp, Google's top 10 of every term decides what is one
 * article and what is separate (long tails sharing fewer than 3 URLs with the main term become their own article) and also gives
 * the estimated KD (about 0.002 USD per term). Nothing is stored: the UI decides what to add.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, competitors, covered = [], minVolume, verifySerp = true } = await req.json()
    const domains = (Array.isArray(competitors) ? competitors : []).map((d: string) => String(d).replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()).filter(Boolean).slice(0, 10)
    if (!projectId || !domains.length) return NextResponse.json({ error: 'projectId și cel puțin un concurent sunt obligatorii' }, { status: 400 })
    const project = await db.project.findUnique({ where: { id: projectId }, select: { metadata: true } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const mine = readProposals(project.metadata).flatMap(p => [p.mainTerm, ...p.longTails.map(t => t.term)])
    const all: RawKeyword[] = []
    for (const d of domains) all.push(...(await fetchRankedKeywords(d, 500)).map(k => ({ ...k, competitor: d })))
    let data: Candidate[] = suggestProposals(all, [...mine, ...covered.map(String)], { minVolume: Number(minVolume) || undefined, maxGroups: 30 })
    let serpTerms = 0
    if (verifySerp !== false && data.length) {
      const terms = [...new Set(data.flatMap(c => [c.mainTerm, ...c.longTails.map(t => t.term)]))].slice(0, MAX_SERP_TERMS)
      const serps = await fetchSerps(terms)
      serpTerms = serps.size
      const urls = new Map([...serps].map(([t, r]) => [t, r.map(x => x.url)]))
      const kd = await kdFromSerps(serps)
      data = data.flatMap(c => regroupBySerp(c, urls)).map(c => ({
        ...c,
        ...(kd.has(c.mainTerm) ? { mainKd: kd.get(c.mainTerm) } : {}),
        longTails: c.longTails.map(t => (kd.has(t.term) ? { ...t, kd: kd.get(t.term) } : t)),
      }))
    }
    const out = data.map(c => ({ ...c, ...totals(c) })).sort((a, b) => b.volume - a.volume)
    return NextResponse.json({ data: out, meta: { competitors: domains, keywordsScanned: all.length, serpTerms } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
