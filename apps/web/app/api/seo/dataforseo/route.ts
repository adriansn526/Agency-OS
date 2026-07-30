import { NextRequest, NextResponse } from 'next/server'
import { getKeywordMetrics, getCompetitorKeywords } from '@/lib/integrations/dataforseo'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, keywords, domain, locationCode, languageCode } = body

    if (action === 'search_volume') {
      if (!keywords || !Array.isArray(keywords)) {
        return NextResponse.json({ error: 'Keywords array is required' }, { status: 400 })
      }
      const data = await getKeywordMetrics(keywords, locationCode, languageCode)
      return NextResponse.json({ data })
    }

    if (action === 'competitor') {
      if (!domain) {
        return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
      }
      const data = await getCompetitorKeywords(domain, locationCode, languageCode)
      return NextResponse.json({ data })
    }

    if (action === 'backlinks') {
      if (!domain) {
        return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
      }
      const { getDomainBacklinksSummary, getDomainBacklinksDetail } = await import('@/lib/integrations/dataforseo')
      const [summary, detail] = await Promise.all([
        getDomainBacklinksSummary(domain),
        getDomainBacklinksDetail(domain, 100)
      ])
      return NextResponse.json({ summary, detail })
    }

    if (action === 'discover_competitors') {
      if (!domain) {
        return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
      }
      const { getCompetitorsDomain } = await import('@/lib/integrations/dataforseo')
      const data = await getCompetitorsDomain(domain, locationCode, languageCode)
      return NextResponse.json({ data })
    }

    if (action === 'serp_competitors') {
      const keywordToSearch = body.keyword
      if (!keywordToSearch) {
        return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
      }
      const { getSerpDomains } = await import('@/lib/integrations/dataforseo')
      const data = await getSerpDomains(keywordToSearch, locationCode, languageCode)
      return NextResponse.json({ data })
    }

    if (action === 'related_keywords') {
      const keywordToSearch = body.keyword
      if (!keywordToSearch) {
        return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
      }
      // getRelatedKeywords takes the keyword, not an array
      const { getRelatedKeywords } = await import('@/lib/integrations/dataforseo')
      const data = await getRelatedKeywords(keywordToSearch, locationCode, languageCode)
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[API] POST /api/seo/dataforseo error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
