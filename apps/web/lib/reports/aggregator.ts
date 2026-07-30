/**
 * Report Data Aggregator
 * Aggregates data from all sources (Google Ads, GSC, PostHog, Uptime)
 * into a unified DomainReportData structure for a specific client domain.
 */

import {
  getCampaigns,
  getDailyPerformance,
  getConversionBreakdown,
  getSearchTerms,
  getDeviceBreakdown,
  getGeoPerformance,
  getAdGroupPerformance,
  getKeywordPerformance,
  getHourOfDayPerformance,
  getDayOfWeekPerformance,
  getImpressionShare,
  getAdPerformance,
} from '@/lib/integrations/google-ads'
import {
  getSiteMetrics,
  getTopQueries,
  getTopPages as getGSCTopPages,
  getGSCDailyPerformance,
  getPageKeywords,
} from '@/lib/integrations/gsc'
import {
  getDomainFullAnalytics,
  type DomainTrafficStats,
  type DomainBounceStats,
  type DomainDailyTraffic,
  type PostHogWebVitals,
  type PostHogTrafficBySource,
  type PostHogHealthMetrics,
} from '@/lib/integrations/posthog'
import { getCallRecordings, type TelnyxCallStats } from '@/lib/integrations/telnyx'
import { analyzeSEOOpportunities, type SEOAnalysisResult } from '@/lib/seo/seo-recommendations'
import { db } from '@repo/db'

// ─── Types ───

export interface GoogleAdsData {
  kpis: {
    impressions: number
    clicks: number
    spend: number
    conversions: number
    conversionsValue: number
    ctr: number
    cpc: number
    conversionRate: number
    roas: number
  }
  daily: Array<{ date: string; clicks: number; impressions: number; spend: number; conversions: number; conversionsValue: number }>
  campaigns: Array<{ id: string; name: string; status: string; channelType: string; budget: number; metrics: Record<string, number> }>
  conversions: Array<{ actionName: string; category: string; conversions: number; allConversions: number; value: number; campaigns: string[] }>
  searchTerms: Array<{ term: string; campaign: string; clicks: number; impressions: number; cost: number; conversions: number; ctr: number; cpc: number }>
  // Extended data (Phase 1)
  deviceBreakdown?: Array<{ device: string; impressions: number; clicks: number; spend: number; conversions: number; ctr: number }>
  geoPerformance?: Array<{ locationId: string; geoTarget: string; impressions: number; clicks: number; spend: number; conversions: number; ctr: number; cpc: number }>
  adGroups?: Array<{ id: string; name: string; campaignName: string; metrics: Record<string, number> }>
  keywords?: Array<{ keyword: string; matchType: string; qualityScore: number | null; impressions: number; clicks: number; spend: number; ctr: number; cpc: number }>
  hourOfDay?: Array<{ hour: number; label: string; impressions: number; clicks: number; spend: number; conversions: number }>
  dayOfWeek?: Array<{ day: string; label: string; impressions: number; clicks: number; spend: number; conversions: number }>
  impressionShare?: Array<{ campaignName: string; searchImpressionShare: number | null; lostIsBudget: number | null; lostIsRank: number | null }>
  adPerformance?: Array<{ adId: string; headlines: string[]; descriptions: string[]; impressions: number; clicks: number; ctr: number; cpc: number }>
}

export interface SeoData {
  kpis: { clicks: number; impressions: number; ctr: number; position: number }
  daily: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
  topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>
  pageKeywords?: Array<{ page: string; query: string; clicks: number; impressions: number; ctr: number; position: number }>
  seoAnalysis?: SEOAnalysisResult
}

export interface AnalyticsData {
  traffic: DomainTrafficStats & { bounceRate: number }
  dailyTraffic: DomainDailyTraffic[]
  trafficBySource: PostHogTrafficBySource[]
  topPages: Array<{ page: string; views: number; users: number }>
  webVitals: PostHogWebVitals | null
  health: PostHogHealthMetrics
}

