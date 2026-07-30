/**
 * DataForSEO Labs API Integration
 */

export interface DFSOKeywordData {
  keyword: string
  search_volume: number
  cpc: number
  competition: number
  keyword_difficulty: number
  search_intent: string[]
}

function getAuthHeader() {
  const token = process.env.DATAFORSEO_AUTH_TOKEN
  if (!token) return {}
  return {
    'Authorization': `Basic ${token}`,
    'Content-Type': 'application/json'
  }
}

// v3/dataforseo_labs/google/search_volume/live
export async function getKeywordMetrics(keywords: string[], locationCode: number = 2642, languageCode: string = 'ro'): Promise<DFSOKeywordData[]> {
  try {
    const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/historical_search_volume/live', {
      method: 'POST',
      headers: getAuthHeader() as any,
      body: JSON.stringify([{
        location_code: locationCode,
        language_code: languageCode,
        keywords: keywords.slice(0, 1000) // max 1000 per request
      }])
    })

    if (!res.ok) {
      throw new Error(`DataForSEO API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    const results = data.tasks?.[0]?.result?.[0]?.items || []
    
    return results.map((item: any) => ({
      keyword: item.keyword,
      search_volume: item.keyword_info?.search_volume || 0,
      cpc: item.keyword_info?.cpc || 0,
      competition: item.keyword_info?.competition || 0,
      keyword_difficulty: item.keyword_properties?.keyword_difficulty || 0,
      search_intent: item.keyword_properties?.search_intent || []
    }))
  } catch (error: any) {
    console.error('[DataForSEO] getKeywordMetrics error:', error)
    return []
  }
}

// v3/dataforseo_labs/google/ranked_keywords/live
export async function getCompetitorKeywords(domain: string, locationCode: number = 2642, languageCode: string = 'ro'): Promise<DFSOKeywordData[]> {
  try {
    const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
      method: 'POST',
      headers: getAuthHeader() as any,
      body: JSON.stringify([{
        target: domain,
        location_code: locationCode,
        language_code: languageCode,
        limit: 50
      }])
    })

    if (!res.ok) {
      throw new Error(`DataForSEO API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    const results = data.tasks?.[0]?.result?.[0]?.items || []
    
    return results.map((item: any) => ({
      keyword: item.keyword_data?.keyword,
      search_volume: item.keyword_data?.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || 0,
      competition: item.keyword_data?.keyword_info?.competition || 0,
      keyword_difficulty: item.keyword_data?.keyword_info?.keyword_difficulty || 0,
      search_intent: item.keyword_data?.keyword_properties?.search_intent || []
    }))
  } catch (error: any) {
    console.error('[DataForSEO] getCompetitorKeywords error:', error)
    return []
  }
}

// v3/dataforseo_labs/google/related_keywords/live
export async function getRelatedKeywords(keyword: string, locationCode: number = 2642, languageCode: string = 'ro'): Promise<DFSOKeywordData[]> {
  try {
    const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live', {
      method: 'POST',
      headers: getAuthHeader() as any,
      body: JSON.stringify([{
        keyword: keyword,
        location_code: locationCode,
        language_code: languageCode,
        limit: 50
      }])
    })

    if (!res.ok) {
      throw new Error(`DataForSEO API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    const results = data.tasks?.[0]?.result?.[0]?.items || []
    
    return results.map((item: any) => ({
      keyword: item.keyword_data?.keyword || item.keyword,
      search_volume: item.keyword_data?.keyword_info?.search_volume || item.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || item.keyword_info?.cpc || 0,
      competition: item.keyword_data?.keyword_info?.competition || item.keyword_info?.competition || 0,
      keyword_difficulty: item.keyword_data?.keyword_info?.keyword_difficulty || item.keyword_info?.keyword_difficulty || 0,
      search_intent: item.keyword_data?.keyword_properties?.search_intent || item.keyword_properties?.search_intent || []
    }))
  } catch (error: any) {
    console.error('[DataForSEO] getRelatedKeywords error:', error)
    return []
  }
}

// v3/dataforseo_labs/google/competitors_domain/live
export async function getCompetitorsDomain(domain: string, locationCode: number = 2642, languageCode: string = 'ro'): Promise<string[]> {
  try {
    const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live', {
      method: 'POST',
      headers: getAuthHeader() as any,
      body: JSON.stringify([{
        target: domain,
        location_code: locationCode,
        language_code: languageCode,
        limit: 10
      }])
    })

    if (!res.ok) {
      throw new Error(`DataForSEO API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    const results = data.tasks?.[0]?.result?.[0]?.items || []
    
    return results.map((item: any) => item.domain).filter(Boolean)
  } catch (error: any) {
    console.error('[DataForSEO] getCompetitorsDomain error:', error)
    return []
  }
}

