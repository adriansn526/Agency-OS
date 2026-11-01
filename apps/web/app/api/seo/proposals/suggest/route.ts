import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { readProposals, suggestProposals, type RawKeyword } from '@/lib/seo/proposals'
import { fetchRankedKeywords } from '@/lib/integrations/dataforseo'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST { projectId, competitors: string[], covered?: string[], minVolume? }
 * Pulls the keywords each competitor ranks for (top 20), drops what the project already covers and returns grouped
 * article candidates (main term + long tails with volumes). Nothing is stored: the UI decides what to add.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, competitors, covered = [], minVolume } = await req.json()
    const domains = (Array.isArray(competitors) ? competitors : []).map((d: string) => String(d).replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()).filter(Boolean).slice(0, 10)
    if (!projectId || !domains.length) return NextResponse.json({ error: 'projectId și cel puțin un concurent sunt obligatorii' }, { status: 400 })
    const project = await db.project.findUnique({ where: { id: projectId }, select: { metadata: true } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const mine = readProposals(project.metadata).flatMap(p => [p.mainTerm, ...p.longTails.map(t => t.term)])
    const all: RawKeyword[] = []
    for (const d of domains) all.push(...(await fetchRankedKeywords(d, 500)).map(k => ({ ...k, competitor: d })))
    const data = suggestProposals(all, [...mine, ...covered.map(String)], { minVolume: Number(minVolume) || undefined })
    return NextResponse.json({ data, meta: { competitors: domains, keywordsScanned: all.length } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