export interface UptimeData {
  percent: number
  avgResponseMs: number
  totalChecks: number
  incidents: Array<{ startedAt: Date; resolvedAt: Date | null; durationMin: number | null; cause: string | null }>
}

export interface TelnyxData {
  totalCalls: number
  avgDuration: number
  totalDuration: number
  bySource: Array<{ source: string; label: string; count: number; avgDuration: number }>
  calls: Array<{ id: string; from: string; to: string; duration: number; createdAt: string; source: string; sourceLabel: string }>
}

export interface DomainReportData {
  // Hero KPIs (aggregated)
  summary: {
    totalConversions: number
    totalClicks: number
    totalSessions: number
    uptimePercent: number
    totalCalls: number
  }

  // Per-source data
  googleAds: GoogleAdsData | null
  seo: SeoData | null
  analytics: AnalyticsData | null
  uptime: UptimeData | null
  telnyx: TelnyxData | null

  // Source availability
  sources: {
    googleAds: boolean
    gsc: boolean
    posthog: boolean
    uptime: boolean
    telnyx: boolean
  }
}

// ─── Domain Config Resolver ───

interface ResolvedSources {
  adsCustomerId: string | null
  adsCampaignIds: string[]
  gscSiteUrl: string | null
  posthogProjectId: string | null
  telnyxPhoneNumbers: unknown[]
  domain: string
}

/**
 * Resolve data sources for a domain using:
 * 1. ClientDomainConfig (if exists)
 * 2. Project metadata (gscSiteUrl, adsCustomerId, posthogProjectId)
 * 3. Client-level defaults
 */
export async function resolveDomainSources(
  clientId: string,
  domain: string,
  domainConfigId?: string | null
): Promise<ResolvedSources> {
  // Try to get domain config first
  const config = domainConfigId
    ? await db.clientDomainConfig.findUnique({ where: { id: domainConfigId } })
    : await db.clientDomainConfig.findUnique({ where: { clientId_domain: { clientId, domain } } })

  // Always fetch client + projects for fallback
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: {
      googleAdsCustomerId: true,
      gscSiteUrl: true,
      projects: {
        where: { status: { not: 'suspendat' } },
        select: { name: true, metadata: true },
      },
    },
  })

  // If we have explicit domain config, use it (with client-level fallback)
  if (config) {
    // Still check projects for missing fields
    let fallbackAds = config.googleAdsCustomerId || null
    let fallbackCampaignIds = config.googleAdsCampaignIds || []
    let fallbackPosthog = config.posthogProjectId || null

    if (!fallbackAds || !fallbackPosthog) {
      const fromProjects = extractFromProjects(client?.projects || [], domain)
      if (!fallbackAds) fallbackAds = fromProjects.adsCustomerId
      if (fallbackCampaignIds.length === 0) fallbackCampaignIds = fromProjects.adsCampaignIds
      if (!fallbackPosthog) fallbackPosthog = fromProjects.posthogProjectId
    }

    const fromProjectsFull = extractFromProjects(client?.projects || [], domain)
    return {
      adsCustomerId: fallbackAds || client?.googleAdsCustomerId || null,
      adsCampaignIds: fallbackCampaignIds.length > 0 ? fallbackCampaignIds : fromProjectsFull.adsCampaignIds,
      gscSiteUrl: config.gscSiteUrl || null,
      posthogProjectId: fallbackPosthog || null,
      telnyxPhoneNumbers: fromProjectsFull.telnyxPhoneNumbers,
      domain: config.domain,
    }
  }

  // No config — scan projects for domain-matching metadata
  const fromProjects = extractFromProjects(client?.projects || [], domain)

  // GSC: prefer project metadata, then client-level if domain matches
  let gscUrl = fromProjects.gscSiteUrl
  if (!gscUrl && client?.gscSiteUrl) {
    const clientGscDomain = client.gscSiteUrl.replace('sc-domain:', '').toLowerCase()
    if (clientGscDomain === domain.toLowerCase()) {
      gscUrl = client.gscSiteUrl
    } else {
      gscUrl = `sc-domain:${domain}` // default fallback
    }
  }
  if (!gscUrl) gscUrl = `sc-domain:${domain}`

  const resolved = {
    adsCustomerId: fromProjects.adsCustomerId || client?.googleAdsCustomerId || null,
    adsCampaignIds: fromProjects.adsCampaignIds,
    gscSiteUrl: gscUrl,
    posthogProjectId: fromProjects.posthogProjectId || null,
    telnyxPhoneNumbers: fromProjects.telnyxPhoneNumbers,
    domain,
  }

  console.log(`[Aggregator] Resolved sources for ${domain}: ADS CID=${resolved.adsCustomerId}, campaigns=${resolved.adsCampaignIds.length > 0 ? resolved.adsCampaignIds.join(',') : 'ALL'}, PH=${resolved.posthogProjectId}, Telnyx=${resolved.telnyxPhoneNumbers.length}`)

  return resolved
}

