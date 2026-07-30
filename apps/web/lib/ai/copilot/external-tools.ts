// ─── AI Copilot — External Integration Tools (Phase 3) ───
// Wraps existing lib/integrations/* into Copilot tool executors.
// Each function returns compressed JSON optimized for LLM context.
// All tools are READ-only — no write operations on external APIs.

import { getAccountMetrics, getCampaigns, getSearchTerms, getKeywordPerformance, getImpressionShare } from '@/lib/integrations/google-ads'
import { getHealthMetrics, getWebVitals, getTrafficBySource, getTopPages as phGetTopPages } from '@/lib/integrations/posthog'
import { getSiteMetrics, getTopQueries, getTopPages as gscGetTopPages } from '@/lib/integrations/gsc'
import { analyzeNegativeKeywords, applyNegativeKeywords } from '@/lib/reports/negative-keywords-analyzer'
import { analyzePage } from '@/lib/seo/page-analyzer'
import { db } from '@repo/db'

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function defaultDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const dateTo = now.toISOString().slice(0, 10)
  const from = new Date(now)
  from.setDate(from.getDate() - 30)
  const dateFrom = from.toISOString().slice(0, 10)
  return { dateFrom, dateTo }
}

/**
 * Resolve a client's external integration IDs from DB
 */
async function resolveClientIntegrations(clientIdOrName: string) {
  // Try by ID first
  let client = await db.client.findUnique({
    where: { id: clientIdOrName },
    select: { id: true, companyName: true, googleAdsCustomerId: true, gscSiteUrl: true, ga4PropertyId: true, websites: true, website: true },
  })

  // Try by name search
  if (!client) {
    client = await db.client.findFirst({
      where: { companyName: { contains: clientIdOrName, mode: 'insensitive' } },
      select: { id: true, companyName: true, googleAdsCustomerId: true, gscSiteUrl: true, ga4PropertyId: true, websites: true, website: true },
    })
  }

  return client
}

// ────────────────────────────────────────────
// Google Ads Tools
// ────────────────────────────────────────────

export async function googleAdsGetMetrics(customerId: string, dateFrom?: string, dateTo?: string) {
  if (!customerId) return { error: 'Lipsește Google Ads Customer ID. Verifică dacă clientul are configurat googleAdsCustomerId.' }

  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const metrics = await getAccountMetrics(customerId, range.dateFrom, range.dateTo)
    return {
      period: `${range.dateFrom} → ${range.dateTo}`,
      ...metrics,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Eroare necunoscută'
    if (msg.includes('credentials') || msg.includes('Missing')) {
      return { error: 'Google Ads API nu este configurat. Setează GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN în .env.local' }
    }
    return { error: `Eroare Google Ads: ${msg}` }
  }
}

export async function googleAdsGetCampaigns(customerId: string, dateFrom?: string, dateTo?: string) {
  if (!customerId) return { error: 'Lipsește Google Ads Customer ID.' }

  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const campaigns = await getCampaigns(customerId, range.dateFrom, range.dateTo)
    return {
      period: `${range.dateFrom} → ${range.dateTo}`,
      totalCampaigns: campaigns.length,
      campaigns: campaigns.slice(0, 10).map((c) => ({
        name: c.name,
        status: c.status,
        budget: c.budget,
        ...c.metrics,
      })),
    }
  } catch (err) {
    return { error: `Eroare Google Ads Campaigns: ${err instanceof Error ? err.message : 'Eroare'}` }
  }
}

export async function googleAdsGetSearchTerms(customerId: string, dateFrom?: string, dateTo?: string) {
  if (!customerId) return { error: 'Lipsește Google Ads Customer ID.' }

  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const terms = await getSearchTerms(customerId, range.dateFrom, range.dateTo, undefined, 15)
    return {
      period: `${range.dateFrom} → ${range.dateTo}`,
      totalTerms: terms.length,
      terms,
    }
  } catch (err) {
    return { error: `Eroare Google Ads Search Terms: ${err instanceof Error ? err.message : 'Eroare'}` }
  }
}

// ────────────────────────────────────────────
// PostHog Tools
// ────────────────────────────────────────────

