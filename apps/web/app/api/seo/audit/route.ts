import { NextRequest, NextResponse } from 'next/server'
import { auditSite } from '@/lib/seo/page-analyzer'
import { parseSitemap, mergeUrlSources } from '@/lib/seo/sitemap-crawler'
import { getTopPages } from '@/lib/integrations/gsc'
import { db } from '@repo/db'

/**
 * POST /api/seo/audit
 * Full site SEO audit — crawls pages via sitemap + GSC data
 * Body: { domain: string, clientId?: string, gscSiteUrl?: string, maxPages?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, clientId, gscSiteUrl, maxPages = 50 } = body

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domeniul este obligatoriu' }, { status: 400 })
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    // Step 1: Discover URLs from sitemap
    console.log(`[SEO Audit] Discovering URLs for ${cleanDomain}...`)
    const sitemapUrls = await parseSitemap(cleanDomain, maxPages * 2)

    // Step 2: Get GSC top pages if available
    let gscPages: Array<{ page: string; clicks: number; position: number }> | undefined
    const gscUrl = gscSiteUrl || `sc-domain:${cleanDomain}`

    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
      const gscTopPages = await getTopPages(
        gscUrl,
        thirtyDaysAgo.toISOString().slice(0, 10),
        now.toISOString().slice(0, 10),
        maxPages
      )
      gscPages = gscTopPages.map(p => ({
        page: p.page,
        clicks: p.clicks,
        position: p.position,
      }))
    } catch (err) {
      console.warn(`[SEO Audit] GSC data not available for ${gscUrl}:`, err)
    }

    // Step 3: Merge and prioritize URLs
    const urlsToAudit = mergeUrlSources(sitemapUrls, gscPages, maxPages)
    console.log(`[SEO Audit] Auditing ${urlsToAudit.length} pages for ${cleanDomain}`)

    // Step 4: Run audit
    const result = await auditSite(cleanDomain, urlsToAudit.map(u => u.url))

    // Step 5: Store in DB if clientId provided
    if (clientId) {
      try {
        await db.seoAudit.create({
          data: {
            domain: cleanDomain,
            clientId,
            results: JSON.parse(JSON.stringify(result.pages)),
            summary: JSON.parse(JSON.stringify(result.summary)),
            score: result.summary.avgScore,
          },
        })
        console.log(`[SEO Audit] Saved audit for ${cleanDomain} (score: ${result.summary.avgScore})`)
      } catch (dbErr) {
        console.warn('[SEO Audit] Failed to save to DB (model may not exist yet):', dbErr)
      }
    }

    return NextResponse.json({
      data: result,
      meta: {
        domain: cleanDomain,
        clientId: clientId || null,
        urlsDiscovered: sitemapUrls.length,
        urlsFromGsc: gscPages?.length || 0,
        urlsAudited: urlsToAudit.length,
        auditedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[SEO Audit] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/seo/audit?domain=example.com
 * Get latest stored audit for a domain
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ error: 'domain param required' }, { status: 400 })
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    try {
      const audit = await db.seoAudit.findFirst({
        where: { domain: cleanDomain },
        orderBy: { createdAt: 'desc' },
      })

      if (!audit) {
        return NextResponse.json({ data: null, message: 'Niciun audit găsit pentru acest domeniu' })
      }

      return NextResponse.json({ data: audit })
    } catch {
      // SeoAudit model may not exist yet
      return NextResponse.json({ data: null, message: 'Model SeoAudit nu există încă' })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
