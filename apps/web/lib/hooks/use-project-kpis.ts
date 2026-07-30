'use client';

import { useState, useEffect, useCallback } from 'react';

interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  roas: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  channelType: string;
  budget: number;
  metrics: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    conversionsValue: number;
    ctr: number;
    cpc: number;
    conversionRate: number;
    roas: number;
  };
}

interface DailyData {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionsValue: number;
}

interface GSCMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCDaily {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface ProjectKPIs {
  projectId: string;
  projectName: string;
  clientName: string;
  templateId: string;
  dateRange: { from: string; to: string };
  googleAds: GoogleAdsMetrics | { error: string } | null;
  campaigns: Campaign[] | null;
  dailyPerformance: DailyData[] | null;
  conversionBreakdown: Array<{ actionName: string; category: string; conversions: number; allConversions: number; value: number; campaigns: string[] }> | null;
  searchTerms: Array<{ term: string; campaign: string; clicks: number; impressions: number; cost: number; conversions: number; ctr: number; cpc: number }> | null;
  gsc: GSCMetrics | { error: string } | null;
  gscQueries: GSCQuery[] | null;
  gscPages: GSCPage[] | null;
  gscDaily: GSCDaily[] | null;
  posthog: {
    sessions: { totalSessions: number; avgDuration: number; totalPageviews: number; recentSessions: Array<{ id: string; startUrl: string; duration: number; clicks: number; keypresses: number; startTime: string }> };
    health: { exceptions: number; rageClicks: number; deadClicks: number; healthScore: number; topErrorPages: Array<{ page: string; count: number }> };
    webVitals: { lcp: number; cls: number; inp: number; fcp: number; lcpStatus: string; clsStatus: string; inpStatus: string; fcpStatus: string } | null;
    trafficBySource: Array<{ source: string; medium: string; pageviews: number; uniqueUsers: number }>;
    topPages: Array<{ page: string; views: number; users: number }>;
  } | { error: string } | null;
  telnyx: { totalCalls: number; avgDuration: number; totalDuration: number; calls: Array<{ id: string; from: string; to: string; duration: number; createdAt: string; downloadUrl: string | null }> } | { error: string } | null;
  // Conversion tracking (detailed)
  landingPageConversions: Array<{ landingPage: string; totalConversions: number; totalValue: number; topActions: Array<{ name: string; count: number }> }> | null;
  formSubmissions: Array<{ pageUrl: string; formId: string; formType: string; count: number }> | null;
  conversionsByPage: Array<{ pageUrl: string; totalConversions: number; formSubmissions: number; phoneClicks: number; emailClicks: number }> | null;
  // SEO
  pageKeywords: any[] | null;
  // Backlinks
  backlinksSummary: any | null;
  backlinksPages: any[] | null;
  backlinksDetail: any[] | null;
}

export function useProjectKPIs(projectId: string, dateFrom?: string, dateTo?: string) {
  const [data, setData] = useState<ProjectKPIs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/projects/${projectId}/kpis?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, dateFrom, dateTo]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  return { data, loading, error, refresh: fetchKPIs };
}