function getPostHogProjectId(): string | null {
  return process.env.POSTHOG_PROJECT_ID || null
}

export async function posthogGetHealth(dateFrom?: string, dateTo?: string) {
  const projectId = getPostHogProjectId()
  if (!projectId) return { error: 'PostHog nu este configurat. Setează POSTHOG_PROJECT_ID în .env.local' }

  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const health = await getHealthMetrics(projectId, range.dateFrom, range.dateTo)
    return {
      period: `${range.dateFrom} → ${range.dateTo}`,
      ...health,
    }
  } catch (err) {
    return { error: `Eroare PostHog Health: ${err instanceof Error ? err.message : 'Eroare'}` }
  }
}

export async function posthogGetWebVitals(dateFrom?: string, dateTo?: string) {
  const projectId = getPostHogProjectId()
  if (!projectId) return { error: 'PostHog nu este configurat.' }

  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const vitals = await getWebVitals(projectId, range.dateFrom, range.dateTo)
    if (!vitals) return { message: 'Nu există date Web Vitals pentru această perioadă.' }
    return {
      period: `${range.dateFrom} → ${range.dateTo}`,
      ...vitals,
    }
  } catch (err) {
    return { error: `Eroare PostHog Web Vitals: ${err instanceof Error ? err.message : 'Eroare'}` }
  }
}

export async function posthogGetTraffic(dateFrom?: string, dateTo?: string) {
  const projectId = getPostHogProjectId()
  if (!projectId) return { error: 'PostHog nu este configurat.' }

  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const [traffic, topPages] = await Promise.all([
      getTrafficBySource(projectId, range.dateFrom, range.dateTo),
      phGetTopPages(projectId, range.dateFrom, range.dateTo),
    ])
    return {
      period: `${range.dateFrom} → ${range.dateTo}`,
      trafficSources: traffic,
      topPages,
    }
  } catch (err) {
    return { error: `Eroare PostHog Traffic: ${err instanceof Error ? err.message : 'Eroare'}` }
  }
}

// ────────────────────────────────────────────
// Google Search Console Tools
// ────────────────────────────────────────────

export async function gscGetMetrics(siteUrl: string, dateFrom?: string, dateTo?: string) {
  if (!siteUrl) return { error: 'Lipsește Site URL GSC. Verifică dacă clientul are configurat gscSiteUrl.' }

  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const metrics = await getSiteMetrics(siteUrl, range.dateFrom, range.dateTo)
    return {
      siteUrl,
      period: `${range.dateFrom} → ${range.dateTo}`,
      clicks: metrics.clicks,
      impressions: metrics.impressions,
      ctr: +(metrics.ctr * 100).toFixed(2),
      avgPosition: +metrics.position.toFixed(1),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Eroare'
    if (msg.includes('credentials') || msg.includes('GSC_')) {
      return { error: 'Google Search Console nu este configurat. Setează GSC_CLIENT_EMAIL și GSC_PRIVATE_KEY în .env.local' }
    }
    return { error: `Eroare GSC: ${msg}` }
  }
}

export async function gscGetTopQueries(siteUrl: string, dateFrom?: string, dateTo?: string) {
  if (!siteUrl) return { error: 'Lipsește Site URL GSC.' }

  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const queries = await getTopQueries(siteUrl, range.dateFrom, range.dateTo, 15)
    return {
      siteUrl,
      period: `${range.dateFrom} → ${range.dateTo}`,
      totalQueries: queries.length,
      queries: queries.map((q) => ({
        ...q,
        ctr: +(q.ctr * 100).toFixed(2),
        position: +q.position.toFixed(1),
      })),
    }
  } catch (err) {
    return { error: `Eroare GSC Top Queries: ${err instanceof Error ? err.message : 'Eroare'}` }
  }
}

