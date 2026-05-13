/**
 * PostHog Integration for Agency OS
 * Uses Personal API Key + HogQL queries for deep analytics
 */

const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://eu.posthog.com';
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY || '';

async function phFetch(projectId: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${POSTHOG_HOST}/api/projects/${projectId}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${POSTHOG_API_KEY}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PostHog API ${res.status}: ${txt.substring(0, 200)}`);
  }

  return res.json();
}

/**
 * Execute a HogQL query against PostHog
 */
async function hogql(projectId: string, query: string): Promise<any[]> {
  const res = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HogQL ${res.status}: ${txt.substring(0, 200)}`);
  }

  const data = await res.json();
  return data.results || [];
}

// ─── Types ───

export interface PostHogSessionStats {
  totalSessions: number;
  avgDuration: number;
  totalPageviews: number;
  recentSessions: Array<{
    id: string;
    startUrl: string;
    duration: number;
    clicks: number;
    keypresses: number;
    startTime: string;
  }>;
}

export interface PostHogHealthMetrics {
  exceptions: number;
  rageClicks: number;
  deadClicks: number;
  healthScore: number;  // 0-100
  topErrorPages: Array<{ page: string; count: number }>;
}

export interface PostHogWebVitals {
  lcp: number;  // ms
  cls: number;
  inp: number;  // ms
  fcp: number;  // ms
  lcpStatus: 'good' | 'needs-improvement' | 'poor';
  clsStatus: 'good' | 'needs-improvement' | 'poor';
  inpStatus: 'good' | 'needs-improvement' | 'poor';
  fcpStatus: 'good' | 'needs-improvement' | 'poor';
}

export interface PostHogTrafficBySource {
  source: string;
  medium: string;
  pageviews: number;
  uniqueUsers: number;
}

export interface PostHogFullAnalytics {
  sessions: PostHogSessionStats;
  health: PostHogHealthMetrics;
  webVitals: PostHogWebVitals | null;
  trafficBySource: PostHogTrafficBySource[];
  topPages: Array<{ page: string; views: number; users: number }>;
}

// ─── Session Recordings (existing API) ───

export async function getSessionStats(
  projectId: string,
  dateFrom: string,
  dateTo: string
): Promise<PostHogSessionStats> {
  if (!POSTHOG_API_KEY) throw new Error('POSTHOG_PERSONAL_API_KEY not set');

  const data = await phFetch(projectId, '/session_recordings/', {
    date_from: dateFrom,
    date_to: dateTo,
    limit: '100',
  });

  const recordings = data.results || [];
  const totalSessions = recordings.length;
  const totalDuration = recordings.reduce((sum: number, r: any) => sum + (r.recording_duration || 0), 0);

  return {
    totalSessions,
    avgDuration: totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0,
    totalPageviews: 0,
    recentSessions: recordings.slice(0, 5).map((r: any) => ({
      id: r.id,
      startUrl: r.start_url || '',
      duration: Math.round(r.recording_duration || 0),
      clicks: r.click_count || 0,
      keypresses: r.keypress_count || 0,
      startTime: r.start_time,
    })),
  };
}

// ─── HogQL-powered Analytics ───

/**
 * Get technical health metrics: exceptions, rage clicks, dead clicks
 */
export async function getHealthMetrics(
  projectId: string,
  dateFrom: string,
  dateTo: string
): Promise<PostHogHealthMetrics> {
  const [exceptionsR, rageR, deadR, pagesR, sessionsR] = await Promise.all([
    hogql(projectId, `SELECT count() as total FROM events WHERE event = '$exception' AND timestamp >= '${dateFrom}' AND timestamp <= '${dateTo} 23:59:59'`),
    hogql(projectId, `SELECT count() as total FROM events WHERE event = '$rageclick' AND timestamp >= '${dateFrom}' AND timestamp <= '${dateTo} 23:59:59'`),
    hogql(projectId, `SELECT count() as total FROM events WHERE event = '$dead_click' AND timestamp >= '${dateFrom}' AND timestamp <= '${dateTo} 23:59:59'`),
    hogql(projectId, `SELECT properties.$current_url as page, count() as error_count FROM events WHERE event IN ('$exception', '$rageclick') AND timestamp >= '${dateFrom}' AND timestamp <= '${dateTo} 23:59:59' GROUP BY page ORDER BY error_count DESC LIMIT 5`),
    hogql(projectId, `SELECT uniq(properties.$session_id) as sessions FROM events WHERE event = '$pageview' AND timestamp >= '${dateFrom}' AND timestamp <= '${dateTo} 23:59:59'`),
  ]);

  const exceptions = exceptionsR[0]?.[0] || 0;
  const rageClicks = rageR[0]?.[0] || 0;
  const deadClicks = deadR[0]?.[0] || 0;
  const totalSessions = sessionsR[0]?.[0] || 1;

  // Calculate health score (0-100)
  let score = 100;
  const excPerSession = exceptions / totalSessions;
  const ragePerSession = rageClicks / totalSessions;
  score -= Math.min(excPerSession * 100, 40);
  score -= Math.min(ragePerSession * 50, 30);
  score = Math.max(0, Math.round(score));

  return {
    exceptions,
    rageClicks,
    deadClicks,
    healthScore: score,
    topErrorPages: pagesR.map((r: any) => ({ page: r[0] || '', count: r[1] || 0 })),
  };
}