/**
 * Extract integration data from project metadata matching a specific domain
 */
function extractFromProjects(
  projects: Array<{ name: string; metadata: unknown }>,
  domain: string
): { adsCustomerId: string | null; adsCampaignIds: string[]; gscSiteUrl: string | null; posthogProjectId: string | null; telnyxPhoneNumbers: unknown[] } {
  let adsCustomerId: string | null = null
  let adsCampaignIds: string[] = []
  let gscSiteUrl: string | null = null
  let posthogProjectId: string | null = null
  let telnyxPhoneNumbers: unknown[] = []

  for (const proj of projects) {
    const meta = (proj.metadata || {}) as Record<string, unknown>
    const nameMatch = proj.name.toLowerCase().includes(domain.toLowerCase())
    const metaDomain = ((meta.domain as string) || '').toLowerCase()
    const metaGsc = ((meta.gscSiteUrl as string) || '').replace('sc-domain:', '').toLowerCase()

    // Check if this project matches the domain
    if (nameMatch || metaDomain === domain.toLowerCase() || metaGsc === domain.toLowerCase()) {
      if (meta.adsCustomerId && !adsCustomerId) adsCustomerId = meta.adsCustomerId as string
      if (meta.googleAdsCustomerId && !adsCustomerId) adsCustomerId = meta.googleAdsCustomerId as string
      if (Array.isArray(meta.adsCampaignIds) && adsCampaignIds.length === 0) adsCampaignIds = meta.adsCampaignIds as string[]
      if (meta.gscSiteUrl && !gscSiteUrl) gscSiteUrl = meta.gscSiteUrl as string
      if (meta.posthogProjectId && !posthogProjectId) posthogProjectId = meta.posthogProjectId as string
      if (Array.isArray(meta.telnyxPhoneNumbers) && telnyxPhoneNumbers.length === 0) telnyxPhoneNumbers = meta.telnyxPhoneNumbers
    }
  }

  return { adsCustomerId, adsCampaignIds, gscSiteUrl, posthogProjectId, telnyxPhoneNumbers }
}

// ─── Main Aggregator ───

/**
 * Aggregate all data for a specific client domain and date range
 */