export async function gscGetTopPagesFn(siteUrl: string, dateFrom?: string, dateTo?: string) {
  if (!siteUrl) return { error: 'Lipsește Site URL GSC.' }

  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const pages = await gscGetTopPages(siteUrl, range.dateFrom, range.dateTo, 15)
    return {
      siteUrl,
      period: `${range.dateFrom} → ${range.dateTo}`,
      totalPages: pages.length,
      pages: pages.map((p) => ({
        ...p,
        ctr: +(p.ctr * 100).toFixed(2),
        position: +p.position.toFixed(1),
      })),
    }
  } catch (err) {
    return { error: `Eroare GSC Top Pages: ${err instanceof Error ? err.message : 'Eroare'}` }
  }
}

// ────────────────────────────────────────────
// Cross-Source Client Report
// ────────────────────────────────────────────

export async function generateClientReport(clientIdOrName: string) {
  const client = await resolveClientIntegrations(clientIdOrName)
  if (!client) {
    return { error: `Clientul "${clientIdOrName}" nu a fost găsit în baza de date.` }
  }

  const range = defaultDateRange()
  const report: Record<string, unknown> = {
    client: client.companyName,
    clientId: client.id,
    period: `${range.dateFrom} → ${range.dateTo}`,
    integrations: {
      googleAds: !!client.googleAdsCustomerId,
      gsc: !!client.gscSiteUrl,
      posthog: !!getPostHogProjectId(),
    },
    sections: {} as Record<string, unknown>,
  }

  const sections = report.sections as Record<string, unknown>

  // Google Ads
  if (client.googleAdsCustomerId) {
    try {
      const [metrics, campaigns] = await Promise.all([
        getAccountMetrics(client.googleAdsCustomerId, range.dateFrom, range.dateTo),
        getCampaigns(client.googleAdsCustomerId, range.dateFrom, range.dateTo),
      ])
      sections.googleAds = {
        summary: metrics,
        topCampaigns: campaigns.slice(0, 5).map((c) => ({ name: c.name, status: c.status, ...c.metrics })),
      }
    } catch (err) {
      sections.googleAds = { error: err instanceof Error ? err.message : 'Eroare API' }
    }
  }

  // GSC / SEO
  if (client.gscSiteUrl) {
    try {
      const [metrics, queries, pages] = await Promise.all([
        getSiteMetrics(client.gscSiteUrl, range.dateFrom, range.dateTo),
        getTopQueries(client.gscSiteUrl, range.dateFrom, range.dateTo, 10),
        gscGetTopPages(client.gscSiteUrl, range.dateFrom, range.dateTo, 10),
      ])
      sections.seo = {
        summary: { ...metrics, ctr: +(metrics.ctr * 100).toFixed(2), position: +metrics.position.toFixed(1) },
        topKeywords: queries.slice(0, 5).map((q) => ({ query: q.query, clicks: q.clicks, impressions: q.impressions, position: +q.position.toFixed(1) })),
        topPages: pages.slice(0, 5).map((p) => ({ page: p.page, clicks: p.clicks, position: +p.position.toFixed(1) })),
      }
    } catch (err) {
      sections.seo = { error: err instanceof Error ? err.message : 'Eroare API' }
    }
  }

  // PostHog (analytics / UX)
  const phProjectId = getPostHogProjectId()
  if (phProjectId) {
    try {
      const [health, vitals, traffic] = await Promise.all([
        getHealthMetrics(phProjectId, range.dateFrom, range.dateTo).catch(() => null),
        getWebVitals(phProjectId, range.dateFrom, range.dateTo).catch(() => null),
        getTrafficBySource(phProjectId, range.dateFrom, range.dateTo).catch(() => []),
      ])
      sections.analytics = {
        health: health ? { healthScore: health.healthScore, exceptions: health.exceptions, rageClicks: health.rageClicks } : null,
        webVitals: vitals,
        trafficSources: traffic.slice(0, 5),
      }
    } catch (err) {
      sections.analytics = { error: err instanceof Error ? err.message : 'Eroare API' }
    }
  }

  // Internal data from DB
  const [projectCount, offerCount, invoiceData] = await Promise.all([
    db.project.count({ where: { clientId: client.id } }),
    db.offer.count({ where: { clientId: client.id } }),
    db.invoice.aggregate({ where: { clientId: client.id, direction: 'emisa', status: 'platita' }, _sum: { amount: true }, _count: { id: true } }),
  ])

  sections.internal = {
    projects: projectCount,
    offers: offerCount,
    paidInvoices: invoiceData._count.id,
    totalRevenue: Math.round((invoiceData._sum.amount || 0) * 100) / 100,
  }

  return report
}

