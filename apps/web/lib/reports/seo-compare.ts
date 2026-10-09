/**
 * Keyword-level comparison between two periods (Search Console queries).
 * Only queries present in the fetched top-N of each period can be compared,
 * so "new"/"lost" mean "entered/left the tracked top list".
 */

export interface QueryMetrics {
  query: string
  clicks: number
  impressions: number
  position: number
}

export type KeywordStatus = 'new' | 'lost' | 'up' | 'down' | 'same'

export interface KeywordComparisonRow {
  query: string
  clicks: number
  prevClicks: number | null
  impressions: number
  prevImpressions: number | null
  position: number | null
  prevPosition: number | null
  status: KeywordStatus
}

export interface KeywordComparisonSummary {
  keywords: { cur: number; prev: number }
  top3: { cur: number; prev: number }
  top10: { cur: number; prev: number }
  newCount: number
  lostCount: number
  improvedCount: number
  declinedCount: number
}

/** Position changes smaller than this are treated as noise */
const POSITION_EPSILON = 0.3

export function compareKeywords(cur: QueryMetrics[], prev: QueryMetrics[]): {
  rows: KeywordComparisonRow[]
  summary: KeywordComparisonSummary
} {
  const prevMap = new Map(prev.map(q => [q.query, q]))
  const curMap = new Map(cur.map(q => [q.query, q]))
  const rows: KeywordComparisonRow[] = []

  for (const q of cur) {
    const p = prevMap.get(q.query)
    let status: KeywordStatus = 'new'
    if (p) {
      const delta = q.position - p.position // negative = better
      status = delta < -POSITION_EPSILON ? 'up' : delta > POSITION_EPSILON ? 'down' : 'same'
    }
    rows.push({
      query: q.query,
      clicks: q.clicks,
      prevClicks: p ? p.clicks : null,
      impressions: q.impressions,
      prevImpressions: p ? p.impressions : null,
      position: q.position,
      prevPosition: p ? p.position : null,
      status,
    })
  }

  for (const p of prev) {
    if (curMap.has(p.query)) continue
    rows.push({
      query: p.query,
      clicks: 0,
      prevClicks: p.clicks,
      impressions: 0,
      prevImpressions: p.impressions,
      position: null,
      prevPosition: p.position,
      status: 'lost',
    })
  }

  rows.sort((a, b) => Math.max(b.clicks, b.prevClicks ?? 0) - Math.max(a.clicks, a.prevClicks ?? 0))

  const within = (list: QueryMetrics[], n: number) => list.filter(q => q.position > 0 && q.position <= n).length
  const count = (s: KeywordStatus) => rows.filter(r => r.status === s).length

  return {
    rows,
    summary: {
      keywords: { cur: cur.length, prev: prev.length },
      top3: { cur: within(cur, 3), prev: within(prev, 3) },
      top10: { cur: within(cur, 10), prev: within(prev, 10) },
      newCount: count('new'),
      lostCount: count('lost'),
      improvedCount: count('up'),
      declinedCount: count('down'),
    },
  }
}
