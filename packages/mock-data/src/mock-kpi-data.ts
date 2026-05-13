import type { KPIValue, TimeseriesPoint, KeywordData, CampaignData } from './types'

// ─── Mock KPI Data per Project Type ───

const seoKPIs: KPIValue[] = [
  { metric: 'clicks', label: 'Clicks Organice', value: 12450, previousValue: 10122, change: 23, direction: 'up', unit: 'clicks', source: 'gsc' },
  { metric: 'impressions', label: 'Impresii', value: 342100, previousValue: 297478, change: 15, direction: 'up', unit: 'imp', source: 'gsc' },
  { metric: 'ctr', label: 'CTR', value: 3.64, previousValue: 3.4, change: 0.8, direction: 'up', unit: '%', source: 'gsc' },
  { metric: 'position', label: 'Poziție Medie', value: 18.2, previousValue: 20.5, change: -2.3, direction: 'down', unit: 'pos', source: 'gsc' },
  { metric: 'sessions', label: 'Sessions', value: 8920, previousValue: 7559, change: 18, direction: 'up', unit: 'sessions', source: 'ga4' },
  { metric: 'bounce_rate', label: 'Bounce Rate', value: 42.3, previousValue: 47.3, change: -5, direction: 'down', unit: '%', source: 'ga4' },
  { metric: 'conversions', label: 'Conversii Organice', value: 127, previousValue: 95, change: 34, direction: 'up', unit: 'conv', source: 'ga4' },
]

const adsKPIs: KPIValue[] = [
  { metric: 'cost', label: 'Spend', value: 4250, previousValue: 3800, change: 12, direction: 'up', unit: '€', source: 'google_ads' },
  { metric: 'clicks', label: 'Clicks', value: 8920, previousValue: 7650, change: 17, direction: 'up', unit: 'clicks', source: 'google_ads' },
  { metric: 'conversions', label: 'Conversii', value: 342, previousValue: 285, change: 20, direction: 'up', unit: 'conv', source: 'google_ads' },
  { metric: 'roas', label: 'ROAS', value: 4.2, previousValue: 3.8, change: 10.5, direction: 'up', unit: 'x', source: 'google_ads' },
  { metric: 'cpc', label: 'CPC Mediu', value: 0.48, previousValue: 0.50, change: -4, direction: 'down', unit: '€', source: 'google_ads' },
  { metric: 'ctr', label: 'CTR', value: 5.8, previousValue: 5.2, change: 11.5, direction: 'up', unit: '%', source: 'google_ads' },
]

const webdevKPIs: KPIValue[] = [
  { metric: 'lcp', label: 'LCP', value: 1.8, previousValue: 2.4, change: -25, direction: 'down', unit: 's', source: 'posthog' },
  { metric: 'fid', label: 'FID', value: 45, previousValue: 120, change: -62.5, direction: 'down', unit: 'ms', source: 'posthog' },
  { metric: 'cls', label: 'CLS', value: 0.05, previousValue: 0.12, change: -58, direction: 'down', unit: 'score', source: 'posthog' },
  { metric: 'sessions', label: 'Sessions', value: 3420, previousValue: 0, change: 100, direction: 'up', unit: 'sessions', source: 'ga4' },
]

const linkedinKPIs: KPIValue[] = [
  { metric: 'spend', label: 'Spend', value: 2100, previousValue: 1800, change: 17, direction: 'up', unit: '€', source: 'linkedin_ads' },
  { metric: 'leads', label: 'Leads', value: 48, previousValue: 32, change: 50, direction: 'up', unit: 'leads', source: 'linkedin_ads' },
  { metric: 'cpl', label: 'Cost/Lead', value: 43.75, previousValue: 56.25, change: -22, direction: 'down', unit: '€', source: 'linkedin_ads' },
  { metric: 'impressions', label: 'Impresii', value: 125000, previousValue: 98000, change: 27.5, direction: 'up', unit: 'imp', source: 'linkedin_ads' },
  { metric: 'ctr', label: 'CTR', value: 1.2, previousValue: 0.9, change: 33, direction: 'up', unit: '%', source: 'linkedin_ads' },
  { metric: 'engagement_rate', label: 'Engagement', value: 3.8, previousValue: 3.1, change: 22.5, direction: 'up', unit: '%', source: 'linkedin_ads' },
]

const instagramKPIs: KPIValue[] = [
  { metric: 'spend', label: 'Spend', value: 1500, previousValue: 1200, change: 25, direction: 'up', unit: '€', source: 'meta_ads' },
  { metric: 'reach', label: 'Reach', value: 85000, previousValue: 62000, change: 37, direction: 'up', unit: 'people', source: 'instagram' },
  { metric: 'engagement_rate', label: 'Engagement', value: 4.5, previousValue: 3.8, change: 18, direction: 'up', unit: '%', source: 'instagram' },
  { metric: 'followers_growth', label: 'Followers +', value: 420, previousValue: 280, change: 50, direction: 'up', unit: 'followers', source: 'instagram' },
]

