import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import {
  getCampaigns,
  getDailyPerformance,
  getConversionBreakdown,
  getSearchTerms,
  getDeviceBreakdown,
  getImpressionShare,
  getKeywordPerformance,
  getHourOfDayPerformance,
  getDayOfWeekPerformance,
  getAdGroupPerformance,
  getLandingPageConversionsSummary,
} from '@/lib/integrations/google-ads'
import {
  getSiteMetrics,
  getTopQueries,
  getTopPages as getGSCTopPages,
  getGSCDailyPerformance,
  getPageKeywords,
} from '@/lib/integrations/gsc'
import {
  getHealthMetrics,
  getWebVitals,
  getTrafficBySource,
  getDomainFullAnalytics,
  getFormSubmissions,
  getConversionsByPage,
} from '@/lib/integrations/posthog'
import { resolveDomainSources } from '@/lib/reports/aggregator'
import { analyzeSEOOpportunities } from '@/lib/seo/seo-recommendations'
import { getCallRecordings } from '@/lib/integrations/telnyx'
import { computeConversionSummary, leadDomainWhere } from '@/lib/reports/conversions'

export const dynamic = 'force-dynamic'

// ─── GET /api/reports/public/[token]/data ───
// Public route — returns live data for requested widgets.
// Query: ?widgets=conversions_hero,google_ads_kpis&from=2026-05-01&to=2026-05-31
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { searchParams } = new URL(request.url)

    const widgetParam = searchParams.get('widgets') || ''
    const requestedWidgets = widgetParam.split(',').filter(Boolean)
    const dateFrom: string = searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const dateTo: string = searchParams.get('to') || new Date().toISOString().slice(0, 10)

    // Validate report exists
    const report = await db.clientReport.findUnique({
      where: { token },
      include: {
        client: {
          select: {
            id: true,
            googleAdsCustomerId: true,
            gscSiteUrl: true,
            projects: {
              select: { name: true, metadata: true },
              where: { status: { not: 'suspendat' } },
            },
          },
        },
      },
    })

    if (!report || report.status !== 'active') {
      return NextResponse.json({ error: 'Raport indisponibil' }, { status: 404 })
    }

    // ── Resolve integrations using the same logic as admin aggregator ──
    const targetDomain = report.domain || ''
    let adsId = ''
    let adsCampaignIds: string[] = []
    let gscUrl = ''
    let posthogId: string | null = null
    let telnyxPhoneNumbers: unknown[] = []

    if (targetDomain) {
      const sources = await resolveDomainSources(report.client.id, targetDomain)
      adsId = sources.adsCustomerId || ''
      adsCampaignIds = sources.adsCampaignIds || []
      gscUrl = sources.gscSiteUrl || ''
      posthogId = sources.posthogProjectId
      telnyxPhoneNumbers = sources.telnyxPhoneNumbers || []
    } else {
      // Legacy: no domain — use client-level defaults
      adsId = report.client.googleAdsCustomerId || ''
      gscUrl = report.client.gscSiteUrl || ''
      for (const proj of report.client.projects) {
        const meta = (proj.metadata || {}) as any
        if (meta.posthogProjectId) { posthogId = meta.posthogProjectId }
        if (meta.telnyxPhoneNumbers && Array.isArray(meta.telnyxPhoneNumbers)) {
          telnyxPhoneNumbers.push(...meta.telnyxPhoneNumbers)
        }
      }
    }

    const reportWidgets = report.widgets as Array<{ type: string; label?: string; enabled: boolean }>

    // Auto-upgrade: add new widgets that don't exist in legacy reports
    const newWidgets = [
      { type: 'conversion_details', label: '📊 Conversii Detaliate', enabled: true },
    ]
    for (const nw of newWidgets) {
      if (!reportWidgets.some(w => w.type === nw.type)) {
        reportWidgets.push(nw)
      }
    }

    const enabledWidgets = reportWidgets
      .filter(w => w.enabled)
      .map(w => w.type)

    // Only fetch requested widgets that are also enabled
    const widgetsToFetch = requestedWidgets.length > 0
      ? requestedWidgets.filter(w => enabledWidgets.includes(w))
      : enabledWidgets

    const results: Record<string, unknown> = {}
    const promises: Promise<void>[] = []
    const campaignFilter = adsCampaignIds.length > 0 ? adsCampaignIds : undefined

    // ── Google Ads widgets — use same campaign-filtered logic as aggregator ──
    if (adsId) {
      const needsAdsData = ['conversions_hero', 'google_ads_kpis', 'google_ads_trend', 'google_ads_tables', 'google_ads_extended', 'conversion_details']
        .some(w => widgetsToFetch.includes(w))

      if (needsAdsData) {
        promises.push(
          (async () => {
            try {
              // Fetch core data in parallel
              const [allCampaigns, daily, convBreakdown, searchTerms] = await Promise.all([
                // Not swallowed: a bad customer id must surface as an error, not as silent zeros
                getCampaigns(adsId, dateFrom, dateTo),
                getDailyPerformance(adsId, dateFrom, dateTo).catch(() => []),
                getConversionBreakdown(adsId, dateFrom, dateTo, campaignFilter).catch(() => []),
                getSearchTerms(adsId, dateFrom, dateTo, campaignFilter, 20).catch(() => []),
              ])

              // Filter campaigns if we have specific IDs for this domain
              const filteredCampaigns = campaignFilter?.length
                ? allCampaigns.filter((c: any) => campaignFilter.some(fid => String(fid) === String(c.id)))
                : allCampaigns

              // Calculate KPIs from filtered campaigns (not getAccountMetrics!)
              let impressions = 0, clicks = 0, spend = 0, convTotal = 0, convValue = 0
              for (const c of filteredCampaigns) {
                impressions += (c as any).metrics?.impressions || 0
                clicks += (c as any).metrics?.clicks || 0
                spend += (c as any).metrics?.spend || 0
                convTotal += (c as any).metrics?.conversions || 0
                convValue += (c as any).metrics?.conversionsValue || 0
              }

              // Set KPIs
              results.google_ads_kpis = {
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

              // Set trend (only if not campaign-filtered)
              results.google_ads_trend = campaignFilter?.length ? [] : daily

              // Set tables with search terms per campaign
              results.google_ads_tables = {
                campaigns: filteredCampaigns,
                convBreakdown,
                searchTerms,
              }

              // Extended data (if requested)
              if (widgetsToFetch.includes('google_ads_extended')) {
                const [devices, impressionShare, keywords, hourOfDay, dayOfWeek, adGroups] = await Promise.all([
                  getDeviceBreakdown(adsId, dateFrom, dateTo, campaignFilter).catch(() => []),
                  getImpressionShare(adsId, dateFrom, dateTo, campaignFilter).catch(() => []),
                  getKeywordPerformance(adsId, dateFrom, dateTo, campaignFilter).catch(() => []),
                  getHourOfDayPerformance(adsId, dateFrom, dateTo, campaignFilter).catch(() => []),
                  getDayOfWeekPerformance(adsId, dateFrom, dateTo, campaignFilter).catch(() => []),
                  getAdGroupPerformance(adsId, dateFrom, dateTo, campaignFilter).catch(() => []),
                ])
                results.google_ads_extended = {
                  deviceBreakdown: devices,
                  impressionShare,
                  keywords: (keywords as any[]).slice(0, 15),
                  hourOfDay,
                  dayOfWeek,
                  adGroups: (adGroups as any[]).slice(0, 10),
                }
              }

              // Landing page conversions (for conversion_details widget)
              if (widgetsToFetch.includes('conversion_details')) {
                try {
                  const landingPageConversions = await getLandingPageConversionsSummary(
                    adsId, dateFrom, dateTo, campaignFilter
                  )
                  if (!results.conversion_details) results.conversion_details = {}
                  ;(results.conversion_details as any).landingPageConversions = landingPageConversions
                } catch (e) {
                  console.warn('[PublicData] Landing page conversions error:', e)
                }
              }
            } catch (err: any) {
              console.error('[PublicData] Google Ads error:', err)
              results.google_ads_kpis = { error: err.message }
            }
          })()
        )
      }
    }

    // ── GSC / SEO widgets ──
    if (gscUrl) {
      if (widgetsToFetch.includes('seo_kpis') || widgetsToFetch.includes('conversions_hero')) {
        promises.push(
          getSiteMetrics(gscUrl, dateFrom, dateTo)
            .then(data => { results.seo_kpis = data })
            .catch(err => { results.seo_kpis = { error: err.message } })
        )
      }
      if (widgetsToFetch.includes('seo_trend')) {
        promises.push(
          getGSCDailyPerformance(gscUrl, dateFrom, dateTo)
            .then(data => { results.seo_trend = data })
            .catch(err => { results.seo_trend = { error: err.message } })
        )
      }
      if (widgetsToFetch.includes('seo_tables')) {
        promises.push(
          Promise.all([
            getTopQueries(gscUrl, dateFrom, dateTo, 20).catch(() => []),
            getGSCTopPages(gscUrl, dateFrom, dateTo, 20).catch(() => []),
          ]).then(([queries, pages]) => {
            results.seo_tables = { queries, pages }
          })
        )
      }
      if (widgetsToFetch.includes('seo_articles')) {
        promises.push(
          getGSCTopPages(gscUrl, dateFrom, dateTo, 50)
            .then(pages => {
              // Filter for blog/article pages
              const articles = (pages || []).filter((p: any) =>
                /\/(blog|articol|news|stiri|ghid|resurse)\//i.test(p.page)
              ).slice(0, 10)
              results.seo_articles = articles
            })
            .catch(err => { results.seo_articles = { error: err.message } })
        )
      }
      // Page ↔ Keywords cross-reference + SEO recommendations
      if (widgetsToFetch.includes('seo_page_keywords')) {
        promises.push(
          getPageKeywords(gscUrl, dateFrom, dateTo, 200)
            .then(raw => {
              const analysis = analyzeSEOOpportunities(raw)
              results.seo_page_keywords = { analysis, raw }
            })
            .catch(err => { results.seo_page_keywords = { error: err.message } })
        )
      }
    }

    // ── PostHog widgets ──
    if (posthogId && process.env.POSTHOG_PERSONAL_API_KEY) {
      if (widgetsToFetch.includes('social_breakdown') || widgetsToFetch.includes('source_attribution') || widgetsToFetch.includes('conversions_hero')) {
        promises.push(
          getTrafficBySource(posthogId, dateFrom, dateTo)
            .then(data => { results.traffic_sources = data })
            .catch(err => { results.traffic_sources = { error: err.message } })
        )
      }
      if (widgetsToFetch.includes('site_health')) {
        promises.push(
          Promise.all([
            getHealthMetrics(posthogId, dateFrom, dateTo).catch(() => null),
            getWebVitals(posthogId, dateFrom, dateTo).catch(() => null),
          ]).then(([health, vitals]) => {
            results.site_health = { health, webVitals: vitals }
          })
        )
      }
      // NEW: PostHog Traffic widget with domain filtering
      if (widgetsToFetch.includes('posthog_traffic') && targetDomain) {
        promises.push(
          getDomainFullAnalytics(posthogId, targetDomain, dateFrom, dateTo)
            .then(ph => {
              results.posthog_traffic = {
                traffic: {
                  pageviews: ph.domainTraffic.pageviews,
                  uniqueVisitors: ph.domainTraffic.uniqueVisitors,
                  sessions: ph.domainTraffic.sessions,
                  bounceRate: ph.bounceRate.bounceRate,
                },
                dailyTraffic: ph.dailyTraffic,
                trafficBySource: ph.trafficBySource,
                topPages: ph.topPages,
              }
            })
            .catch(err => { results.posthog_traffic = { error: err.message } })
        )
      }
    }

    // ── Uptime widget (NEW) ──
    if (widgetsToFetch.includes('uptime') && targetDomain) {
      promises.push(
        (async () => {
          try {
            const checks = await db.uptimeCheck.findMany({
              where: {
                domain: targetDomain,
                checkedAt: { gte: new Date(dateFrom), lte: new Date(dateTo + 'T23:59:59Z') },
              },
              orderBy: { checkedAt: 'desc' },
              take: 1000,
            })
            const incidents = await db.uptimeIncident.findMany({
              where: {
                domain: targetDomain,
                startedAt: { gte: new Date(dateFrom), lte: new Date(dateTo + 'T23:59:59Z') },
              },
              orderBy: { startedAt: 'desc' },
              take: 10,
            })
            const totalChecks = checks.length
            const upChecks = checks.filter(c => c.isUp).length
            results.uptime = {
              percent: totalChecks > 0 ? +((upChecks / totalChecks) * 100).toFixed(2) : 0,
              avgResponseMs: totalChecks > 0 ? Math.round(checks.reduce((s, c) => s + c.responseMs, 0) / totalChecks) : 0,
              totalChecks,
              incidents: incidents.map(i => ({
                startedAt: i.startedAt,
                resolvedAt: i.resolvedAt,
                durationMin: i.durationMin,
                cause: i.cause,
              })),
            }
          } catch (err) {
            console.warn('[PublicData] Uptime fetch error:', err)
          }
        })()
      )
    }

    // ── CRM Conversion Details (form submissions per page) ──
    if (widgetsToFetch.includes('conversion_details') && targetDomain) {
      promises.push(
        (async () => {
          try {
            const allLeads = await db.lead.findMany({
              where: {
                ...leadDomainWhere(targetDomain),
                createdAt: {
                  gte: new Date(dateFrom),
                  lte: new Date(dateTo + 'T23:59:59Z'),
                },
              },
              select: {
                id: true,
                contactPerson: true,
                email: true,
                phone: true,
                createdAt: true,
                sourcePage: true,
                companyName: true,
              },
              orderBy: { createdAt: 'desc' },
            })

            const groupedByPage: Record<string, any[]> = {}
            for (const lead of allLeads) {
              const page = lead.sourcePage || '/'
              if (!groupedByPage[page]) groupedByPage[page] = []
              groupedByPage[page].push(lead)
            }

            const convByPage = Object.entries(groupedByPage).map(([pageUrl, leads]) => ({
              pageUrl,
              totalConversions: leads.length,
              formSubmissions: leads.length,
              phoneClicks: 0,
              emailClicks: 0,
              leads: leads
            })).sort((a, b) => b.totalConversions - a.totalConversions)

            if (!results.conversion_details) results.conversion_details = {}
            ;(results.conversion_details as any).conversionsByPage = convByPage
          } catch (e) {
            console.warn('[PublicData] CRM conversions by page error:', e)
          }
        })()
      )
    }

    // ── CRM Leads ──
    if (widgetsToFetch.includes('conversions_hero') && targetDomain) {
      promises.push(
        (async () => {
          try {
            const leads = await db.lead.findMany({
              where: {
                ...leadDomainWhere(targetDomain),
                createdAt: {
                  gte: new Date(dateFrom),
                  lte: new Date(dateTo + 'T23:59:59Z'),
                },
              },
              select: { source: true },
            })
            results.crm_leads = leads
          } catch (err) {
            console.warn('[PublicData] CRM Leads fetch error:', err)
          }
        })()
      )
    }

    // ── Telnyx Calls ──
    if (telnyxPhoneNumbers.length > 0 && process.env.TELNYX_API_KEY && widgetsToFetch.includes('conversions_hero')) {
      promises.push(
        (async () => {
          try {
            const callData = await getCallRecordings(telnyxPhoneNumbers as string[], dateFrom, dateTo)
            results.telnyx = callData
          } catch (err) {
            console.warn('[PublicData] Telnyx fetch error:', err)
          }
        })()
      )
    }

    await Promise.all(promises)

    // ── Build Source Attribution from combined data ──
    if (widgetsToFetch.includes('source_attribution') || widgetsToFetch.includes('conversions_hero')) {
      const attribution: Record<string, { source: string; pageviews: number; users: number }> = {}
      const trafficSources = results.traffic_sources as Array<{ source: string; medium: string; pageviews: number; uniqueUsers: number }> | undefined
      if (Array.isArray(trafficSources)) {
        for (const t of trafficSources) {
          const key = categorizeSource(t.source, t.medium)
          if (!attribution[key]) attribution[key] = { source: key, pageviews: 0, users: 0 }
          attribution[key].pageviews += t.pageviews
          attribution[key].users += t.uniqueUsers
        }
      }
      results.source_attribution = Object.values(attribution).sort((a, b) => b.pageviews - a.pageviews)
    }

    // ── Build Conversions Hero ──
    if (widgetsToFetch.includes('conversions_hero')) {
      const adsData = results.google_ads_kpis as any
      const adsConvBreakdown = (results.google_ads_tables as any)?.convBreakdown || []

      const summary = computeConversionSummary({
        adsBreakdown: adsConvBreakdown,
        leads: (results.crm_leads as any[]) || [],
        telnyxCalls: (results.telnyx as any)?.totalCalls || 0,
      })

      results.conversions_hero = {
        ...summary,
        adsConversions: adsData?.conversions || 0,
        adsConversionsValue: adsData?.conversionsValue || 0,
        adsClicks: adsData?.clicks || 0,
        organicClicks: (results.seo_kpis as any)?.clicks || 0,
        telnyxCalls: (results.telnyx as any)?.totalCalls || 0,
      }
    }

    // ── Social Breakdown (filter social from traffic) ──
    if (widgetsToFetch.includes('social_breakdown')) {
      const trafficSources = results.traffic_sources as Array<{ source: string; medium: string; pageviews: number; uniqueUsers: number }> | undefined
      if (Array.isArray(trafficSources)) {
        const socialSources = trafficSources.filter(t =>
          /facebook|instagram|linkedin|tiktok|twitter|pinterest|social/i.test(`${t.source} ${t.medium}`)
        )
        results.social_breakdown = socialSources
      }
    }

    return NextResponse.json({
      data: results,
      meta: {
        dateRange: { from: dateFrom, to: dateTo },
        integrations: {
          googleAds: !!adsId,
          gsc: !!gscUrl,
          posthog: !!posthogId,
        },
        widgetsFetched: widgetsToFetch,
      },
    })
  } catch (error: any) {
    console.error('[API] GET /api/reports/public/[token]/data error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper: categorize traffic source into groups
function categorizeSource(source: string, medium: string): string {
  const s = `${source} ${medium}`.toLowerCase()
  if (/google.*cpc|google.*paid|adwords|gclid/i.test(s)) return 'Google Ads'
  if (/facebook|instagram|meta|fb/i.test(s) && /cpc|paid|ad/i.test(s)) return 'Social Ads'
  if (/google|bing|yahoo|duckduckgo/i.test(s) && /organic/i.test(s)) return 'Organic'
  if (/facebook|instagram|linkedin|tiktok|twitter|pinterest/i.test(s)) return 'Social'
  if (/email|newsletter|mailchimp/i.test(s)) return 'Email'
  if (/referral/i.test(medium)) return 'Referral'
  if (/direct|\(none\)|\(not set\)/i.test(s)) return 'Direct'
  return 'Altele'
}
