import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';
import { getCampaigns, getDailyPerformance, getConversionBreakdown, getSearchTerms } from '@/lib/integrations/google-ads';
import { getSiteMetrics, getTopQueries, getTopPages, getGSCDailyPerformance, getPageKeywords } from '@/lib/integrations/gsc';
import { getFullAnalytics } from '@/lib/integrations/posthog';
import { getCallRecordings } from '@/lib/integrations/telnyx';

/**
 * GET /api/projects/[id]/kpis?from=2026-03-01&to=2026-03-31
 * 
 * Returns unified KPI data from:
 * - Google Ads (campaigns, conversions breakdown, search terms)
 * - Google Search Console (organic metrics, queries, pages)
 * - PostHog (session recordings, events)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Default date range: last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateFrom = searchParams.get('from') || thirtyDaysAgo.toISOString().split('T')[0];
    const dateTo = searchParams.get('to') || now.toISOString().split('T')[0];

    // Fetch project with client
    const project = await db.project.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            googleAdsCustomerId: true,
            ga4PropertyId: true,
            gscSiteUrl: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const meta = project.metadata as any;
    const result: any = {
      projectId: id,
      projectName: project.name,
      clientName: project.client.companyName,
      templateId: project.templateId,
      dateRange: { from: dateFrom, to: dateTo },
      // Google Ads
      googleAds: null,
      campaigns: null,
      dailyPerformance: null,
      conversionBreakdown: null,
      searchTerms: null,
      // GSC
      gsc: null,
      gscQueries: null,
      gscPages: null,
      gscDaily: null,
      pageKeywords: null,
      // PostHog
      posthog: null,
      // Telnyx
      telnyx: null,
    };

    // ─── Google Ads data ───
    const googleAdsId = meta?.adsCustomerId || project.client.googleAdsCustomerId;
    if (googleAdsId) {
      try {
        const campaignFilter = meta?.adsCampaignIds as string[] | undefined;

        // Fetch all data in parallel
        const [allCampaigns, daily, convBreakdown, terms] = await Promise.all([
          getCampaigns(googleAdsId as string, dateFrom, dateTo),
          getDailyPerformance(googleAdsId as string, dateFrom, dateTo),
          getConversionBreakdown(googleAdsId as string, dateFrom, dateTo, campaignFilter).catch(() => []),
          getSearchTerms(googleAdsId as string, dateFrom, dateTo, campaignFilter, 20).catch(() => []),
        ]);

        // Filter campaigns if project has specific IDs
        const filteredCampaigns = campaignFilter?.length
          ? allCampaigns.filter((c: any) => campaignFilter.includes(c.id))
          : allCampaigns;

        // Calculate metrics from filtered campaigns
        let impressions = 0, clicks = 0, spend = 0, conversions = 0, conversionsValue = 0;
        for (const c of filteredCampaigns) {
          impressions += c.metrics.impressions;
          clicks += c.metrics.clicks;
          spend += c.metrics.spend;
          conversions += c.metrics.conversions;
          conversionsValue += c.metrics.conversionsValue;
        }

        result.googleAds = {
          impressions,
          clicks,
          spend: +spend.toFixed(2),
          conversions: +conversions.toFixed(1),
          conversionsValue: +conversionsValue.toFixed(2),
          ctr: impressions > 0 ? +((clicks / impressions) * 100).toFixed(2) : 0,
          cpc: clicks > 0 ? +(spend / clicks).toFixed(2) : 0,
          conversionRate: clicks > 0 ? +((conversions / clicks) * 100).toFixed(2) : 0,
          roas: spend > 0 ? +(conversionsValue / spend).toFixed(2) : 0,
        };
        result.campaigns = filteredCampaigns;
        result.dailyPerformance = campaignFilter?.length ? null : daily;
        result.conversionBreakdown = convBreakdown;
        result.searchTerms = terms;
      } catch (err: any) {
        console.error('[KPI] Google Ads error:', err.message);
        result.googleAds = { error: err.message };
      }
    }

    // ─── Google Search Console data ───
    const gscSiteUrl = meta?.gscSiteUrl || project.client.gscSiteUrl;
    if (gscSiteUrl) {
      try {
        const [metrics, queries, pages, daily] = await Promise.all([
          getSiteMetrics(gscSiteUrl as string, dateFrom, dateTo),
          getTopQueries(gscSiteUrl as string, dateFrom, dateTo, 20),
          getTopPages(gscSiteUrl as string, dateFrom, dateTo, 15),
          getGSCDailyPerformance(gscSiteUrl as string, dateFrom, dateTo),
        ]);

        result.gsc = {
          clicks: metrics.clicks,
          impressions: metrics.impressions,
          ctr: +(metrics.ctr * 100).toFixed(2),
          position: +metrics.position.toFixed(1),
        };
        result.gscQueries = queries;
        result.gscPages = pages;
        result.gscDaily = daily;

        // Page↔Keyword cross-reference for SEO projects
        if (project.templateId === 'seo_project' || project.templateId === 'seo_programmatic') {
          try {
            result.pageKeywords = await getPageKeywords(gscSiteUrl as string, dateFrom, dateTo, 100);
          } catch (e) {
            console.warn('[KPI] PageKeywords error:', e);
          }
        }
      } catch (err: any) {
        console.error('[KPI] GSC error:', err.message);
        result.gsc = { error: err.message };
      }
    }

    // ─── PostHog data (HogQL-powered) ───
    const posthogProjectId = meta?.posthogProjectId;
    if (posthogProjectId && process.env.POSTHOG_PERSONAL_API_KEY) {
      try {
        const analytics = await getFullAnalytics(posthogProjectId as string, dateFrom, dateTo, project.templateId);
        result.posthog = analytics;
      } catch (err: any) {
        console.error('[KPI] PostHog error:', err.message);
        result.posthog = { error: err.message };
      }
    }

    // ─── Telnyx Call Tracking ───
    const telnyxPhones = meta?.telnyxPhoneNumbers;
    if (telnyxPhones && (Array.isArray(telnyxPhones) && telnyxPhones.length > 0) && process.env.TELNYX_API_KEY) {
      try {
        const calls = await getCallRecordings(telnyxPhones, dateFrom, dateTo);
        result.telnyx = calls;
      } catch (err: any) {
        console.error('[KPI] Telnyx error:', err.message);
        result.telnyx = { error: err.message };
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[KPI] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