export async function aggregateDomainReport(
  clientId: string,
  domain: string,
  dateFrom: string,
  dateTo: string,
  domainConfigId?: string | null
): Promise<DomainReportData> {
  const sources = await resolveDomainSources(clientId, domain, domainConfigId)

  const result: DomainReportData = {
    summary: { totalConversions: 0, totalClicks: 0, totalSessions: 0, uptimePercent: 0, totalCalls: 0 },
    googleAds: null,
    seo: null,
    analytics: null,
    uptime: null,
    telnyx: null,
    sources: {
      googleAds: !!sources.adsCustomerId,
      gsc: !!sources.gscSiteUrl,
      posthog: !!process.env.POSTHOG_PERSONAL_API_KEY,
      uptime: true,
      telnyx: sources.telnyxPhoneNumbers.length > 0 && !!process.env.TELNYX_API_KEY,
    },
  }

  // Fetch all data in parallel
  const promises: Promise<void>[] = []

  // ── Google Ads ──
  if (sources.adsCustomerId) {
    promises.push(
      (async () => {
        try {
          const campaignFilter = sources.adsCampaignIds.length > 0 ? sources.adsCampaignIds : undefined

          // Fetch all data in parallel (same approach as project KPIs)
          const [allCampaigns, daily, conversions, searchTerms] = await Promise.all([
            getCampaigns(sources.adsCustomerId!, dateFrom, dateTo),
            getDailyPerformance(sources.adsCustomerId!, dateFrom, dateTo).catch(() => []),
            getConversionBreakdown(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter).catch(() => []),
            getSearchTerms(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter, 20).catch(() => []),
          ])

          // Filter campaigns if we have specific IDs for this domain
          console.log(`[Aggregator] Google Ads CID=${sources.adsCustomerId} domain=${domain} campaignFilter=${JSON.stringify(campaignFilter)} allCampaigns=${allCampaigns.map((c: any) => c.id + ':' + c.name).join(', ')}`)

          const filteredCampaigns = campaignFilter?.length
            ? allCampaigns.filter((c: any) => campaignFilter.some(fid => String(fid) === String(c.id)))
            : allCampaigns

          console.log(`[Aggregator] Filtered: ${filteredCampaigns.length}/${allCampaigns.length} campaigns`)

          // Calculate KPIs from filtered campaigns (not from getAccountMetrics which returns ALL)
          let impressions = 0, clicks = 0, spend = 0, convTotal = 0, convValue = 0
          for (const c of filteredCampaigns) {
            impressions += c.metrics.impressions || 0
            clicks += c.metrics.clicks || 0
            spend += c.metrics.spend || 0
            convTotal += c.metrics.conversions || 0
            convValue += c.metrics.conversionsValue || 0
          }

          const kpis = {
            impressions,
            clicks,
            spend: +spend.toFixed(2),
            conversions: +convTotal.toFixed(1),
            conversionsValue: +convValue.toFixed(2),
            ctr: impressions > 0 ? +((clicks / impressions) * 100).toFixed(2) : 0,
            cpc: clicks > 0 ? +(spend / clicks).toFixed(2) : 0,
            conversionRate: clicks > 0 ? +((convTotal / clicks) * 100).toFixed(2) : 0,
            roas: spend > 0 ? +(convValue / spend).toFixed(2) : 0,
          }

          result.googleAds = {
            kpis,
            daily: campaignFilter?.length ? [] : daily,
            campaigns: filteredCampaigns,
            conversions,
            searchTerms,
          }
          result.summary.totalConversions += kpis.conversions
          result.summary.totalClicks += kpis.clicks

          // Fetch extended data in parallel (non-blocking — errors silenced)
          const [deviceBreakdown, geoPerformance, adGroups, keywords, hourOfDay, dayOfWeek, impressionShareData, adPerf] = await Promise.all([
            getDeviceBreakdown(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter).catch(() => []),
            getGeoPerformance(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter).catch(() => []),
            getAdGroupPerformance(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter).catch(() => []),
            getKeywordPerformance(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter).catch(() => []),
            getHourOfDayPerformance(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter).catch(() => []),
            getDayOfWeekPerformance(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter).catch(() => []),
            getImpressionShare(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter).catch(() => []),
            getAdPerformance(sources.adsCustomerId!, dateFrom, dateTo, campaignFilter).catch(() => []),
          ])

          result.googleAds!.deviceBreakdown = deviceBreakdown
          result.googleAds!.geoPerformance = geoPerformance
          result.googleAds!.adGroups = adGroups
          result.googleAds!.keywords = keywords
          result.googleAds!.hourOfDay = hourOfDay
          result.googleAds!.dayOfWeek = dayOfWeek
          result.googleAds!.impressionShare = impressionShareData
          result.googleAds!.adPerformance = adPerf
        } catch (err) {
          console.error(`[Aggregator] Google Ads error for ${domain}:`, err)
        }
      })()
    )
  }

  // ── GSC / SEO ──
  if (sources.gscSiteUrl) {
    promises.push(
      (async () => {
        try {
          const [kpis, daily, topQueries, topPages, pageKeywords] = await Promise.all([
            getSiteMetrics(sources.gscSiteUrl!, dateFrom, dateTo),
            getGSCDailyPerformance(sources.gscSiteUrl!, dateFrom, dateTo).catch(() => []),
            getTopQueries(sources.gscSiteUrl!, dateFrom, dateTo, 20).catch(() => []),
            getGSCTopPages(sources.gscSiteUrl!, dateFrom, dateTo, 20).catch(() => []),
            getPageKeywords(sources.gscSiteUrl!, dateFrom, dateTo, 200).catch(() => []),
          ])

          const seoAnalysis = pageKeywords.length > 0 ? analyzeSEOOpportunities(pageKeywords) : undefined

          result.seo = { kpis, daily, topQueries, topPages, pageKeywords, seoAnalysis }
          result.summary.totalClicks += kpis.clicks
        } catch (err) {
          console.error(`[Aggregator] GSC error for ${domain}:`, err)
        }
      })()
    )
  }

  // ── PostHog Analytics ──
  if (process.env.POSTHOG_PERSONAL_API_KEY) {
    const projectId = sources.posthogProjectId || process.env.POSTHOG_DEFAULT_PROJECT_ID || ''
    if (projectId) {
      promises.push(
        (async () => {
          try {
            const ph = await getDomainFullAnalytics(projectId, domain, dateFrom, dateTo)

            result.analytics = {
              traffic: {
                ...ph.domainTraffic,
                bounceRate: ph.bounceRate.bounceRate,
              },
              dailyTraffic: ph.dailyTraffic,
              trafficBySource: ph.trafficBySource,
              topPages: ph.topPages,
              webVitals: ph.webVitals,
              health: ph.health,
            }
            result.summary.totalSessions = ph.domainTraffic.sessions
          } catch (err) {
            console.error(`[Aggregator] PostHog error for ${domain}:`, err)
          }
        })()
      )
    }
  }

  // ── Uptime ──
  promises.push(
    (async () => {
      try {
        const thirtyDaysAgo = new Date(dateFrom)
        const checks = await db.uptimeCheck.findMany({
          where: {
            domain,
            checkedAt: { gte: thirtyDaysAgo, lte: new Date(dateTo + 'T23:59:59Z') },
          },
          orderBy: { checkedAt: 'desc' },
          take: 1000,
        })

        const incidents = await db.uptimeIncident.findMany({
          where: {
            domain,
            startedAt: { gte: thirtyDaysAgo, lte: new Date(dateTo + 'T23:59:59Z') },
          },
          orderBy: { startedAt: 'desc' },
          take: 20,
        })

        const totalChecks = checks.length
        const upChecks = checks.filter(c => c.isUp).length
        const avgMs = totalChecks > 0
          ? Math.round(checks.reduce((sum, c) => sum + c.responseMs, 0) / totalChecks)
          : 0

        result.uptime = {
          percent: totalChecks > 0 ? +((upChecks / totalChecks) * 100).toFixed(2) : 0,
          avgResponseMs: avgMs,
          totalChecks,
          incidents: incidents.map(i => ({
            startedAt: i.startedAt,
            resolvedAt: i.resolvedAt,
            durationMin: i.durationMin,
            cause: i.cause,
          })),
        }
        result.summary.uptimePercent = result.uptime.percent
      } catch (err) {
        console.error(`[Aggregator] Uptime error for ${domain}:`, err)
      }
    })()
  )

  // ── Telnyx Call Tracking ──
  if (sources.telnyxPhoneNumbers.length > 0 && process.env.TELNYX_API_KEY) {
    promises.push(
      (async () => {
        try {
          const callData = await getCallRecordings(sources.telnyxPhoneNumbers, dateFrom, dateTo)
          result.telnyx = callData
          result.summary.totalCalls = callData.totalCalls
        } catch (err) {
          console.error(`[Aggregator] Telnyx error for ${domain}:`, err)
        }
      })()
    )
  }

  await Promise.all(promises)

  return result
}
