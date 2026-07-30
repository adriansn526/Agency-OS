/**
 * Self-Hosted SERP Competitor Discovery
 * Detects competitor domains by analyzing Google search results
 * for the site's top GSC keywords.
 * 
 * No paid API required — uses direct fetch + HTML parsing.
 * Rate limited to avoid blocks.
 */

import * as cheerio from 'cheerio'

export interface SerpCompetitor {
  domain: string
  occurrences: number       // How many of our keywords they rank for
  keywords: string[]        // Which keywords they compete on
  estimatedPositions: number[] // Their positions for those keywords
  avgPosition: number
  threat: 'high' | 'medium' | 'low'
}

export interface SerpDiscoveryResult {
  ourDomain: string
  competitors: SerpCompetitor[]
  keywordsAnalyzed: number
  timestamp: string
  source: 'google_serp' | 'manual'
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Fetch Google SERP for a single keyword and extract ranked domains
 */
async function fetchSerpResults(
  keyword: string,
  lang: string = 'ro',
  country: string = 'ro',
): Promise<Array<{ domain: string; position: number; url: string }>> {
  const results: Array<{ domain: string; position: number; url: string }> = []

  try {
    const query = encodeURIComponent(keyword)
    const url = `https://www.google.com/search?q=${query}&hl=${lang}&gl=${country}&num=20`
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': ua!,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': `${lang}-${country.toUpperCase()},${lang};q=0.9,en;q=0.8`,
        'Cache-Control': 'no-cache',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) return results

    const html = await res.text()
    const $ = cheerio.load(html)

    // Parse organic results
    let position = 0
    $('div.g, div[data-sokoban-container]').each((_, el) => {
      const link = $(el).find('a[href^="http"]').first()
      const href = link.attr('href') || ''
      if (!href || href.includes('google.com')) return

      position++
      const domain = extractDomain(href)
      results.push({ domain, position, url: href })
    })

    // Fallback: parse all links with cite elements (more reliable)
    if (results.length < 3) {
      position = 0
      $('cite').each((_, el) => {
        const text = $(el).text().trim()
        if (!text) return
        position++
        try {
          // cite might contain just domain or full URL
          const domain = text.includes('://') ? extractDomain(text) : text.split(' ')[0]?.replace(/^›.*/, '').trim() || ''
          if (domain && !domain.includes('google')) {
            results.push({ domain: domain.replace(/^www\./, ''), position, url: text })
          }
        } catch { /* skip */ }
      })
    }
  } catch (err) {
    console.error(`[SERP] Error fetching results for "${keyword}":`, err)
  }

  return results
}

/**
 * Discover competitors for a domain based on its top GSC keywords
 */
export async function discoverCompetitors(
  ourDomain: string,
  keywords: Array<{ query: string; impressions: number; clicks: number; position: number }>,
  maxKeywords: number = 10,
): Promise<SerpDiscoveryResult> {
  const normalizedOurDomain = ourDomain.replace(/^www\./, '').toLowerCase()

  // Select top keywords by impressions (most visibility)
  const topKeywords = [...keywords]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, maxKeywords)

  const competitorMap = new Map<string, {
    occurrences: number
    keywords: string[]
    positions: number[]
  }>()

  // Fetch SERP for each keyword with delays
  for (let i = 0; i < topKeywords.length; i++) {
    const kw = topKeywords[i]!
    const serpResults = await fetchSerpResults(kw.query)

    for (const result of serpResults) {
      const domain = result.domain.toLowerCase().replace(/^www\./, '')

      // Skip our own domain and common non-competitor domains
      if (domain === normalizedOurDomain) continue
      if (/google\.|youtube\.|facebook\.|wikipedia\.|instagram\.|tiktok\.|pinterest\.|linkedin\./i.test(domain)) continue

      const existing = competitorMap.get(domain) || { occurrences: 0, keywords: [], positions: [] }
      existing.occurrences++
      if (!existing.keywords.includes(kw.query)) {
        existing.keywords.push(kw.query)
      }
      existing.positions.push(result.position)
      competitorMap.set(domain, existing)
    }

    // Delay between requests to avoid rate limiting (1-3 seconds)
    if (i < topKeywords.length - 1) {
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500))
    }
  }

  // Convert to sorted array
  const competitors: SerpCompetitor[] = [...competitorMap.entries()]
    .map(([domain, data]) => ({
      domain,
      occurrences: data.occurrences,
      keywords: data.keywords,
      estimatedPositions: data.positions,
      avgPosition: data.positions.length > 0
        ? +(data.positions.reduce((s, p) => s + p, 0) / data.positions.length).toFixed(1)
        : 99,
      threat: data.keywords.length >= 5 ? 'high' as const
        : data.keywords.length >= 3 ? 'medium' as const
        : 'low' as const,
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 15) // Top 15 competitors

  return {
    ourDomain: normalizedOurDomain,
    competitors,
    keywordsAnalyzed: topKeywords.length,
    timestamp: new Date().toISOString(),
    source: 'google_serp',
  }
}
