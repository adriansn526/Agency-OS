import { NextRequest, NextResponse } from 'next/server'
import { analyzeNegativeKeywords, applyNegativeKeywords } from '@/lib/reports/negative-keywords-analyzer'

/**
 * POST /api/ads/negative-keywords/analyze
 * Analyze search terms and classify them as irrelevant/suspect/relevant
 * Body: { customerId: string, dateFrom?: string, dateTo?: string, campaignIds?: string[], domain?: string, clientName?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, dateFrom, dateTo, campaignIds, domain, clientName } = body

    if (!customerId) {
      return NextResponse.json({ error: 'customerId este obligatoriu' }, { status: 400 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const from = dateFrom || thirtyDaysAgo.toISOString().slice(0, 10)
    const to = dateTo || now.toISOString().slice(0, 10)

    const analysis = await analyzeNegativeKeywords(
      customerId, from, to,
      campaignIds, domain, clientName
    )

    return NextResponse.json({
      data: analysis,
      meta: { customerId, dateRange: { from, to }, domain },
    })
  } catch (error: any) {
    console.error('[Negative Keywords] Analyze error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
