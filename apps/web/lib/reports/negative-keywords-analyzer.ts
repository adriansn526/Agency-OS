/**
 * Negative Keywords Analyzer
 * Analyzes search terms from Google Ads, classifies them by relevance,
 * and generates suggestions for negative keywords.
 * Sends Telegram notifications when irrelevant high-spend terms are detected.
 */

import { getSearchTermsExtended, getExistingNegatives, addNegativeKeywords } from '@/lib/integrations/google-ads'
import { sendTelegramNotification } from '@/lib/notifications/telegram'

// ─── Types ───

export interface ClassifiedTerm {
  term: string
  status: 'ADDED' | 'EXCLUDED' | 'NONE' | string
  campaignName: string
  campaignId: string
  adGroupName: string
  clicks: number
  impressions: number
  cost: number
  conversions: number
  conversionsValue: number
  ctr: number
  cpc: number
  conversionRate: number
  // Classification
  classification: 'irrelevant' | 'suspect' | 'relevant' | 'excluded'
  reason: string
  score: number // 0 = totally irrelevant, 100 = highly relevant
}

export interface NegativeKeywordSuggestion {
  term: string
  matchType: 'BROAD' | 'PHRASE' | 'EXACT'
  reason: string
  campaignId: string
  campaignName: string
  wastedSpend: number
  priority: 'high' | 'medium' | 'low'
}

export interface NegativeKeywordsAnalysis {
  totalTerms: number
  analyzed: ClassifiedTerm[]
  suggestions: NegativeKeywordSuggestion[]
  existingNegatives: Array<{ keyword: string; matchType: string; level: string }>
  summary: {
    irrelevant: number
    suspect: number
    relevant: number
    excluded: number
    totalWastedSpend: number
  }
}

// ─── Business Context Keywords ───

/**
 * Extract business-relevant keywords from campaign names and ad group names
 * These help determine if a search term is relevant to the business
 */
function extractBusinessKeywords(
  terms: Array<{ campaignName: string; adGroupName: string }>
): Set<string> {
  const keywords = new Set<string>()
  const stopWords = new Set(['campaign', 'campanie', 'search', 'display', 'pmax', 'performance', 'max', 'brand', 'generic', 'google', 'ads', '-', '—', '|'])

  for (const t of terms) {
    const words = `${t.campaignName} ${t.adGroupName}`.toLowerCase().split(/[\s\-—|_]+/)
    for (const w of words) {
      if (w.length > 2 && !stopWords.has(w)) {
        keywords.add(w)
      }
    }
  }

  return keywords
}

// ─── Classification Engine ───

export function classifySearchTerms(
  terms: Array<ReturnType<typeof getSearchTermsExtended> extends Promise<infer T> ? T extends Array<infer U> ? U : never : never>,
  businessKeywords: Set<string>,
  businessDomain?: string
): ClassifiedTerm[] {
  return terms.map(term => {
    // Already excluded
    if (term.status === 'EXCLUDED') {
      return {
        ...term,
        classification: 'excluded' as const,
        reason: 'Deja exclus',
        score: 0,
      }
    }

    const termLower = term.term.toLowerCase()
    const termWords = termLower.split(/\s+/)

    // Check relevance signals
    let score = 50 // neutral start
    const reasons: string[] = []

    // +points for business keyword match
    let businessMatch = 0
    for (const w of termWords) {
      if (businessKeywords.has(w)) {
        businessMatch++
        score += 15
      }
    }

    // +points for conversions
    if (term.conversions > 0) {
      score += 30
      reasons.push(`${term.conversions} conversii`)
    }

    // +points for domain match
    if (businessDomain && termLower.includes(businessDomain.replace(/\.\w+$/, ''))) {
      score += 20
      reasons.push('Conține numele brandului')
    }

    // -points for high cost + 0 conversions
    if (term.cost > 5 && term.conversions === 0) {
      score -= 20
      reasons.push(`€${term.cost.toFixed(2)} cheltuit fără conversii`)
    }

    // -points for very low CTR (suggests poor match)
    if (term.impressions > 50 && term.ctr < 1) {
      score -= 10
      reasons.push(`CTR foarte scăzut (${term.ctr}%)`)
    }

    // -points for no business keyword match
    if (businessMatch === 0) {
      score -= 25
      reasons.push('Nicio potrivire cu keywords de business')
    }

    // -points for informational intent markers
    const infoMarkers = ['ce este', 'cum', 'how', 'what', 'why', 'de ce', 'tutorial', 'gratis', 'free', 'forum', 'blog', 'wikipedia', 'pdf', 'download']
    for (const marker of infoMarkers) {
      if (termLower.includes(marker)) {
        score -= 15
        reasons.push(`Intent informațional ("${marker}")`)
        break
      }
    }

    // -points for competitor/unrelated markers
    const unrelatedMarkers = ['youtube', 'facebook', 'instagram', 'tiktok', 'reddit', 'olx', 'emag']
    for (const marker of unrelatedMarkers) {
      if (termLower.includes(marker)) {
        score -= 30
        reasons.push(`Platformă/competitor irelevant ("${marker}")`)
        break
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score))

    // Classify
    let classification: 'irrelevant' | 'suspect' | 'relevant'
    if (score < 25) {
      classification = 'irrelevant'
    } else if (score < 50) {
      classification = 'suspect'
    } else {
      classification = 'relevant'
    }

    return {
      ...term,
      classification,
      reason: reasons.join('; ') || (classification === 'relevant' ? 'Relevant pentru business' : 'Scor scăzut'),
      score,
    }
  })
}

