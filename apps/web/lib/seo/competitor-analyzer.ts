/**
 * Competitor Analysis Engine
 * - Detects competitors from GSC SERP overlap
 * - Compares SEO metrics with competitors
 * - Identifies content gaps and opportunities
 */

import { analyzePage, type SeoPageAnalysis } from '@/lib/seo/page-analyzer'
import { getTopQueries, getTopPages } from '@/lib/integrations/gsc'

// ─── Types ───

export interface CompetitorDomain {
  domain: string
  source: 'manual' | 'serp_overlap' | 'gsc_suggestion'
  overlapScore?: number // 0-100, how much SERP overlap with our domain
  sharedQueries?: string[]
}

export interface CompetitorComparison {
  ourDomain: string
  competitor: string
  ourScore: number
  competitorScore: number
  scoreAdvantage: number // positive = we're better
  categories: {
    meta: { ours: number; theirs: number }
    content: { ours: number; theirs: number }
    technical: { ours: number; theirs: number }
    links: { ours: number; theirs: number }
  }
  insights: string[]
}

export interface ContentGap {
  query: string
  ourPosition: number | null
  competitorPosition: number
  competitorUrl: string
  opportunity: 'high' | 'medium' | 'low'
  suggestedAction: string
}

export interface CompetitorAnalysisResult {
  domain: string
  competitors: CompetitorDomain[]
  comparisons: CompetitorComparison[]
  contentGaps: ContentGap[]
  suggestions: ContentSuggestion[]
  summary: {
    avgOurScore: number
    avgCompetitorScore: number
    totalGaps: number
    highPriorityGaps: number
    topOpportunity: string | null
  }
}

export interface ContentSuggestion {
  type: 'new_content' | 'optimize_existing' | 'technical_fix' | 'link_building'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  targetKeywords: string[]
  estimatedImpact: string
}

// ─── SERP Overlap Detection ───

/**
 * Detect competitors by analyzing GSC queries and finding domains
 * that rank for the same queries.
 * This uses our own GSC data to infer overlap.
 */
export async function detectCompetitorsFromGSC(
  gscSiteUrl: string,
  dateFrom: string,
  dateTo: string,
): Promise<CompetitorDomain[]> {
  try {
    // Get our top queries
    const ourQueries = await getTopQueries(gscSiteUrl, dateFrom, dateTo, 50)

    // We can't directly query competitor data from GSC,
    // but we can extract domain from GSC pages and identify
    // query clusters that suggest competitor presence
    const queryKeywords = ourQueries.map(q => q.query)

    // Placeholder: In production, you'd use SERP API or DataForSEO
    // For now, return an empty array — competitors should be added manually
    console.log(`[Competitor] Detected ${queryKeywords.length} queries for overlap analysis`)

    return []
  } catch (err) {
    console.warn('[Competitor] GSC query failed:', err)
    return []
  }
}

// ─── Competitor Comparison ───

/**
 * Compare our homepage SEO score with a competitor's
 */
