/**
 * Google PageSpeed Insights Integration
 * Uses the free PageSpeed Insights API v5
 * Docs: https://developers.google.com/speed/docs/insights/v5/get-started
 */

const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

// ─── Types ───

export interface CoreWebVitals {
  lcp: number   // Largest Contentful Paint (ms)
  fid: number   // First Input Delay (ms) — lab: TBT
  cls: number   // Cumulative Layout Shift
  fcp: number   // First Contentful Paint (ms)
  ttfb: number  // Time to First Byte (ms)
  si: number    // Speed Index (ms)
  tbt: number   // Total Blocking Time (ms)
}

export interface PageSpeedResult {
  domain: string
  url: string
  strategy: 'mobile' | 'desktop'
  performanceScore: number   // 0-100
  accessibilityScore: number // 0-100
  seoScore: number           // 0-100
  bestPracticesScore: number // 0-100
  vitals: CoreWebVitals
  fetchedAt: Date
  error?: string
}

// ─── API ───

/**
 * Run PageSpeed Insights for a single URL
 */
export async function runPageSpeed(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY || ''
  const domain = url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  const params = new URLSearchParams({
    url,
    strategy,
    category: 'performance',
    // Also request accessibility, SEO, best-practices
    ...(apiKey ? { key: apiKey } : {}),
  })

  // Add all categories
  const categories = ['performance', 'accessibility', 'seo', 'best-practices']
  const fullUrl = `${PSI_API}?url=${encodeURIComponent(url)}&strategy=${strategy}${
    categories.map(c => `&category=${c}`).join('')
  }${apiKey ? `&key=${apiKey}` : ''}`

  try {
    const res = await fetch(fullUrl, { signal: AbortSignal.timeout(60000) })

    if (!res.ok) {
      const errText = await res.text()
      return {
        domain,
        url,
        strategy,
        performanceScore: 0,
        accessibilityScore: 0,
        seoScore: 0,
        bestPracticesScore: 0,
        vitals: { lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0, si: 0, tbt: 0 },
        fetchedAt: new Date(),
        error: `API ${res.status}: ${errText.substring(0, 200)}`,
      }
    }

    const data = await res.json()
    const lighthouse = data.lighthouseResult
    const categories = lighthouse?.categories || {}
    const audits = lighthouse?.audits || {}

    // Extract Core Web Vitals from audits
    const vitals: CoreWebVitals = {
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      fid: audits['max-potential-fid']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      fcp: audits['first-contentful-paint']?.numericValue || 0,
      ttfb: audits['server-response-time']?.numericValue || 0,
      si: audits['speed-index']?.numericValue || 0,
      tbt: audits['total-blocking-time']?.numericValue || 0,
    }

    return {
      domain,
      url,
      strategy,
      performanceScore: Math.round((categories.performance?.score || 0) * 100),
      accessibilityScore: Math.round((categories.accessibility?.score || 0) * 100),
      seoScore: Math.round((categories.seo?.score || 0) * 100),
      bestPracticesScore: Math.round((categories['best-practices']?.score || 0) * 100),
      vitals,
      fetchedAt: new Date(),
    }
  } catch (err: any) {
    return {
      domain,
      url,
      strategy,
      performanceScore: 0,
      accessibilityScore: 0,
      seoScore: 0,
      bestPracticesScore: 0,
      vitals: { lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0, si: 0, tbt: 0 },
      fetchedAt: new Date(),
      error: err.message || 'Unknown error',
    }
  }
}

/**
 * Run PageSpeed for multiple domains (sequential to avoid rate limits)
 */
export async function runPageSpeedBatch(
  urls: string[],
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedResult[]> {
  const results: PageSpeedResult[] = []

  for (const url of urls) {
    const result = await runPageSpeed(url, strategy)
    results.push(result)
    // Small delay between requests to avoid rate limits
    await new Promise(r => setTimeout(r, 1000))
  }

  return results
}

// ─── Score Helpers ───

export function getScoreColor(score: number): 'green' | 'orange' | 'red' {
  if (score >= 90) return 'green'
  if (score >= 50) return 'orange'
  return 'red'
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Bun'
  if (score >= 50) return 'Mediu'
  return 'Slab'
}

export function getVitalStatus(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000],
    fid: [100, 300],
    cls: [0.1, 0.25],
    fcp: [1800, 3000],
    ttfb: [800, 1800],
    tbt: [200, 600],
    si: [3400, 5800],
  }

  const [good, poor] = thresholds[metric] || [0, 0]
  if (value <= good) return 'good'
  if (value <= poor) return 'needs-improvement'
  return 'poor'
}