// ─── Main Analyzer ───

export async function analyzeNegativeKeywords(
  customerId: string,
  dateFrom: string,
  dateTo: string,
  campaignIds?: string[],
  businessDomain?: string,
  clientName?: string,
): Promise<NegativeKeywordsAnalysis> {
  // Fetch data in parallel
  const [searchTerms, existingNegs] = await Promise.all([
    getSearchTermsExtended(customerId, dateFrom, dateTo, campaignIds, 100),
    getExistingNegatives(customerId, campaignIds?.[0]).catch(() => []),
  ])

  // Extract business context from campaign/ad group names
  const businessKeywords = extractBusinessKeywords(searchTerms)

  // Add domain-based keywords
  if (businessDomain) {
    const domainParts = businessDomain.replace(/\.\w+$/, '').split(/[-_.]/)
    for (const part of domainParts) {
      if (part.length > 2) businessKeywords.add(part.toLowerCase())
    }
  }

  // Classify terms
  const classified = classifySearchTerms(searchTerms, businessKeywords, businessDomain)

  // Generate suggestions
  const suggestions: NegativeKeywordSuggestion[] = classified
    .filter(t => t.classification === 'irrelevant' && t.status !== 'EXCLUDED')
    .map(t => ({
      term: t.term,
      matchType: t.impressions > 100 ? 'BROAD' as const : 'PHRASE' as const,
      reason: t.reason,
      campaignId: t.campaignId,
      campaignName: t.campaignName,
      wastedSpend: t.cost,
      priority: t.cost > 10 ? 'high' as const : t.cost > 3 ? 'medium' as const : 'low' as const,
    }))
    .sort((a, b) => b.wastedSpend - a.wastedSpend)

  const summary = {
    irrelevant: classified.filter(t => t.classification === 'irrelevant').length,
    suspect: classified.filter(t => t.classification === 'suspect').length,
    relevant: classified.filter(t => t.classification === 'relevant').length,
    excluded: classified.filter(t => t.classification === 'excluded').length,
    totalWastedSpend: suggestions.reduce((sum, s) => sum + s.wastedSpend, 0),
  }

  // Send Telegram notification if high-priority issues found
  const highPriority = suggestions.filter(s => s.priority === 'high')
  if (highPriority.length > 0) {
    const domain = businessDomain || 'N/A'
    await sendTelegramNotification({
      title: `Termeni irelevanți detectați`,
      emoji: '🚨',
      sections: [
        { label: '🏢 Client', value: clientName || customerId },
        { label: '🌐 Domeniu', value: domain },
        { label: '❌ Irelevanți', value: `${summary.irrelevant} termeni (€${summary.totalWastedSpend.toFixed(2)} pierdut)` },
        { label: '🔴 Prioritate mare', value: highPriority.slice(0, 5).map(s => `"${s.term}" (€${s.wastedSpend.toFixed(2)})`).join(', ') },
      ],
      footer: '💡 Verifică și adaugă ca termeni negativi în raportul admin.',
    })
  }

  return {
    totalTerms: searchTerms.length,
    analyzed: classified.sort((a, b) => a.score - b.score), // worst first
    suggestions,
    existingNegatives: existingNegs,
    summary,
  }
}

// ─── Apply Suggestions (with confirmation) ───

export async function applyNegativeKeywords(
  customerId: string,
  campaignId: string,
  keywords: string[],
  matchType: 'BROAD' | 'PHRASE' | 'EXACT' = 'BROAD',
  clientName?: string,
  domain?: string,
): Promise<{ success: boolean; added: number; errors: string[] }> {
  const result = await addNegativeKeywords(customerId, campaignId, keywords, matchType)

  // Notify via Telegram
  if (result.added > 0) {
    await sendTelegramNotification({
      title: 'Termeni negativi adăugați',
      emoji: '✅',
      sections: [
        { label: '🏢 Client', value: clientName || customerId },
        { label: '🌐 Domeniu', value: domain || 'N/A' },
        { label: '📝 Termeni', value: `${result.added} adăugați (${matchType})` },
        { label: '📋 Lista', value: keywords.slice(0, 10).map(k => `"${k}"`).join(', ') + (keywords.length > 10 ? ` +${keywords.length - 10} altele` : '') },
      ],
    })
  }

  return {
    success: result.errors.length === 0,
    added: result.added,
    errors: result.errors,
  }
}