// v3/serp/google/organic/live/advanced
export async function getSerpDomains(keyword: string, locationCode: number = 2642, languageCode: string = 'ro'): Promise<{domain: string, url: string, title: string, description: string, rank: number, wordCount?: number}[]> {
  try {
    const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: getAuthHeader() as any,
      body: JSON.stringify([{
        keyword: keyword,
        location_code: locationCode,
        language_code: languageCode,
        depth: 20
      }])
    })

    if (!res.ok) {
      throw new Error(`DataForSEO API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    const items = data.tasks?.[0]?.result?.[0]?.items || []
    
    // Extract unique domains and their URLs from organic results
    const baseResults: {domain: string, url: string, title: string, description: string, rank: number}[] = []
    const seenDomains = new Set<string>()

    for (const item of items) {
      if (item.type === 'organic' && item.domain && item.url) {
        const cleanDomain = item.domain.replace(/^www\./, '')
        if (!seenDomains.has(cleanDomain)) {
          seenDomains.add(cleanDomain)
          baseResults.push({ 
            domain: cleanDomain, 
            url: item.url,
            title: item.title || '',
            description: item.description || '',
            rank: item.rank_group || item.rank_absolute || 0
          })
        }
      }
    }
    
    const top10 = baseResults.slice(0, 10)
    
    // Attempt to scrape word count for each URL in parallel with a timeout
    const cheerio = await import('cheerio')
    const resultsWithWordCount = await Promise.all(
      top10.map(async (resItem) => {
        let wordCount = 0
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout
          
          const htmlRes = await fetch(resItem.url.startsWith('http') ? resItem.url : `https://${resItem.url}`, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          })
          clearTimeout(timeoutId)
          
          if (htmlRes.ok) {
            const html = await htmlRes.text()
            const $ = cheerio.load(html)
            $('script, style, noscript, iframe, img, svg').remove()
            const text = $('body').text() || ''
            wordCount = text.split(/\s+/).filter(word => word.trim().length > 0).length
          }
        } catch (err) {
          // Ignore fetch errors (timeout, blocked, etc.)
        }
        
        return {
          ...resItem,
          wordCount
        }
      })
    )

    return resultsWithWordCount
  } catch (error: any) {
    console.error('[DataForSEO] getSerpDomains error:', error)
    return []
  }
}

// -----------------------------------------------------------------
// BACKLINKS API
// -----------------------------------------------------------------

export interface DFSOBacklinksSummary {
  target: string
  backlinks: number
  referring_domains: number
  referring_pages: number
  rank: number
}

export interface DFSOPageBacklinks {
  url: string
  backlinks: number
  referring_domains: number
  rank: number
}

export interface DFSOBacklinkDetail {
  url_from: string
  url_to: string
  domain_from: string
  anchor: string
  rank: number
  domain_from_rank: number
  page_to_status_code: number
}

