/**
 * SEO Recommendations Engine
 * Analyzes GSC pageKeywords data and generates actionable recommendations:
 * - Keyword cannibalization detection
 * - Low-hanging fruit (position 4-20 with high impressions)
 * - Strong pages identification
 * - Content gap suggestions
 * - Internal linking opportunities
 */

export interface PageKeywordEntry {
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SEORecommendation {
  type: 'cannibalization' | 'low_hanging_fruit' | 'content_gap' | 'strong_page' | 'internal_link' | 'title_optimization'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  pages?: string[]
  keywords?: string[]
  metrics?: Record<string, number | string>
}

export interface SEOAnalysisResult {
  recommendations: SEORecommendation[]
  summary: {
    totalPages: number
    totalKeywords: number
    avgPosition: number
    cannibalizationCount: number
    lowHangingFruitCount: number
    strongPages: number
    topKeywordsCovered: number
  }
  pageKeywordMap: Array<{
    page: string
    keywords: Array<{ query: string; clicks: number; impressions: number; position: number }>
    totalClicks: number
    totalImpressions: number
    avgPosition: number
    keywordCount: number
  }>
}

/**
 * Analyze page-keyword data and generate SEO recommendations
 */
export function analyzeSEOOpportunities(pageKeywords: PageKeywordEntry[]): SEOAnalysisResult {
  if (!pageKeywords || pageKeywords.length === 0) {
    return {
      recommendations: [],
      summary: { totalPages: 0, totalKeywords: 0, avgPosition: 0, cannibalizationCount: 0, lowHangingFruitCount: 0, strongPages: 0, topKeywordsCovered: 0 },
      pageKeywordMap: [],
    }
  }

  const recommendations: SEORecommendation[] = []

  // ── Build page → keywords map ──
  const byPage = new Map<string, PageKeywordEntry[]>()
  const byQuery = new Map<string, PageKeywordEntry[]>()

  for (const entry of pageKeywords) {
    const shortPage = entry.page.replace(/https?:\/\/[^/]+/, '')
    const key = shortPage || '/'

    if (!byPage.has(key)) byPage.set(key, [])
    byPage.get(key)!.push(entry)

    const q = entry.query.toLowerCase().trim()
    if (!byQuery.has(q)) byQuery.set(q, [])
    byQuery.get(q)!.push({ ...entry, page: key })
  }

  // ── 1. Keyword Cannibalization ──
  // Multiple pages ranking for the same keyword
  let cannibalizationCount = 0
  for (const [query, entries] of byQuery.entries()) {
    if (entries.length >= 2) {
      cannibalizationCount++
      const sorted = entries.sort((a, b) => a.position - b.position)
      const pages = sorted.map(e => e.page)

      // Only flag if both pages have meaningful impressions
      const totalImpressions = sorted.reduce((s, e) => s + e.impressions, 0)
      if (totalImpressions > 10 && sorted[0]) {
        recommendations.push({
          type: 'cannibalization',
          severity: sorted.length > 2 ? 'high' : 'medium',
          title: `Canibalizare: "${query}"`,
          description: `${sorted.length} pagini concurează pentru același keyword. Consolidează conținutul sau diferențiază intent-ul. Pagina principală: ${sorted[0].page} (poz. ${sorted[0].position.toFixed(1)})`,
          pages,
          keywords: [query],
          metrics: {
            pagesCount: sorted.length,
            bestPosition: +sorted[0].position.toFixed(1),
            totalImpressions,
          },
        })
      }
    }
  }

  // ── 2. Low-Hanging Fruit ──
  // Keywords on position 4-20 with high impressions → easy wins
  const lowHangingFruit: PageKeywordEntry[] = []
  for (const entry of pageKeywords) {
    if (entry.position >= 4 && entry.position <= 20 && entry.impressions >= 20) {
      lowHangingFruit.push(entry)
    }
  }

  // Sort by potential (impressions × distance from top 3)
  lowHangingFruit.sort((a, b) => {
    const scoreA = a.impressions * (1 / a.position)
    const scoreB = b.impressions * (1 / b.position)
    return scoreB - scoreA
  })

  let lowHangingFruitCount = 0
  for (const entry of lowHangingFruit.slice(0, 10)) {
    lowHangingFruitCount++
    const shortPage = entry.page.replace(/https?:\/\/[^/]+/, '') || '/'
    const potentialClicks = Math.round(entry.impressions * 0.25) // ~25% CTR at position 1

    recommendations.push({
      type: 'low_hanging_fruit',
      severity: entry.position <= 10 ? 'high' : 'medium',
      title: `Oportunitate: "${entry.query}" → poz. ${entry.position.toFixed(1)}`,
      description: `Pagina ${shortPage} are ${entry.impressions} impresii dar este pe poziția ${entry.position.toFixed(1)}. Optimizarea pentru top 3 ar putea aduce ~${potentialClicks} click-uri/lună.`,
      pages: [shortPage],
      keywords: [entry.query],
      metrics: {
        currentPosition: +entry.position.toFixed(1),
        impressions: entry.impressions,
        currentClicks: entry.clicks,
        potentialClicks,
        currentCTR: +(entry.ctr * 100).toFixed(2) + '%',
      },
    })
  }

  // ── 3. Strong Pages ──
  // Pages with many keywords and good positions
  const pageStats = [...byPage.entries()].map(([page, entries]) => {
    const totalClicks = entries.reduce((s, e) => s + e.clicks, 0)
    const totalImpressions = entries.reduce((s, e) => s + e.impressions, 0)
    const avgPosition = entries.reduce((s, e) => s + e.position, 0) / entries.length
    return { page, entries, totalClicks, totalImpressions, avgPosition, keywordCount: entries.length }
  }).sort((a, b) => b.totalClicks - a.totalClicks)

  let strongPageCount = 0
  for (const ps of pageStats.filter(p => p.keywordCount >= 3 && p.avgPosition <= 10)) {
    strongPageCount++
    if (strongPageCount <= 5) {
      recommendations.push({
        type: 'strong_page',
        severity: 'low',
        title: `💪 Pagină puternică: ${ps.page}`,
        description: `Rankează pe ${ps.keywordCount} keywords cu poziția medie ${ps.avgPosition.toFixed(1)}. Total: ${ps.totalClicks} clicks, ${ps.totalImpressions} impresii.`,
        pages: [ps.page],
        keywords: ps.entries.slice(0, 5).map(e => e.query),
        metrics: {
          keywords: ps.keywordCount,
          avgPosition: +ps.avgPosition.toFixed(1),
          clicks: ps.totalClicks,
          impressions: ps.totalImpressions,
        },
      })
    }
  }

  // ── 4. Title Optimization Opportunities ──
  // Pages where the main keyword has position > 5 but good impressions
  for (const ps of pageStats.slice(0, 15)) {
    if (ps.entries.length === 0) continue
    const sortedEntries = [...ps.entries].sort((a, b) => b.impressions - a.impressions)
    const mainKeyword = sortedEntries[0]
    if (!mainKeyword) continue
    if (mainKeyword.position > 5 && mainKeyword.impressions > 50) {
      recommendations.push({
        type: 'title_optimization',
        severity: 'medium',
        title: `Optimizare Title/H1: ${ps.page}`,
        description: `Keyword-ul principal "${mainKeyword.query}" (${mainKeyword.impressions} impresii) este pe poziția ${mainKeyword.position.toFixed(1)}. Verifică dacă apare în title tag, H1, și meta description.`,
        pages: [ps.page],
        keywords: [mainKeyword.query],
        metrics: {
          position: +mainKeyword.position.toFixed(1),
          impressions: mainKeyword.impressions,
        },
      })
    }
  }

  // ── 5. Internal Linking Opportunities ──
  // Find pages that could benefit from links to/from related pages
  const pagesByTopic = new Map<string, string[]>()
  for (const [page, entries] of byPage.entries()) {
    for (const entry of entries) {
      // Extract root topic words (2+ chars)
      const words = entry.query.split(/\s+/).filter(w => w.length >= 3)
      for (const word of words) {
        if (!pagesByTopic.has(word)) pagesByTopic.set(word, [])
        const existing = pagesByTopic.get(word)!
        if (!existing.includes(page)) existing.push(page)
      }
    }
  }

  // Find topic clusters with multiple pages
  const suggestedLinks = new Set<string>()
  for (const [topic, pages] of pagesByTopic.entries()) {
    if (pages.length >= 2 && pages.length <= 5) {
      const key = pages.sort().join('↔')
      if (!suggestedLinks.has(key) && suggestedLinks.size < 5) {
        suggestedLinks.add(key)
        recommendations.push({
          type: 'internal_link',
          severity: 'low',
          title: `Link intern: "${topic}" (${pages.length} pagini)`,
          description: `Paginile ${pages.join(', ')} au keywords comune pe tema "${topic}". Adaugă link-uri interne între ele pentru a distribui autoritatea.`,
          pages,
          keywords: [topic],
        })
      }
    }
  }

  // Sort recommendations by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // ── Build summary ──
  const allPositions = pageKeywords.map(e => e.position)
  const avgPosition = allPositions.length > 0
    ? allPositions.reduce((s, p) => s + p, 0) / allPositions.length
    : 0

  const uniqueQueries = new Set(pageKeywords.map(e => e.query.toLowerCase()))
  const topKeywords = pageKeywords.filter(e => e.position <= 3)

  // ── Build pageKeywordMap for display ──
  const pageKeywordMap = pageStats.map(ps => ({
    page: ps.page,
    keywords: ps.entries.sort((a, b) => b.clicks - a.clicks).map(e => ({
      query: e.query,
      clicks: e.clicks,
      impressions: e.impressions,
      position: +e.position.toFixed(1),
    })),
    totalClicks: ps.totalClicks,
    totalImpressions: ps.totalImpressions,
    avgPosition: +ps.avgPosition.toFixed(1),
    keywordCount: ps.keywordCount,
  }))

  return {
    recommendations: recommendations.slice(0, 20), // Cap at 20
    summary: {
      totalPages: byPage.size,
      totalKeywords: uniqueQueries.size,
      avgPosition: +avgPosition.toFixed(1),
      cannibalizationCount,
      lowHangingFruitCount,
      strongPages: strongPageCount,
      topKeywordsCovered: topKeywords.length,
    },
    pageKeywordMap,
  }
}