// ────────────────────────────────────────────
// Tool Definition Exports (for tools.ts)
// ────────────────────────────────────────────

export const externalToolDefinitions = [
  {
    name: 'google_ads_get_metrics',
    description: 'Obține KPI-urile unui cont Google Ads: impressions, clicks, spend, conversions, ROAS. Necesită Customer ID din clientul asociat.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Google Ads Customer ID (din client.googleAdsCustomerId). Obține-l cu search_entity sau get_clients.' },
        date_from: { type: 'string', description: 'Data start (YYYY-MM-DD). Default: acum 30 zile.' },
        date_to: { type: 'string', description: 'Data sfârșit (YYYY-MM-DD). Default: azi.' },
      },
    },
  },
  {
    name: 'google_ads_get_campaigns',
    description: 'Obține lista de campanii Google Ads cu performanță (clicks, spend, conversions, ROAS per campanie).',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Google Ads Customer ID' },
        date_from: { type: 'string', description: 'Data start (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Data sfârșit (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'google_ads_get_search_terms',
    description: 'Obține top search terms Google Ads cu clicks, impressions, cost, conversions. Util pentru a identifica termeni ineficienți.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Google Ads Customer ID' },
        date_from: { type: 'string', description: 'Data start (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Data sfârșit (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'posthog_get_health',
    description: 'Obține health metrics de la PostHog: JS exceptions, rage clicks, dead clicks, health score (0-100). Util pentru monitorizare UX.',
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Data start (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Data sfârșit (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'posthog_get_web_vitals',
    description: 'Obține Core Web Vitals de la PostHog: LCP, CLS, INP, FCP cu statusuri (good/needs-improvement/poor).',
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Data start (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Data sfârșit (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'posthog_get_traffic',
    description: 'Obține breakdown trafic per sursă UTM + top pagini vizitate de la PostHog.',
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Data start (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Data sfârșit (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'gsc_get_metrics',
    description: 'Obține KPI-urile Google Search Console: clicks, impressions, CTR, average position. Necesită siteUrl din client.',
    parameters: {
      type: 'object',
      properties: {
        site_url: { type: 'string', description: 'GSC site URL (din client.gscSiteUrl, ex: "sc-domain:example.ro"). Obține-l cu search_entity.' },
        date_from: { type: 'string', description: 'Data start (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Data sfârșit (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'gsc_get_top_queries',
    description: 'Obține top keywords (queries) din Google Search Console cu clicks, impressions, CTR, position.',
    parameters: {
      type: 'object',
      properties: {
        site_url: { type: 'string', description: 'GSC site URL' },
        date_from: { type: 'string', description: 'Data start (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Data sfârșit (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'gsc_get_top_pages',
    description: 'Obține top pagini din Google Search Console cu clicks, impressions, CTR, position.',
    parameters: {
      type: 'object',
      properties: {
        site_url: { type: 'string', description: 'GSC site URL' },
        date_from: { type: 'string', description: 'Data start (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Data sfârșit (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'generate_client_report',
    description: 'Generează un raport complet cross-sursă pentru un client: Google Ads + SEO/GSC + PostHog analytics + date interne (proiecte, facturi). Caută automat toate integrările disponibile ale clientului.',
    parameters: {
      type: 'object',
      properties: {
        client: { type: 'string', description: 'Numele sau ID-ul clientului. Ex: "SwissAmanet" sau un client ID.' },
      },
    },
  },
]

/**
 * Execute an external tool by name
 */
export async function executeExternalTool(name: string, args: Record<string, unknown>): Promise<string | null> {
  try {
    switch (name) {
      case 'google_ads_get_metrics':
        return JSON.stringify(await googleAdsGetMetrics(args.customer_id as string, args.date_from as string, args.date_to as string))
      case 'google_ads_get_campaigns':
        return JSON.stringify(await googleAdsGetCampaigns(args.customer_id as string, args.date_from as string, args.date_to as string))
      case 'google_ads_get_search_terms':
        return JSON.stringify(await googleAdsGetSearchTerms(args.customer_id as string, args.date_from as string, args.date_to as string))
      case 'google_ads_keyword_performance':
        return JSON.stringify(await googleAdsKeywordPerformance(args.customer_id as string, args.date_from as string, args.date_to as string))
      case 'google_ads_impression_share':
        return JSON.stringify(await googleAdsImpressionShareTool(args.customer_id as string, args.date_from as string, args.date_to as string))
      case 'analyze_negative_keywords':
        return JSON.stringify(await analyzeNegativeKeywordsTool(args.customer_id as string, args.date_from as string, args.date_to as string, args.domain as string, args.client_name as string))
      case 'apply_negative_keywords':
        return JSON.stringify(await applyNegativeKeywordsTool(args.customer_id as string, args.campaign_id as string, args.keywords as string[], args.match_type as string, args.client_name as string, args.domain as string))
      case 'seo_analyze_page':
        return JSON.stringify(await seoAnalyzePageTool(args.url as string, args.target_keyword as string))
      case 'posthog_get_health':
        return JSON.stringify(await posthogGetHealth(args.date_from as string, args.date_to as string))
      case 'posthog_get_web_vitals':
        return JSON.stringify(await posthogGetWebVitals(args.date_from as string, args.date_to as string))
      case 'posthog_get_traffic':
        return JSON.stringify(await posthogGetTraffic(args.date_from as string, args.date_to as string))
      case 'gsc_get_metrics':
        return JSON.stringify(await gscGetMetrics(args.site_url as string, args.date_from as string, args.date_to as string))
      case 'gsc_get_top_queries':
        return JSON.stringify(await gscGetTopQueries(args.site_url as string, args.date_from as string, args.date_to as string))
      case 'gsc_get_top_pages':
        return JSON.stringify(await gscGetTopPagesFn(args.site_url as string, args.date_from as string, args.date_to as string))
      case 'generate_client_report':
        return JSON.stringify(await generateClientReport(args.client as string))
      default:
        return null // Not an external tool
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Eroare necunoscută'
    console.error(`[Copilot External Tool] Error executing ${name}:`, msg)
    return JSON.stringify({ error: `Eroare la executarea tool-ului "${name}": ${msg}` })
  }
}

// ────────────────────────────────────────────
// Phase 2: Negative Keywords Tools
// ────────────────────────────────────────────

export async function googleAdsKeywordPerformance(customerId: string, dateFrom?: string, dateTo?: string) {
  if (!customerId) return { error: 'Lipsește Google Ads Customer ID.' }
  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const keywords = await getKeywordPerformance(customerId, range.dateFrom, range.dateTo)
    return {
      period: `${range.dateFrom} → ${range.dateTo}`,
      totalKeywords: keywords.length,
      keywords: keywords.slice(0, 20).map(k => ({
        keyword: k.keyword,
        matchType: k.matchType,
        qualityScore: k.qualityScore,
        clicks: k.clicks,
        impressions: k.impressions,
        ctr: k.ctr,
        cpc: k.cpc,
        spend: k.spend,
      })),
    }
  } catch (err) {
    return { error: `Eroare keyword performance: ${err instanceof Error ? err.message : err}` }
  }
}

export async function googleAdsImpressionShareTool(customerId: string, dateFrom?: string, dateTo?: string) {
  if (!customerId) return { error: 'Lipsește Google Ads Customer ID.' }
  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const data = await getImpressionShare(customerId, range.dateFrom, range.dateTo)
    return {
      period: `${range.dateFrom} → ${range.dateTo}`,
      campaigns: data.map(d => ({
        campaign: d.campaignName,
        impressionShare: d.searchImpressionShare,
        lostBudget: d.lostIsBudget,
        lostRank: d.lostIsRank,
      })),
    }
  } catch (err) {
    return { error: `Eroare impression share: ${err instanceof Error ? err.message : err}` }
  }
}

export async function analyzeNegativeKeywordsTool(
  customerId: string, dateFrom?: string, dateTo?: string,
  domain?: string, clientName?: string
) {
  if (!customerId) return { error: 'Lipsește Google Ads Customer ID.' }
  const range = dateFrom && dateTo ? { dateFrom, dateTo } : defaultDateRange()

  try {
    const analysis = await analyzeNegativeKeywords(
      customerId, range.dateFrom, range.dateTo,
      undefined, domain, clientName
    )
    return {
      period: `${range.dateFrom} → ${range.dateTo}`,
      summary: analysis.summary,
      highPrioritySuggestions: analysis.suggestions
        .filter(s => s.priority === 'high' || s.priority === 'medium')
        .slice(0, 15)
        .map(s => ({
          term: s.term,
          reason: s.reason,
          wastedSpend: s.wastedSpend,
          campaign: s.campaignName,
          suggestedMatchType: s.matchType,
        })),
      topIrrelevantTerms: analysis.analyzed
        .filter(t => t.classification === 'irrelevant')
        .slice(0, 10)
        .map(t => ({ term: t.term, score: t.score, reason: t.reason, cost: t.cost })),
    }
  } catch (err) {
    return { error: `Eroare analiză negative keywords: ${err instanceof Error ? err.message : err}` }
  }
}

export async function applyNegativeKeywordsTool(
  customerId: string, campaignId: string, keywords: string[],
  matchType?: string, clientName?: string, domain?: string
) {
  if (!customerId || !campaignId) return { error: 'Lipsesc customerId și campaignId.' }
  if (!keywords?.length) return { error: 'Lipsesc keywords-urile de adăugat.' }

  try {
    const result = await applyNegativeKeywords(
      customerId, campaignId, keywords,
      (matchType as 'BROAD' | 'PHRASE' | 'EXACT') || 'BROAD',
      clientName, domain
    )
    return {
      success: result.success,
      added: result.added,
      keywords: keywords,
      errors: result.errors,
      message: result.success
        ? `✅ ${result.added} termeni negativi adăugați cu succes. Notificare Telegram trimisă.`
        : `❌ Eroare la adăugarea termenilor: ${result.errors.join(', ')}`,
    }
  } catch (err) {
    return { error: `Eroare apply negative keywords: ${err instanceof Error ? err.message : err}` }
  }
}

// ────────────────────────────────────────────
// Phase 3: SEO Tools
// ────────────────────────────────────────────

export async function seoAnalyzePageTool(url: string, targetKeyword?: string) {
  if (!url) return { error: 'URL-ul este obligatoriu.' }

  let normalizedUrl = url
  if (!url.startsWith('http')) normalizedUrl = `https://${url}`

  try {
    const analysis = await analyzePage(normalizedUrl, targetKeyword)
    return {
      url: normalizedUrl,
      score: analysis.overallScore,
      scoreBreakdown: analysis.scoreBreakdown,
      title: { value: analysis.title.value, length: analysis.title.length, status: analysis.title.score },
      metaDescription: { value: analysis.metaDescription.value.slice(0, 80) + '...', status: analysis.metaDescription.score },
      headings: {
        h1: analysis.h1.values,
        h2Count: analysis.h2.count,
        h3Count: analysis.h3.count,
      },
      content: {
        wordCount: analysis.wordCount,
        readingTimeMin: analysis.readingTimeMin,
        topKeywords: analysis.keywordDensity.slice(0, 5),
      },
      links: {
        internal: analysis.internalLinks.count,
        external: analysis.externalLinks.count,
      },
      images: {
        total: analysis.totalImages,
        withoutAlt: analysis.imagesWithoutAlt,
      },
      technical: {
        hasSchema: analysis.hasSchemaMarkup,
        hasCanonical: !!analysis.canonical,
        hasViewport: analysis.hasViewportMeta,
        loadTimeMs: analysis.loadTimeMs,
      },
      issues: analysis.issues.slice(0, 10),
    }
  } catch (err) {
    return { error: `Eroare SEO analiză: ${err instanceof Error ? err.message : err}` }
  }
}