export async function getDomainBacklinksSummary(target: string): Promise<DFSOBacklinksSummary | null> {
  try {
    const res = await fetch('https://api.dataforseo.com/v3/backlinks/summary/live', {
      method: 'POST',
      headers: getAuthHeader() as any,
      body: JSON.stringify([{ target, limit: 1 }])
    })
    if (!res.ok) throw new Error(`DataForSEO API error: ${res.status}`)
    const data = await res.json()
    const item = data.tasks?.[0]?.result?.[0]
    if (!item) return null
    return {
      target: item.target,
      backlinks: item.backlinks || 0,
      referring_domains: item.referring_domains || 0,
      referring_pages: item.referring_pages || 0,
      rank: item.rank || 0
    }
  } catch (error) {
    console.error('[DataForSEO] getDomainBacklinksSummary error:', error)
    return null
  }
}

export async function getDomainPagesBacklinks(target: string, limit: number = 100): Promise<DFSOPageBacklinks[]> {
  try {
    // Some accounts do not have access to domain_pages/live, so we use backlinks/live and aggregate
    const res = await fetch('https://api.dataforseo.com/v3/backlinks/backlinks/live', {
      method: 'POST',
      headers: getAuthHeader() as any,
      body: JSON.stringify([{ target, limit, order_by: ['rank,desc'] }])
    })
    if (!res.ok) {
      if (res.status === 402) {
        throw new Error("Fonduri insuficiente în contul DataForSEO (Payment Required).")
      }
      throw new Error(`DataForSEO API error: ${res.status}`)
    }
    const data = await res.json()
    const task = data.tasks?.[0]
    if (task && task.status_code >= 40000) {
      if (task.status_code === 40200) {
        throw new Error("Fonduri insuficiente în contul DataForSEO (Payment Required).")
      }
      throw new Error(`DataForSEO Task Error: ${task.status_message}`)
    }
    
    const items = task?.result?.[0]?.items || []
    const pagesMap = new Map<string, DFSOPageBacklinks>()
    
    items.forEach((item: any) => {
      if (!item.url_to) return
      
      const existing = pagesMap.get(item.url_to)
      if (existing) {
        existing.backlinks++
        existing.referring_domains++
      } else {
        pagesMap.set(item.url_to, {
          url: item.url_to,
          backlinks: 1,
          referring_domains: 1,
          rank: item.rank || 0
        })
      }
    })
    
    return Array.from(pagesMap.values())
  } catch (error) {
    console.error('[DataForSEO] getDomainPagesBacklinks error:', error)
    throw error
  }
}

export async function getDomainBacklinksDetail(target: string, limit: number = 100): Promise<DFSOBacklinkDetail[]> {
  try {
    const res = await fetch('https://api.dataforseo.com/v3/backlinks/backlinks/live', {
      method: 'POST',
      headers: getAuthHeader() as any,
      body: JSON.stringify([{ target, limit, order_by: ['rank,desc'] }])
    })
    if (!res.ok) {
      if (res.status === 402) {
        throw new Error("Fonduri insuficiente în contul DataForSEO (Payment Required).")
      }
      throw new Error(`DataForSEO API error: ${res.status}`)
    }
    const data = await res.json()
    
    const task = data.tasks?.[0]
    if (task && task.status_code >= 40000) {
      if (task.status_code === 40200) {
        throw new Error("Fonduri insuficiente în contul DataForSEO (Payment Required).")
      }
      throw new Error(`DataForSEO Task Error: ${task.status_message}`)
    }
    
    const items = task?.result?.[0]?.items || []
    return items.map((item: any) => ({
      url_from: item.url_from,
      url_to: item.url_to,
      domain_from: item.domain_from,
      anchor: item.anchor || '',
      rank: item.rank || 0,
      domain_from_rank: item.domain_from_rank || 0,
      page_to_status_code: item.page_to_status_code || 200
    }))
  } catch (error) {
    console.error('[DataForSEO] getDomainBacklinksDetail error:', error)
    throw error // Re-throw to be handled by the route
  }
}
