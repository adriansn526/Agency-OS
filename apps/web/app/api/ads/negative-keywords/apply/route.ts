import { NextRequest, NextResponse } from 'next/server'
import { applyNegativeKeywords } from '@/lib/reports/negative-keywords-analyzer'

/**
 * POST /api/ads/negative-keywords/apply
 * Add negative keywords to a campaign (WRITE action - requires confirmation)
 * Body: { customerId: string, campaignId: string, keywords: string[], matchType?: string, clientName?: string, domain?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, campaignId, keywords, matchType = 'BROAD', clientName, domain } = body

    if (!customerId || !campaignId || !keywords?.length) {
      return NextResponse.json({
        error: 'customerId, campaignId, și keywords[] sunt obligatorii',
      }, { status: 400 })
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'keywords trebuie să fie un array ne-gol' }, { status: 400 })
    }

    if (keywords.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 de termeni per cerere' }, { status: 400 })
    }

    const result = await applyNegativeKeywords(
      customerId, campaignId, keywords,
      matchType as 'BROAD' | 'PHRASE' | 'EXACT',
      clientName, domain
    )

    return NextResponse.json({
      data: result,
      meta: {
        customerId,
        campaignId,
        matchType,
        keywordsCount: keywords.length,
        appliedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[Negative Keywords] Apply error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
