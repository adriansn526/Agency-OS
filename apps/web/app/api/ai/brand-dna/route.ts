import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { crawlBrandDNA } from '@/lib/ai/brand-dna/crawler'

// ─── GET /api/ai/brand-dna?clientId=xxx ───
export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const brandDNA = await db.brandDNA.findUnique({
      where: { clientId },
    })

    if (!brandDNA) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({ data: brandDNA })
  } catch (error) {
    console.error('[API] GET /api/ai/brand-dna error:', error)
    return NextResponse.json({ error: 'Failed to fetch Brand DNA' }, { status: 500 })
  }
}

// ─── POST /api/ai/brand-dna ───
// Crawl a website and save/update Brand DNA for a client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, url } = body

    if (!clientId || !url) {
      return NextResponse.json({ error: 'clientId and url are required' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    console.log(`[Brand DNA] Starting crawl for client ${clientId}: ${parsedUrl.href}`)

    // Crawl the website
    const result = await crawlBrandDNA(parsedUrl.href)

    // Upsert Brand DNA in database
    const brandDNA = await db.brandDNA.upsert({
      where: { clientId },
      create: {
        clientId,
        url: parsedUrl.href,
        name: result.name,
        tagline: result.tagline,
        logoUrl: result.logoUrl,
        favicon: result.favicon,
        ogImage: result.ogImage,
        logos: result.logos as any,
        colors: result.colors as any,
        fonts: result.fonts as any,
        tone: result.tone as any,
        audience: result.audience as any,
        industry: result.industry,
        category: result.category,
        keywords: result.keywords,
        rawText: result.rawText,
      },
      update: {
        url: parsedUrl.href,
        name: result.name,
        tagline: result.tagline,
        logoUrl: result.logoUrl,
        favicon: result.favicon,
        ogImage: result.ogImage,
        logos: result.logos as any,
        colors: result.colors as any,
        fonts: result.fonts as any,
        tone: result.tone as any,
        audience: result.audience as any,
        industry: result.industry,
        category: result.category,
        keywords: result.keywords,
        rawText: result.rawText,
        updatedAt: new Date(),
      },
    })

    console.log(`[Brand DNA] Crawl complete for client ${clientId}`)

    return NextResponse.json({ data: brandDNA })
  } catch (error) {
    console.error('[API] POST /api/ai/brand-dna error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Brand DNA crawl failed: ${message}` }, { status: 500 })
  }
}
