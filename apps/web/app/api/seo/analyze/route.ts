import { NextRequest, NextResponse } from 'next/server'
import { analyzePage } from '@/lib/seo/page-analyzer'

/**
 * POST /api/seo/analyze
 * Analyze a single page's SEO on-page factors
 * Body: { url: string, targetKeyword?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, targetKeyword } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL-ul este obligatoriu' }, { status: 400 })
    }

    // Validate URL format
    let normalizedUrl = url
    if (!url.startsWith('http')) {
      normalizedUrl = `https://${url}`
    }

    try {
      new URL(normalizedUrl)
    } catch {
      return NextResponse.json({ error: 'URL invalid' }, { status: 400 })
    }

    const analysis = await analyzePage(normalizedUrl, targetKeyword)

    return NextResponse.json({
      data: analysis,
      meta: {
        url: normalizedUrl,
        targetKeyword: targetKeyword || null,
        analyzedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[SEO] Analyze error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
