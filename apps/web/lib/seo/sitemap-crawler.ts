/**
 * Sitemap Crawler
 * Discovers URLs from sitemap.xml, robots.txt, and GSC top pages.
 * Used to feed the SEO page analyzer with URLs to audit.
 */

import * as cheerio from 'cheerio'

// ─── Types ───

export interface DiscoveredUrl {
  url: string
  source: 'sitemap' | 'gsc' | 'manual'
  lastmod?: string
  priority?: number
  gscClicks?: number
  gscPosition?: number
}

// ─── Sitemap Parser ───

/**
 * Fetch and parse sitemap.xml or sitemap index
 * Returns list of page URLs discovered from sitemaps
 */
export async function parseSitemap(domain: string, maxUrls = 100): Promise<DiscoveredUrl[]> {
  const urls: DiscoveredUrl[] = []
  const sitemapUrls = [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/wp-sitemap.xml`,      // WordPress
    `https://${domain}/sitemap-0.xml`,        // Next.js
    `https://${domain}/server-sitemap.xml`,   // Next.js SSR
  ]

  // Try to find sitemap from robots.txt first
  try {
    const robotsRes = await fetch(`https://${domain}/robots.txt`, {
      headers: { 'User-Agent': 'ASNS-SEOBot/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (robotsRes.ok) {
      const robotsText = await robotsRes.text()
      const sitemapMatches = robotsText.match(/Sitemap:\s*(.+)/gi)
      if (sitemapMatches) {
        for (const match of sitemapMatches) {
          const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim()
          if (!sitemapUrls.includes(sitemapUrl)) {
            sitemapUrls.unshift(sitemapUrl) // prioritize robots.txt sitemaps
          }
        }
      }
    }
  } catch {
    // robots.txt not available
  }

  // Try each sitemap URL
  for (const sitemapUrl of sitemapUrls) {
    if (urls.length >= maxUrls) break

    try {
      const res = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'ASNS-SEOBot/1.0' },
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) continue

      const xml = await res.text()
      const $ = cheerio.load(xml, { xmlMode: true })

      // Check if it's a sitemap index
      const sitemapIndexUrls = $('sitemap > loc').map((_, el) => $(el).text().trim()).get()

      if (sitemapIndexUrls.length > 0) {
        // It's an index — parse child sitemaps
        for (const childUrl of sitemapIndexUrls.slice(0, 5)) {
          if (urls.length >= maxUrls) break

          try {
            const childRes = await fetch(childUrl, {
              headers: { 'User-Agent': 'ASNS-SEOBot/1.0' },
              signal: AbortSignal.timeout(10000),
            })

            if (!childRes.ok) continue

            const childXml = await childRes.text()
            const child$ = cheerio.load(childXml, { xmlMode: true })

            child$('url').each((_, el) => {
              if (urls.length >= maxUrls) return
              const loc = child$(el).find('loc').text().trim()
              const lastmod = child$(el).find('lastmod').text().trim() || undefined
              const priority = parseFloat(child$(el).find('priority').text().trim()) || undefined

              if (loc && !urls.some(u => u.url === loc)) {
                urls.push({ url: loc, source: 'sitemap', lastmod, priority })
              }
            })
          } catch {
            // child sitemap failed
          }
        }
      } else {
        // Regular sitemap
        $('url').each((_, el) => {
          if (urls.length >= maxUrls) return
          const loc = $(el).find('loc').text().trim()
          const lastmod = $(el).find('lastmod').text().trim() || undefined
          const priority = parseFloat($(el).find('priority').text().trim()) || undefined

          if (loc && !urls.some(u => u.url === loc)) {
            urls.push({ url: loc, source: 'sitemap', lastmod, priority })
          }
        })
      }

      if (urls.length > 0) break // Found URLs, no need to try other sitemap paths
    } catch {
      // This sitemap URL failed, try next
    }
  }

  return urls
}

// ─── URL Discovery (Sitemap + GSC) ───

/**
 * Discover URLs for a domain by combining:
 * 1. Sitemap.xml pages
 * 2. GSC top pages (if provided)
 * 3. Homepage (always included)
 */
export function mergeUrlSources(
  sitemapUrls: DiscoveredUrl[],
  gscPages?: Array<{ page: string; clicks: number; position: number }>,
  maxTotal = 100,
): DiscoveredUrl[] {
  const seen = new Set<string>()
  const merged: DiscoveredUrl[] = []

  // Always include homepage variants
  const domain = sitemapUrls[0]?.url ? new URL(sitemapUrls[0].url).hostname : ''
  if (domain) {
    const homepage = `https://${domain}/`
    if (!seen.has(homepage)) {
      merged.push({ url: homepage, source: 'sitemap' })
      seen.add(homepage)
    }
  }

  // Add GSC pages first (they have real traffic data)
  if (gscPages) {
    for (const gp of gscPages) {
      if (merged.length >= maxTotal) break
      if (!seen.has(gp.page)) {
        merged.push({
          url: gp.page,
          source: 'gsc',
          gscClicks: gp.clicks,
          gscPosition: gp.position,
        })
        seen.add(gp.page)
      }
    }
  }

  // Fill remaining with sitemap URLs (prioritized by sitemap priority)
  const sortedSitemap = [...sitemapUrls].sort((a, b) => (b.priority || 0.5) - (a.priority || 0.5))
  for (const su of sortedSitemap) {
    if (merged.length >= maxTotal) break
    if (!seen.has(su.url)) {
      merged.push(su)
      seen.add(su.url)
    }
  }

  return merged
}
