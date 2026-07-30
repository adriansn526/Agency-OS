import { NextRequest, NextResponse } from 'next/server'

// POST /api/scrape/discover
// Extracts article links from a feed/category/blog page
export async function POST(req: NextRequest) {
  try {
    const { url, maxArticles = 10 } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Use Jina AI to extract the page content as markdown
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain' }
    })

    if (!response.ok) {
      throw new Error(`Jina AI returned ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()

    // Parse markdown links [title](url) from the content
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
    const allLinks: { title: string; url: string }[] = []
    let match

    while ((match = linkRegex.exec(text)) !== null) {
      const [, title, linkUrl] = match
      // Filter: only keep links that look like articles (not navigation, social, etc.)
      if (
        title.length > 10 && // title long enough to be an article
        !linkUrl.includes('#') && // not anchor links
        !linkUrl.includes('twitter.com') &&
        !linkUrl.includes('facebook.com') &&
        !linkUrl.includes('linkedin.com') &&
        !linkUrl.includes('instagram.com') &&
        !linkUrl.includes('youtube.com') &&
        !linkUrl.match(/\.(png|jpg|jpeg|gif|svg|css|js|pdf)$/i) // not assets
      ) {
        // Deduplicate by URL
        if (!allLinks.some(l => l.url === linkUrl)) {
          allLinks.push({ title: title.trim(), url: linkUrl })
        }
      }
    }

    // Also try to detect plain URLs that might be article links from the same domain
    const baseDomain = new URL(url).hostname
    const plainUrlRegex = /https?:\/\/[^\s)>\]"]+/g
    let plainMatch
    while ((plainMatch = plainUrlRegex.exec(text)) !== null) {
      const plainUrl = plainMatch[0].replace(/[.,;:!?]+$/, '') // clean trailing punctuation
      try {
        const parsed = new URL(plainUrl)
        if (
          parsed.hostname === baseDomain &&
          parsed.pathname.length > 5 && // not just "/"
          !allLinks.some(l => l.url === plainUrl) &&
          !plainUrl.match(/\.(png|jpg|jpeg|gif|svg|css|js|pdf)$/i)
        ) {
          // Use the path as a rough title
          const pathTitle = parsed.pathname
            .split('/')
            .filter(Boolean)
            .pop()
            ?.replace(/-/g, ' ')
            ?.replace(/\b\w/g, c => c.toUpperCase()) || parsed.pathname

          allLinks.push({ title: pathTitle, url: plainUrl })
        }
      } catch {}
    }

    // Limit results
    const articles = allLinks.slice(0, maxArticles)

    return NextResponse.json({ 
      articles,
      totalFound: allLinks.length,
      source: url
    })
  } catch (error: any) {
    console.error('Discover error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