export async function compareWithCompetitor(
  ourDomain: string,
  competitorDomain: string,
): Promise<CompetitorComparison | null> {
  try {
    const [ourAnalysis, theirAnalysis] = await Promise.all([
      analyzePage(`https://${ourDomain}`),
      analyzePage(`https://${competitorDomain}`),
    ])

    const insights: string[] = []

    // Generate insights based on comparison
    if (theirAnalysis.overallScore > ourAnalysis.overallScore + 10) {
      insights.push(`${competitorDomain} are un scor SEO semnificativ mai bun (${theirAnalysis.overallScore} vs ${ourAnalysis.overallScore})`)
    }

    if (theirAnalysis.wordCount > ourAnalysis.wordCount * 1.5) {
      insights.push(`Competitorul are conținut mai substanțial (${theirAnalysis.wordCount} vs ${ourAnalysis.wordCount} cuvinte)`)
    }

    if (theirAnalysis.hasSchemaMarkup && !ourAnalysis.hasSchemaMarkup) {
      insights.push('Competitorul folosește Schema.org markup — ar trebui implementat și pe site-ul nostru')
    }

    if (theirAnalysis.internalLinks.count > ourAnalysis.internalLinks.count * 2) {
      insights.push(`Competitorul are mai multe link-uri interne (${theirAnalysis.internalLinks.count} vs ${ourAnalysis.internalLinks.count})`)
    }

    if (theirAnalysis.h2.count > ourAnalysis.h2.count) {
      insights.push(`Competitorul are structură de headings mai bună (${theirAnalysis.h2.count} H2 vs ${ourAnalysis.h2.count})`)
    }

    const comparison: CompetitorComparison = {
      ourDomain,
      competitor: competitorDomain,
      ourScore: ourAnalysis.overallScore,
      competitorScore: theirAnalysis.overallScore,
      scoreAdvantage: ourAnalysis.overallScore - theirAnalysis.overallScore,
      categories: {
        meta: { ours: ourAnalysis.scoreBreakdown.meta, theirs: theirAnalysis.scoreBreakdown.meta },
        content: { ours: ourAnalysis.scoreBreakdown.content, theirs: theirAnalysis.scoreBreakdown.content },
        technical: { ours: ourAnalysis.scoreBreakdown.technical, theirs: theirAnalysis.scoreBreakdown.technical },
        links: { ours: ourAnalysis.scoreBreakdown.links, theirs: theirAnalysis.scoreBreakdown.links },
      },
      insights,
    }

    return comparison
  } catch (err) {
    console.error(`[Competitor] Compare failed for ${competitorDomain}:`, err)
    return null
  }
}

// ─── Content Gap Analysis ───

/**
 * Identify content gaps by comparing our GSC queries with competitor pages
 */
export async function analyzeContentGaps(
  gscSiteUrl: string,
  dateFrom: string,
  dateTo: string,
  competitorDomains: string[],
): Promise<{ gaps: ContentGap[]; suggestions: ContentSuggestion[] }> {
  const gaps: ContentGap[] = []
  const suggestions: ContentSuggestion[] = []

  try {
    // Get our queries and their positions
    const ourQueries = await getTopQueries(gscSiteUrl, dateFrom, dateTo, 100)
    const ourPages = await getTopPages(gscSiteUrl, dateFrom, dateTo, 100)

    // Identify queries where we rank poorly (position > 10)
    const poorRanking = ourQueries.filter(q => q.position > 10 && q.impressions > 50)

    for (const query of poorRanking) {
      gaps.push({
        query: query.query,
        ourPosition: query.position,
        competitorPosition: 0, // Unknown without SERP API
        competitorUrl: '',
        opportunity: query.impressions > 200 ? 'high' : query.impressions > 50 ? 'medium' : 'low',
        suggestedAction: query.position > 20
          ? 'Creează conținut nou dedicat acestui termen'
          : 'Optimizează pagina existentă pentru acest termen',
      })
    }

    // Generate content suggestions based on our data
    // Group queries by intent clusters
    const intentClusters = clusterQueries(ourQueries.map(q => ({
      query: q.query,
      position: q.position,
      clicks: q.clicks,
      impressions: q.impressions,
    })))

    for (const cluster of intentClusters) {
      if (cluster.avgPosition > 15 && cluster.totalImpressions > 100) {
        suggestions.push({
          type: 'new_content',
          priority: cluster.totalImpressions > 500 ? 'high' : 'medium',
          title: `Creează conținut pentru: "${cluster.mainKeyword}"`,
          description: `Avem ${cluster.queries.length} query-uri pe acest topic cu poziție medie ${cluster.avgPosition.toFixed(0)}. Un articol dedicat ar putea îmbunătăți rankingul.`,
          targetKeywords: cluster.queries.slice(0, 5),
          estimatedImpact: `~${Math.round(cluster.totalImpressions * 0.1)} click-uri lunare potențiale`,
        })
      }
    }

    // Pages with high impressions but low CTR → need title/description optimization
    const lowCtrPages = ourPages.filter(p => p.impressions > 100 && p.ctr < 2)
    for (const page of lowCtrPages.slice(0, 5)) {
      suggestions.push({
        type: 'optimize_existing',
        priority: page.impressions > 500 ? 'high' : 'medium',
        title: `Optimizează title/description: ${new URL(page.page).pathname}`,
        description: `Pagina are ${page.impressions} impressions dar CTR de doar ${page.ctr.toFixed(1)}%. Rescrie titlul și meta description-ul pentru a atrage mai multe click-uri.`,
        targetKeywords: [],
        estimatedImpact: `CTR de 5% ar genera ~${Math.round(page.impressions * 0.05)} click-uri lunare`,
      })
    }

  } catch (err) {
    console.warn('[Competitor] Content gap analysis failed:', err)
  }

  return {
    gaps: gaps.sort((a, b) => {
      const prio = { high: 0, medium: 1, low: 2 }
      return (prio[a.opportunity] || 2) - (prio[b.opportunity] || 2)
    }),
    suggestions: suggestions.sort((a, b) => {
      const prio = { high: 0, medium: 1, low: 2 }
      return (prio[a.priority] || 2) - (prio[b.priority] || 2)
    }),
  }
}

