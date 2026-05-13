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

interface ProjectKPIData {
  projectId: string;
  projectName: string;
  clientName: string;
  dateRange: { from: string; to: string };
  googleAds: GoogleAdsMetrics | { error: string } | null;
  campaigns: Campaign[] | null;
  dailyPerformance: DailyData[] | null;
}

export function useProjectKPIs(projectId: string, dateFrom?: string, dateTo?: string) {
  const [data, setData] = useState<ProjectKPIData | null>(null);
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