const facebookKPIs: KPIValue[] = [
  { metric: 'spend', label: 'Spend', value: 3200, previousValue: 2800, change: 14, direction: 'up', unit: '€', source: 'meta_ads' },
  { metric: 'leads', label: 'Leads', value: 120, previousValue: 95, change: 26, direction: 'up', unit: 'leads', source: 'meta_ads' },
  { metric: 'cpl', label: 'Cost/Lead', value: 26.67, previousValue: 29.47, change: -9.5, direction: 'down', unit: '€', source: 'meta_ads' },
  { metric: 'roas', label: 'ROAS', value: 3.8, previousValue: 3.2, change: 18.75, direction: 'up', unit: 'x', source: 'meta_ads' },
]

const tiktokKPIs: KPIValue[] = [
  { metric: 'spend', label: 'Spend', value: 800, previousValue: 600, change: 33, direction: 'up', unit: '€', source: 'tiktok_ads' },
  { metric: 'video_views', label: 'Video Views', value: 450000, previousValue: 280000, change: 60.7, direction: 'up', unit: 'views', source: 'tiktok_ads' },
  { metric: 'engagement_rate', label: 'Engagement', value: 6.2, previousValue: 5.1, change: 21.5, direction: 'up', unit: '%', source: 'tiktok_ads' },
  { metric: 'cpc', label: 'CPC', value: 0.22, previousValue: 0.28, change: -21, direction: 'down', unit: '€', source: 'tiktok_ads' },
]

// Map template ID → KPIs
const kpiByTemplate: Record<string, KPIValue[]> = {
  seo_project: seoKPIs,
  seo_programmatic: seoKPIs,
  ads_campaign: adsKPIs,
  webdev_project: webdevKPIs,
  linkedin_campaign: linkedinKPIs,
  instagram_campaign: instagramKPIs,
  facebook_campaign: facebookKPIs,
  tiktok_campaign: tiktokKPIs,
}

// ─── Timeseries Data (6 months) ───

function generateTimeseries(baseValue: number, months: number = 6, trend: 'up' | 'down' | 'stable' = 'up'): TimeseriesPoint[] {
  const points: TimeseriesPoint[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const factor = trend === 'up' ? 1 + (months - i) * 0.04 : trend === 'down' ? 1 - (months - i) * 0.02 : 1
    const noise = 0.9 + Math.random() * 0.2 // ±10% noise
    points.push({
      date: date.toISOString().slice(0, 7), // "2026-01"
      value: Math.round(baseValue * factor * noise),
    })
  }
  return points
}

const timeseriesByTemplate: Record<string, TimeseriesPoint[]> = {
  seo_project: generateTimeseries(8000, 6, 'up'),
  ads_campaign: generateTimeseries(250, 6, 'up'),       // conversions
  webdev_project: generateTimeseries(2000, 6, 'up'),     // sessions post-launch
  linkedin_campaign: generateTimeseries(25, 6, 'up'),    // leads
  instagram_campaign: generateTimeseries(50000, 6, 'up'), // reach
  facebook_campaign: generateTimeseries(80, 6, 'up'),    // leads
  tiktok_campaign: generateTimeseries(200000, 6, 'up'),  // views
}

// ─── Mock Keyword Data (SEO) ───

