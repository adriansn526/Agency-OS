import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@repo/db'
import { analyzePage, auditSite } from '@/lib/seo/page-analyzer'
import { parseSitemap } from '@/lib/seo/sitemap-crawler'
import { getTopQueries, getTopPages, getPageKeywords } from '@/lib/integrations/gsc'
import { analyzeSEOOpportunities } from '@/lib/seo/seo-recommendations'
import { discoverCompetitors } from '@/lib/seo/serp-competitor-discovery'

// GET /api/seo/dashboard?domain=example.com&action=overview|analyze|audit|competitors
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const domain = searchParams.get('domain')
  const action = searchParams.get('action') || 'overview'

  if (!domain) {
    return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 })
  }

  try {
    switch (action) {
      case 'overview': {
        // Get domain config for GSC URL
        const domainConfig = await db.clientDomainConfig.findFirst({
          where: { domain: { contains: domain } },
          include: { client: true },
        })

        const gscUrl = domainConfig?.gscSiteUrl || `sc-domain:${domain}`

        // Date range: last 30 days
        const to = new Date()
        const from = new Date(to)
        from.setDate(from.getDate() - 30)
        const dateFrom = from.toISOString().split('T')[0]!
        const dateTo = to.toISOString().split('T')[0]!

        // Fetch GSC data in parallel
        const [topQueries, topPages, pageKeywords, lastAudit] = await Promise.all([
          getTopQueries(gscUrl, dateFrom, dateTo, 30).catch(() => []),
          getTopPages(gscUrl, dateFrom, dateTo, 30).catch(() => []),
          getPageKeywords(gscUrl, dateFrom, dateTo, 200).catch(() => []),
          (db as any).seoAudit ? (db as any).seoAudit.findFirst({
            where: { domain },
            orderBy: { createdAt: 'desc' },
          }).catch(() => null) : Promise.resolve(null),
        ])

        // Run SEO analysis on pageKeywords
        const seoAnalysis = pageKeywords.length > 0 ? analyzeSEOOpportunities(pageKeywords) : null

        return NextResponse.json({
          domain,
          client: domainConfig?.client?.companyName || null,
          gscUrl,
          topQueries,
          topPages,
          seoAnalysis,
          lastAudit: lastAudit ? {
            id: lastAudit.id,
            score: lastAudit.score,
            summary: lastAudit.summary,
            createdAt: lastAudit.createdAt,
          } : null,
          dateRange: { from: dateFrom, to: dateTo },
        })
      }

      case 'analyze': {
        const url = searchParams.get('url')
        const keyword = searchParams.get('keyword') || undefined
        if (!url) {
          return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
        }

        const analysis = await analyzePage(url, keyword)
        return NextResponse.json(analysis)
      }

      case 'audit': {
        const maxPages = parseInt(searchParams.get('maxPages') || '30')
        const fullDomain = domain.startsWith('http') ? domain : `https://${domain}`

        // Discover URLs from sitemap
        const sitemapResults = await parseSitemap(domain, maxPages)
        const sitemapUrls = sitemapResults.map(r => r.url)
        
        // Also add top GSC pages
        const domainConfig = await db.clientDomainConfig.findFirst({
          where: { domain: { contains: domain } },
        })
        const gscUrl = domainConfig?.gscSiteUrl || `sc-domain:${domain}`
        const to = new Date()
        const from = new Date(to)
        from.setDate(from.getDate() - 30)
        const gscPages = await getTopPages(gscUrl, from.toISOString().split('T')[0]!, to.toISOString().split('T')[0]!, 20).catch(() => [])

        // Merge URLs (dedupe)
        const urlSet = new Set<string>()
        for (const u of sitemapUrls) urlSet.add(u)
        for (const p of gscPages) {
          if (p.page) urlSet.add(p.page)
        }

        const urls = [...urlSet].slice(0, maxPages)

        // Build keyword map from GSC for target keyword matching
        const pageKeywords = await getPageKeywords(gscUrl, from.toISOString().split('T')[0]!, to.toISOString().split('T')[0]!, 200).catch(() => [])
        const kwMap = new Map<string, string>()
        for (const pk of pageKeywords) {
          const existing = kwMap.get(pk.page)
          if (!existing) kwMap.set(pk.page, pk.query)
        }

        const result = await auditSite(domain, urls, kwMap)

        // Save to DB
        if ((db as any).seoAudit) {
          await (db as any).seoAudit.create({
            data: {
              domain,
              clientId: domainConfig?.clientId || undefined,
              results: result.pages as any,
              summary: result.summary as any,
              score: result.summary.avgScore,
            },
          }).catch((err: any) => console.error('[SEO Dashboard] Failed to save audit:', err))
        }

        return NextResponse.json(result)
      }

      case 'competitors': {
        const domainConfig = await db.clientDomainConfig.findFirst({
          where: { domain: { contains: domain } },
        })
        const gscUrl = domainConfig?.gscSiteUrl || `sc-domain:${domain}`
        const to = new Date()
        const from = new Date(to)
        from.setDate(from.getDate() - 30)

        const topQueries = await getTopQueries(gscUrl, from.toISOString().split('T')[0]!, to.toISOString().split('T')[0]!, 20).catch(() => [])

        if (topQueries.length === 0) {
          return NextResponse.json({ error: 'No GSC keywords found for this domain' }, { status: 404 })
        }

        const result = await discoverCompetitors(domain, topQueries, 8)
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[SEO Dashboard] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