/**
 * Get Core Web Vitals with traffic-light scoring
 */
export async function getWebVitals(
  projectId: string,
  dateFrom: string,
  dateTo: string
): Promise<PostHogWebVitals | null> {
  const rows = await hogql(projectId, 
    `SELECT avg(toFloat(properties.$web_vitals_LCP_value)) as lcp, avg(toFloat(properties.$web_vitals_CLS_value)) as cls, avg(toFloat(properties.$web_vitals_INP_value)) as inp, avg(toFloat(properties.$web_vitals_FCP_value)) as fcp FROM events WHERE event = '$web_vitals' AND timestamp >= '${dateFrom}' AND timestamp <= '${dateTo} 23:59:59'`
  );

  if (!rows.length || rows[0][0] === null) return null;

  const [lcp, cls, inp, fcp] = rows[0];

  const lcpVal = Math.round(lcp || 0);
  const clsVal = Number((cls || 0).toFixed(3));
  const inpVal = Math.round(inp || 0);
  const fcpVal = Math.round(fcp || 0);

  return {
    lcp: lcpVal,
    cls: clsVal,
    inp: inpVal,
    fcp: fcpVal,
    lcpStatus: lcpVal < 2500 ? 'good' : lcpVal < 4000 ? 'needs-improvement' : 'poor',
    clsStatus: clsVal < 0.1 ? 'good' : clsVal < 0.25 ? 'needs-improvement' : 'poor',
    inpStatus: inpVal < 200 ? 'good' : inpVal < 500 ? 'needs-improvement' : 'poor',
    fcpStatus: fcpVal < 1800 ? 'good' : fcpVal < 3000 ? 'needs-improvement' : 'poor',
  };
}

/**
 * Get traffic breakdown by UTM source/medium
 */
export async function getTrafficBySource(
  projectId: string,
  dateFrom: string,
  dateTo: string
): Promise<PostHogTrafficBySource[]> {
  const rows = await hogql(projectId,
    `SELECT properties.utm_source as source, properties.utm_medium as medium, count() as pv, uniq(distinct_id) as users FROM events WHERE event = '$pageview' AND timestamp >= '${dateFrom}' AND timestamp <= '${dateTo} 23:59:59' GROUP BY source, medium ORDER BY pv DESC LIMIT 10`
  );

  return rows.map((r: any) => ({
    source: r[0] || '(direct)',
    medium: r[1] || '(none)',
    pageviews: r[2] || 0,
    uniqueUsers: r[3] || 0,
  }));
}

/**
 * Get top pages by traffic
 */
export async function getTopPages(
  projectId: string,
  dateFrom: string,
  dateTo: string
): Promise<Array<{ page: string; views: number; users: number }>> {
  const rows = await hogql(projectId,
    `SELECT properties.$current_url as page, count() as views, uniq(distinct_id) as users FROM events WHERE event = '$pageview' AND timestamp >= '${dateFrom}' AND timestamp <= '${dateTo} 23:59:59' GROUP BY page ORDER BY views DESC LIMIT 10`
  );

  return rows.map((r: any) => ({
    page: r[0] || '',
    views: r[1] || 0,
    users: r[2] || 0,
  }));
}

/**
 * Get full analytics bundle (all metrics in one call)
 * projectType controls which metrics are included:
 * - 'web_dev_project' / 'mentenanta': full health + web vitals + traffic
 * - 'ads_campaign': sessions, traffic by source (CPC focus), top pages
 * - 'seo_project' / 'seo_programmatic': sessions, traffic by source (organic), top pages
 * - default: everything
 */
export async function getFullAnalytics(
  projectId: string,
  dateFrom: string,
  dateTo: string,
  projectType?: string
): Promise<PostHogFullAnalytics> {
  const isWebsite = projectType === 'web_dev_project' || projectType === 'mentenanta';
  const isAds = projectType === 'ads_campaign';
  const isSeo = projectType === 'seo_project' || projectType === 'seo_programmatic';

  // Always fetch sessions and traffic
  const sessionsP = getSessionStats(projectId, dateFrom, dateTo);
  const trafficP = getTrafficBySource(projectId, dateFrom, dateTo).catch(() => []);
  const topPagesP = getTopPages(projectId, dateFrom, dateTo).catch(() => []);

  // Health + Web Vitals only for website/mentenanta or when no type specified
  const healthP = (!projectType || isWebsite)
    ? getHealthMetrics(projectId, dateFrom, dateTo).catch(() => ({
        exceptions: 0, rageClicks: 0, deadClicks: 0, healthScore: -1, topErrorPages: [] as Array<{ page: string; count: number }>,
      }))
    : Promise.resolve({ exceptions: 0, rageClicks: 0, deadClicks: 0, healthScore: -1, topErrorPages: [] as Array<{ page: string; count: number }> });

  const webVitalsP = (!projectType || isWebsite)
    ? getWebVitals(projectId, dateFrom, dateTo).catch(() => null)
    : Promise.resolve(null);

  const [sessions, health, webVitals, trafficBySource, topPages] = await Promise.all([
    sessionsP, healthP, webVitalsP, trafficP, topPagesP,
  ]);

  return { sessions, health, webVitals, trafficBySource, topPages };
}
