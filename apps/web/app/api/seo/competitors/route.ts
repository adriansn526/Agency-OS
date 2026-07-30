import { NextRequest, NextResponse } from 'next/server'
import { runCompetitorAnalysis, compareWithCompetitor } from '@/lib/seo/competitor-analyzer'

/**
 * POST /api/seo/competitors
 * Run competitor analysis for a domain
 * Body: { domain: string, gscSiteUrl?: string, competitors: string[], dateFrom?: string, dateTo?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, gscSiteUrl, competitors, dateFrom, dateTo } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domeniul este obligatoriu' }, { status: 400 })
    }

    if (!competitors?.length) {
      return NextResponse.json({ error: 'Adaugă cel puțin un competitor' }, { status: 400 })
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const gscUrl = gscSiteUrl || `sc-domain:${cleanDomain}`

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const from = dateFrom || thirtyDaysAgo.toISOString().slice(0, 10)
    const to = dateTo || now.toISOString().slice(0, 10)

    const result = await runCompetitorAnalysis(cleanDomain, gscUrl, competitors, from, to)

    return NextResponse.json({
      data: result,
      meta: {
        domain: cleanDomain,
        competitors: competitors.length,
        analyzedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[Competitors] Analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/seo/competitors?domain=example.com&competitor=rival.com
 * Quick comparison between two domains
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    const competitor = searchParams.get('competitor')

    if (!domain || !competitor) {
      return NextResponse.json({ error: 'Params domain și competitor sunt obligatorii' }, { status: 400 })
    }

    const comparison = await compareWithCompetitor(
      domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      competitor.replace(/^https?:\/\//, '').replace(/\/$/, '')
    )

    if (!comparison) {
      return NextResponse.json({ error: 'Comparația a eșuat' }, { status: 500 })
    }

    return NextResponse.json({ data: comparison })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