const mockKeywords: KeywordData[] = [
  { keyword: 'audit iso 9001', position: 8.2, previousPosition: 11, clicks: 234, impressions: 4500, ctr: 5.2, trend: 'up' },
  { keyword: 'certificare iso', position: 12.1, previousPosition: 17, clicks: 89, impressions: 8200, ctr: 1.1, trend: 'up' },
  { keyword: 'quality control romania', position: 1.0, previousPosition: 1, clicks: 1200, impressions: 2100, ctr: 57.1, trend: 'stable' },
  { keyword: 'consultanta calitate', position: 5.3, previousPosition: 8, clicks: 156, impressions: 3400, ctr: 4.6, trend: 'up' },
  { keyword: 'implementare iso 14001', position: 15.8, previousPosition: 22, clicks: 45, impressions: 2800, ctr: 1.6, trend: 'up' },
  { keyword: 'standard iso 45001', position: 6.2, previousPosition: 9, clicks: 198, impressions: 5100, ctr: 3.9, trend: 'up' },
  { keyword: 'audit intern calitate', position: 3.4, previousPosition: 4, clicks: 320, impressions: 4200, ctr: 7.6, trend: 'up' },
  { keyword: 'certificare ohsas', position: 22.5, previousPosition: 28, clicks: 18, impressions: 1500, ctr: 1.2, trend: 'up' },
  { keyword: 'iso 27001 romania', position: 9.8, previousPosition: 14, clicks: 67, impressions: 2900, ctr: 2.3, trend: 'up' },
  { keyword: 'management calitate', position: 4.1, previousPosition: 5, clicks: 410, impressions: 6800, ctr: 6.0, trend: 'up' },
  { keyword: 'training iso', position: 11.5, previousPosition: 15, clicks: 78, impressions: 3200, ctr: 2.4, trend: 'up' },
  { keyword: 'gdpr audit', position: 18.3, previousPosition: 25, clicks: 32, impressions: 4100, ctr: 0.8, trend: 'up' },
  { keyword: 'sistem management integrat', position: 7.6, previousPosition: 10, clicks: 145, impressions: 2600, ctr: 5.6, trend: 'up' },
  { keyword: 'certificare ce', position: 14.2, previousPosition: 18, clicks: 56, impressions: 3800, ctr: 1.5, trend: 'up' },
  { keyword: 'consultanta gdpr', position: 2.3, previousPosition: 3, clicks: 520, impressions: 7200, ctr: 7.2, trend: 'up' },
  { keyword: 'evaluare conformitate', position: 19.4, previousPosition: 24, clicks: 28, impressions: 1900, ctr: 1.5, trend: 'up' },
  { keyword: 'organism certificare', position: 6.8, previousPosition: 8, clicks: 180, impressions: 4500, ctr: 4.0, trend: 'up' },
  { keyword: 'documentatie iso', position: 10.2, previousPosition: 12, clicks: 95, impressions: 3100, ctr: 3.1, trend: 'up' },
  { keyword: 'audit extern', position: 8.9, previousPosition: 11, clicks: 110, impressions: 2700, ctr: 4.1, trend: 'up' },
  { keyword: 'certificat calitate', position: 3.7, previousPosition: 5, clicks: 380, impressions: 5900, ctr: 6.4, trend: 'up' },
]

// ─── Mock Campaign Data (Ads) ───

const mockCampaigns: CampaignData[] = [
  { name: 'Brand - Exact Match', spend: 450, clicks: 2100, impressions: 12000, conversions: 85, ctr: 17.5, cpc: 0.21, roas: 8.2, status: 'active' },
  { name: 'SEO Services - Broad', spend: 1200, clicks: 3200, impressions: 45000, conversions: 120, ctr: 7.1, cpc: 0.38, roas: 4.5, status: 'active' },
  { name: 'ISO Certification - Phrase', spend: 890, clicks: 1800, impressions: 28000, conversions: 72, ctr: 6.4, cpc: 0.49, roas: 3.8, status: 'active' },
  { name: 'Consultanță - Display', spend: 320, clicks: 4500, impressions: 125000, conversions: 18, ctr: 3.6, cpc: 0.07, roas: 2.1, status: 'active' },
  { name: 'Remarketing - All', spend: 280, clicks: 890, impressions: 18000, conversions: 42, ctr: 4.9, cpc: 0.31, roas: 6.8, status: 'active' },
  { name: 'GDPR Services', spend: 650, clicks: 1400, impressions: 22000, conversions: 38, ctr: 6.4, cpc: 0.46, roas: 3.2, status: 'paused' },
  { name: 'Training ISO - Video', spend: 180, clicks: 2200, impressions: 85000, conversions: 12, ctr: 2.6, cpc: 0.08, roas: 1.8, status: 'active' },
]

// ─── Public API ───

/** Get KPI values for a project based on its template type */
export function getProjectKpis(templateId: string): KPIValue[] {
  return kpiByTemplate[templateId] || seoKPIs
}

/** Get timeseries data for a project's main metric */
export function getProjectTimeseries(templateId: string): TimeseriesPoint[] {
  return timeseriesByTemplate[templateId] || generateTimeseries(5000)
}

/** Get keyword ranking data (SEO projects only) */
export function getProjectKeywords(): KeywordData[] {
  return mockKeywords
}

/** Get campaign performance data (Ads projects only) */
export function getProjectCampaigns(): CampaignData[] {
  return mockCampaigns
}

/** Get position distribution for SEO */
export function getPositionDistribution(): { range: string; count: number; color: string }[] {
  return [
    { range: 'Top 3', count: 15, color: '#22c55e' },
    { range: 'Top 10', count: 42, color: '#3b82f6' },
    { range: 'Top 20', count: 89, color: '#f59e0b' },
    { range: 'Top 50', count: 156, color: '#6b7280' },
    { range: '50+', count: 64, color: '#ef4444' },
  ]
}