// ─── Query Clustering ───

interface QueryCluster {
  mainKeyword: string
  queries: string[]
  avgPosition: number
  totalImpressions: number
  totalClicks: number
}

function clusterQueries(queries: Array<{ query: string; position: number; clicks: number; impressions: number }>): QueryCluster[] {
  const clusters: QueryCluster[] = []
  const used = new Set<number>()

  for (let i = 0; i < queries.length; i++) {
    if (used.has(i)) continue

    const firstQuery = queries[i]!
    const cluster: Array<{ query: string; position: number; clicks: number; impressions: number }> = [firstQuery]
    used.add(i)

    // Find related queries (share at least 2 words)
    const words = new Set(firstQuery.query.toLowerCase().split(/\s+/).filter(w => w.length > 3))

    for (let j = i + 1; j < queries.length; j++) {
      if (used.has(j)) continue
      const other = queries[j]!
      const otherWords = other.query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      const overlap = otherWords.filter(w => words.has(w)).length

      if (overlap >= 2 || (words.size <= 2 && overlap >= 1)) {
        cluster.push(other)
        used.add(j)
      }
    }

    if (cluster.length >= 2) {
      clusters.push({
        mainKeyword: cluster[0]!.query,
        queries: cluster.map(c => c.query),
        avgPosition: cluster.reduce((s, c) => s + c.position, 0) / cluster.length,
        totalImpressions: cluster.reduce((s, c) => s + c.impressions, 0),
        totalClicks: cluster.reduce((s, c) => s + c.clicks, 0),
      })
    }
  }

  return clusters.sort((a, b) => b.totalImpressions - a.totalImpressions)
}

// ─── Full Analysis ───

export async function runCompetitorAnalysis(
  domain: string,
  gscSiteUrl: string,
  competitors: string[],
  dateFrom: string,
  dateTo: string,
): Promise<CompetitorAnalysisResult> {
  // Run comparisons in parallel
  const comparisons = (await Promise.all(
    competitors.map(c => compareWithCompetitor(domain, c))
  )).filter((c): c is CompetitorComparison => c !== null)

  // Content gap analysis
  const { gaps, suggestions } = await analyzeContentGaps(gscSiteUrl, dateFrom, dateTo, competitors)

  const ourScores = comparisons.map(c => c.ourScore)
  const theirScores = comparisons.map(c => c.competitorScore)

  return {
    domain,
    competitors: competitors.map(d => ({ domain: d, source: 'manual' as const })),
    comparisons,
    contentGaps: gaps,
    suggestions,
    summary: {
      avgOurScore: ourScores.length > 0 ? Math.round(ourScores.reduce((a, b) => a + b, 0) / ourScores.length) : 0,
      avgCompetitorScore: theirScores.length > 0 ? Math.round(theirScores.reduce((a, b) => a + b, 0) / theirScores.length) : 0,
      totalGaps: gaps.length,
      highPriorityGaps: gaps.filter(g => g.opportunity === 'high').length,
      topOpportunity: suggestions[0]?.title || null,
    },
  }
}
