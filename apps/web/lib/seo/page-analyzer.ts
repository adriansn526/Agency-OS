/**
 * SEO On-Page Analyzer
 * Server-side page analysis similar to Yoast/Rank Math.
 * Works on any website (Next.js, WordPress, static, etc.)
 * Uses cheerio for zero-browser-overhead HTML parsing.
 */

import * as cheerio from 'cheerio'

// ─── Types ───

export interface SeoIssue {
  severity: 'error' | 'warning' | 'info' | 'success'
  category: 'meta' | 'content' | 'technical' | 'links' | 'images'
  message: string
  fix: string
}

export interface HeadingAnalysis {
  tag: string
  text: string
  level: number
}

export interface SeoPageAnalysis {
  url: string
  fetchedAt: string
  statusCode: number
  loadTimeMs: number

  // Meta
  title: { value: string; length: number; score: 'good' | 'warning' | 'error'; suggestion?: string }
  metaDescription: { value: string; length: number; score: 'good' | 'warning' | 'error'; suggestion?: string }
  canonical: string | null
  robots: string | null
  ogTags: Record<string, string>
  twitterTags: Record<string, string>
  lang: string | null
  charset: string | null

  // Headings
  h1: { count: number; values: string[] }
  h2: { count: number; values: string[] }
  h3: { count: number; values: string[] }
  headingHierarchy: HeadingAnalysis[]

  // Content
  wordCount: number
  readingTimeMin: number
  paragraphCount: number
  keywordDensity: Array<{ word: string; count: number; density: number }>
  readabilityScore?: { score: number; label: string }

  // Links
  internalLinks: { count: number; urls: string[] }
  externalLinks: { count: number; urls: string[] }
  noFollowLinks: number

  // Images
  totalImages: number
  imagesWithoutAlt: number
  imagesWithoutDimensions: number
  imagesNotLazy: number
  imagesNotWebP: number
  imageDetails: Array<{ src: string; alt: string; hasAlt: boolean; hasLazy: boolean; isWebP: boolean; hasDimensions: boolean }>

  // Technical
  hasSchemaMarkup: boolean
  schemaTypes: string[]
  hasViewportMeta: boolean
  hasFavicon: boolean
  hasRobotsTxt: boolean
  hasSitemap: boolean
  redirectChain: string[] | null  // If page was redirected
  httpHeaders: Record<string, string>

  // Score
  overallScore: number
  issues: SeoIssue[]
  scoreBreakdown: {
    meta: number
    content: number
    technical: number
    links: number
    images: number
  }
}

export interface SiteAuditSummary {
  domain: string
  pagesAnalyzed: number
  avgScore: number
  criticalIssues: number
  warnings: number
  topIssues: Array<{ message: string; count: number; severity: string }>
  bestPages: Array<{ url: string; score: number }>
  worstPages: Array<{ url: string; score: number; topIssue: string }>
  // New: site-wide checks
  brokenLinks: Array<{ from: string; to: string; status: number }>
  duplicateTitles: Array<{ title: string; pages: string[] }>
  duplicateDescriptions: Array<{ description: string; pages: string[] }>
  missingCanonicals: string[]
  redirectChains: Array<{ url: string; chain: string[] }>
}

// ─── Helpers ───

const STOP_WORDS_RO = new Set([
  'de', 'la', 'in', 'pe', 'cu', 'si', 'un', 'o', 'a', 'ai', 'ale', 'cel', 'cea',
  'din', 'pentru', 'sau', 'este', 'sunt', 'ca', 'care', 'nu', 'se', 'ce', 'mai',
  'prin', 'acest', 'aceasta', 'the', 'and', 'of', 'to', 'a', 'in', 'is', 'it',
  'for', 'on', 'with', 'as', 'at', 'by', 'an', 'be', 'this', 'that', 'from',
  'or', 'not', 'are', 'was', 'but', 'all', 'can', 'has', 'her', 'his', 'our',
])

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function isInternalLink(linkUrl: string, pageDomain: string): boolean {
  if (!linkUrl || linkUrl.startsWith('#') || linkUrl.startsWith('javascript:') || linkUrl.startsWith('mailto:') || linkUrl.startsWith('tel:')) {
    return false
  }
  if (linkUrl.startsWith('/') || linkUrl.startsWith('./') || linkUrl.startsWith('../')) {
    return true
  }
  try {
    const linkDomain = new URL(linkUrl).hostname
    return linkDomain === pageDomain || linkDomain.endsWith('.' + pageDomain)
  } catch {
    return true // relative URL
  }
}

function getTextContent($: cheerio.CheerioAPI): string {
  // Remove script, style, nav, header, footer
  const clone = $.root().clone()
  clone.find('script, style, nav, header, footer, noscript, svg, [aria-hidden="true"]').remove()
  
  let text = clone.text()
  // Strip WordPress/WPBakery shortcodes like [vc_row]...[/vc_row] or [tag attr="val"]
  text = text.replace(/\[\/?[\w-]+[^\]]*\]/g, ' ')
  
  return text.replace(/\s+/g, ' ').trim()
}

function computeKeywordDensity(text: string, topN = 20): Array<{ word: string; count: number; density: number }> {
  const words = text.toLowerCase().split(/[\s,.;:!?()[\]{}'"—–\-\/\\]+/).filter(w => w.length > 3 && !STOP_WORDS_RO.has(w))
  const totalWords = words.length
  if (totalWords === 0) return []

  const freq = new Map<string, number>()
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1)
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({
      word,
      count,
      density: +((count / totalWords) * 100).toFixed(2),
    }))
}


// ─── Content Analysis Helpers ───
function countSyllablesRo(word: string): number {
  const matches = word.toLowerCase().match(/[aeiouăâî]+/g)
  return matches ? matches.length : 1
}

function calculateFleschReadingEase(text: string): { score: number; label: string; sentences: number; words: number } {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
  const sentenceCount = Math.max(1, sentences.length)
  
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const wordCount = Math.max(1, words.length)
  
  let syllableCount = 0
  for (const w of words) {
    syllableCount += countSyllablesRo(w)
  }
  
  const asl = wordCount / sentenceCount
  const asw = syllableCount / wordCount
  
  const score = 206.835 - (1.015 * asl) - (84.6 * asw)
  
  let label = 'Ușor'
  if (score < 30) label = 'Foarte greu'
  else if (score < 50) label = 'Greu'
  else if (score < 60) label = 'Mediu-Greu'
  else if (score < 70) label = 'Mediu'
  else if (score < 90) label = 'Ușor'
  else label = 'Foarte ușor'

  return { score: Math.max(0, Math.min(100, Math.round(score))), label, sentences: sentenceCount, words: wordCount }
}

function analyzeAdvancedContentMetrics($: cheerio.CheerioAPI, text: string, targetKeywords: string[] | undefined, gscKeywords: string[] | undefined, issues: SeoIssue[], contentScore: number) {
  let updatedScore = contentScore
  // 1. Readability
  const readability = calculateFleschReadingEase(text)
  if (readability.score < 40) {
    issues.push({ severity: 'warning', category: 'content', message: `Text prea greu de citit (Scor Flesch: ${readability.score} - ${readability.label})`, fix: 'Folosește propoziții mai scurte și cuvinte mai simple' })
    updatedScore -= 10
  }

  // 2. Paragraph length
  $('p').each((_, el) => {
    const pText = $(el).text()
    if (pText.split(/\s+/).length > 150) {
      issues.push({ severity: 'warning', category: 'content', message: 'Ai un paragraf foarte lung (>150 cuvinte)', fix: 'Sparge "zidurile de text" în paragrafe mai scurte' })
      updatedScore -= 5
      return false // break early
    }
  })

  // 3. Subheading distribution
  const h2h3Count = $('h2, h3').length
  const words = text.split(/\s+/).length
  if (words > 300 && h2h3Count === 0) {
    issues.push({ severity: 'warning', category: 'content', message: 'Peste 300 cuvinte fără niciun subtitlu (H2/H3)', fix: 'Adaugă subtitluri pentru a structura conținutul' })
    updatedScore -= 10
  } else if (h2h3Count > 0 && (words / h2h3Count) > 300) {
    issues.push({ severity: 'info', category: 'content', message: 'Secțiuni prea lungi între subtitluri', fix: 'Folosește mai multe H2/H3 pentru a împărți secțiunile >300 cuvinte' })
  }

  // 3.1 Featured Snippet Check
  let hasFeaturedSnippet = false;
  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    const isQuestion = /^(Ce|Cum|De ce|Când|Cât|Care|Unde)\b/i.test(text) || text.endsWith('?');
    
    if (isQuestion) {
      const nextSibling = $(el).next();
      if (nextSibling.is('p')) {
        const pText = nextSibling.text();
        const pWords = pText.split(/\s+/).filter(Boolean).length;
        if (pWords >= 40 && pWords <= 60) {
          hasFeaturedSnippet = true;
          issues.push({ severity: 'success', category: 'content', message: `Structură perfectă pentru Featured Snippet la "${text}"`, fix: '' });
          updatedScore += 5;
          return false; // break the loop, one is enough
        } else {
          issues.push({ severity: 'info', category: 'content', message: `Oportunitate Featured Snippet: Răspunsul la "${text}" are ${pWords} cuvinte.`, fix: 'Ajustează paragraful imediat următor să aibă între 40-55 de cuvinte clare și concise.' });
        }
      }
    }
  });

  // 4. Keyword Checks
  if (targetKeywords && targetKeywords.length > 0) {
    const first100Words = text.split(/\s+/).slice(0, 100).join(' ').toLowerCase()
    const h2h3Array = $('h2, h3').toArray().map(el => $(el).text().toLowerCase())
    const textLower = text.toLowerCase()
    
    targetKeywords.forEach(targetKeyword => {
      const kwLower = targetKeyword.toLowerCase()
      
      if (!first100Words.includes(kwLower)) {
        issues.push({ severity: 'warning', category: 'content', message: `Cuvântul cheie "${targetKeyword}" nu apare în introducere`, fix: 'Adaugă cuvântul cheie în primele 100 de cuvinte' })
        updatedScore -= 2
      }

      const inH2H3 = h2h3Array.some(hText => hText.includes(kwLower))
      if (!inH2H3) {
        issues.push({ severity: 'warning', category: 'content', message: `Cuvântul cheie "${targetKeyword}" nu apare în niciun H2 sau H3`, fix: 'Adaugă cuvântul cheie în cel puțin un subtitlu' })
        updatedScore -= 2
      }

      // Keyword Density exact
      const exactMatches = (textLower.match(new RegExp(kwLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')) || []).length
      const exactDensity = (exactMatches / (words || 1)) * 100
      
      if (exactDensity < 0.3 && exactDensity > 0) {
        issues.push({ severity: 'info', category: 'content', message: `Densitate prea mică pentru "${targetKeyword}" (${exactDensity.toFixed(2)}%)`, fix: 'Repetă cuvântul cheie de câteva ori în mod natural (recomandat 0.5% - 2%)' })
      } else if (exactDensity > 3.0) {
        issues.push({ severity: 'warning', category: 'content', message: `Keyword Stuffing: Densitate prea mare pentru "${targetKeyword}" (${exactDensity.toFixed(2)}%)`, fix: 'Redu numărul de apariții ale cuvântului cheie (peste 3% poate fi penalizat)' })
        updatedScore -= 5
      }
    });
  }

  if (gscKeywords && gscKeywords.length > 0) {
    const textLower = text.toLowerCase()
    gscKeywords.forEach(gscKw => {
      const kwLower = gscKw.toLowerCase()
      if (!textLower.includes(kwLower)) {
        issues.push({ severity: 'info', category: 'content', message: `Oportunitate GSC: Termenul "${gscKw}" îți aduce trafic/afișări, dar nu apare deloc în text!`, fix: 'Adaugă-l în mod natural în conținut pentru a-ți consolida poziția în Google.' })
      } else {
        issues.push({ severity: 'success', category: 'content', message: `Oportunitate GSC: Termenul "${gscKw}" este inclus în text.`, fix: '' })
      }
    })
  }

  return { updatedScore, readability }
}

// ─── Main Analyzer ───

export async function analyzePage(url: string, targetKeywords?: string[]): Promise<SeoPageAnalysis> {
  const startTime = Date.now()
  const issues: SeoIssue[] = []
  const redirectChain: string[] = []

  // Fetch page with redirect tracking
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  let statusCode = 0
  let html = ''
  const headers: Record<string, string> = {}

  try {
    // First check for redirects manually
    let currentUrl = url
    for (let i = 0; i < 5; i++) {
      const checkRes = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ASNS-SEOBot/1.0; +https://asns.ro)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'manual',
      })
      if (checkRes.status >= 300 && checkRes.status < 400) {
        const location = checkRes.headers.get('location')
        if (location) {
          redirectChain.push(currentUrl)
          currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href
          continue
        }
      }
      break
    }
    if (redirectChain.length > 0) {
      redirectChain.push(currentUrl)
    }

    // Now fetch the final URL with follow
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ASNS-SEOBot/1.0; +https://asns.ro)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    statusCode = res.status
    html = await res.text()

    // Capture headers
    res.headers.forEach((value, key) => { headers[key] = value })
  } catch (err: any) {
    clearTimeout(timeout)
    return {
      url,
      fetchedAt: new Date().toISOString(),
      statusCode: 0,
      loadTimeMs: Date.now() - startTime,
      title: { value: '', length: 0, score: 'error', suggestion: 'Pagina nu a putut fi accesată' },
      metaDescription: { value: '', length: 0, score: 'error' },
      canonical: null, robots: null, ogTags: {}, twitterTags: {},
      lang: null, charset: null,
      h1: { count: 0, values: [] }, h2: { count: 0, values: [] }, h3: { count: 0, values: [] },
      headingHierarchy: [],
      wordCount: 0, readingTimeMin: 0, paragraphCount: 0, keywordDensity: [],
      internalLinks: { count: 0, urls: [] }, externalLinks: { count: 0, urls: [] }, noFollowLinks: 0,
      totalImages: 0, imagesWithoutAlt: 0, imagesWithoutDimensions: 0, imagesNotLazy: 0, imagesNotWebP: 0, imageDetails: [],
      hasSchemaMarkup: false, schemaTypes: [], hasViewportMeta: false, hasFavicon: false, hasRobotsTxt: false, hasSitemap: false, redirectChain: null, httpHeaders: headers,
      overallScore: 0,
      issues: [{ severity: 'error', category: 'technical', message: `Eroare la accesarea paginii: ${err.message}`, fix: 'Verifică dacă URL-ul e accesibil' }],
      scoreBreakdown: { meta: 0, content: 0, technical: 0, links: 0, images: 0 },
    }
  }

  const loadTimeMs = Date.now() - startTime
  const $ = cheerio.load(html)
  const pageDomain = extractDomain(url)

  // ── Meta Analysis ──

  const titleTag = $('title').first().text().trim()
  const titleLen = titleTag.length
  let titleScore: 'good' | 'warning' | 'error' = 'good'
  let titleSuggestion: string | undefined

  if (!titleTag) {
    titleScore = 'error'
    titleSuggestion = 'Pagina nu are tag <title>'
    issues.push({ severity: 'error', category: 'meta', message: 'Lipsește tag-ul <title>', fix: 'Adaugă un titlu descriptiv de 50-60 caractere' })
  } else if (titleLen < 30) {
    titleScore = 'warning'
    titleSuggestion = `Titlul e prea scurt (${titleLen} chars). Ideal: 50-60.`
    issues.push({ severity: 'warning', category: 'meta', message: `Titlu prea scurt (${titleLen} caractere)`, fix: 'Extinde titlul la 50-60 caractere cu keyword-ul principal' })
  } else if (titleLen > 65) {
    titleScore = 'warning'
    titleSuggestion = `Titlul e prea lung (${titleLen} chars). Va fi trunchiat în SERP.`
    issues.push({ severity: 'warning', category: 'meta', message: `Titlu prea lung (${titleLen} caractere)`, fix: 'Scurtează titlul la max 60 caractere' })
  }

  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || ''
  const metaDescLen = metaDesc.length
  let metaDescScore: 'good' | 'warning' | 'error' = 'good'
  let metaDescSuggestion: string | undefined

  if (!metaDesc) {
    metaDescScore = 'error'
    metaDescSuggestion = 'Lipsește meta description'
    issues.push({ severity: 'error', category: 'meta', message: 'Lipsește meta description', fix: 'Adaugă o descriere de 120-160 caractere' })
  } else if (metaDescLen < 100) {
    metaDescScore = 'warning'
    metaDescSuggestion = `Meta description prea scurtă (${metaDescLen} chars). Ideal: 120-160.`
    issues.push({ severity: 'warning', category: 'meta', message: `Meta description prea scurtă (${metaDescLen} chars)`, fix: 'Extinde la 120-160 caractere' })
  } else if (metaDescLen > 165) {
    metaDescScore = 'warning'
    metaDescSuggestion = `Meta description prea lungă (${metaDescLen} chars). Va fi trunchiată.`
  }

  const canonical = $('link[rel="canonical"]').attr('href') || null
  const robots = $('meta[name="robots"]').attr('content') || null
  const lang = $('html').attr('lang') || null
  const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content')?.match(/charset=([^\s;]+)/)?.[1] || null

  // OG + Twitter tags
  const ogTags: Record<string, string> = {}
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr('property')
    const content = $(el).attr('content')
    if (prop && content) ogTags[prop] = content
  })

  const twitterTags: Record<string, string> = {}
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr('name')
    const content = $(el).attr('content')
    if (name && content) twitterTags[name] = content
  })

  if (!ogTags['og:title']) {
    issues.push({ severity: 'info', category: 'meta', message: 'Lipsesc Open Graph tags', fix: 'Adaugă og:title, og:description, og:image pentru share-uri sociale' })
  }

  // ── Headings ──

  const h1Values = $('h1').map((_, el) => $(el).text().trim()).get()
  const h2Values = $('h2').map((_, el) => $(el).text().trim()).get()
  const h3Values = $('h3').map((_, el) => $(el).text().trim()).get()

  const headingHierarchy: HeadingAnalysis[] = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName.toLowerCase()
    headingHierarchy.push({
      tag,
      text: $(el).text().trim().slice(0, 100),
      level: parseInt(tag.charAt(1)),
    })
  })

  if (h1Values.length === 0) {
    issues.push({ severity: 'error', category: 'content', message: 'Lipsește H1', fix: 'Adaugă un singur H1 cu keyword-ul principal' })
  } else if (h1Values.length > 1) {
    issues.push({ severity: 'warning', category: 'content', message: `Multiple H1 tags (${h1Values.length})`, fix: 'Folosește un singur H1 per pagină' })
  }

  if (h2Values.length === 0) {
    issues.push({ severity: 'warning', category: 'content', message: 'Lipsesc H2 subtitluri', fix: 'Adaugă subtitluri H2 pentru structură' })
  }

  // ── Content ──

  const bodyText = getTextContent($)
  const words = bodyText.split(/\s+/).filter(w => w.length > 1)
  const wordCount = words.length
  const readingTimeMin = Math.ceil(wordCount / 200)
  const paragraphCount = $('p').length

  if (wordCount < 300) {
    issues.push({ severity: 'warning', category: 'content', message: `Conținut subțire (${wordCount} cuvinte)`, fix: 'Adaugă minim 300 cuvinte de conținut relevant' })
  }

  const keywordDensity = computeKeywordDensity(bodyText)

  // Check target keyword presence
  if (targetKeywords && targetKeywords.length > 0) {
    const kwsLower = targetKeywords.map(k => k.toLowerCase())
    const inTitle = kwsLower.some(kw => titleTag.toLowerCase().includes(kw))
    const inMeta = kwsLower.some(kw => metaDesc.toLowerCase().includes(kw))
    const inH1 = kwsLower.some(kw => h1Values.some(h => h.toLowerCase().includes(kw)))

    if (!inTitle) issues.push({ severity: 'warning', category: 'meta', message: `Niciun keyword principal nu apare în titlu`, fix: 'Include cel puțin un keyword principal în tag-ul <title>' })
    if (!inMeta) issues.push({ severity: 'info', category: 'meta', message: `Niciun keyword principal nu apare în meta description`, fix: 'Include keyword-ul în meta description' })
    if (!inH1) issues.push({ severity: 'warning', category: 'content', message: `Niciun keyword principal nu apare în H1`, fix: 'Include keyword-ul principal în H1' })
  }

  // ── Links ──

  const internalUrls: string[] = []
  const externalUrls: string[] = []
  let noFollowCount = 0

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const rel = $(el).attr('rel') || ''

    if (rel.includes('nofollow')) noFollowCount++

    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return

    if (isInternalLink(href, pageDomain)) {
      internalUrls.push(href)
    } else if (href.startsWith('http')) {
      externalUrls.push(href)
    }
  })

  if (internalUrls.length < 3) {
    issues.push({ severity: 'warning', category: 'links', message: `Puține link-uri interne (${internalUrls.length})`, fix: 'Adaugă minim 3 link-uri interne către pagini relevante' })
  }

  // ── Images (Enhanced) ──

  const imageDetails: Array<{ src: string; alt: string; hasAlt: boolean; hasLazy: boolean; isWebP: boolean; hasDimensions: boolean }> = []
  let imagesWithoutAlt = 0
  let imagesWithoutDimensions = 0
  let imagesNotLazy = 0
  let imagesNotWebP = 0

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || ''
    const alt = $(el).attr('alt') || ''
    const hasAlt = alt.length > 0
    const loading = $(el).attr('loading') || ''
    const hasLazy = loading === 'lazy' || $(el).attr('data-src') !== undefined
    const isWebP = /\.webp/i.test(src) || /image\/webp/i.test($(el).attr('type') || '')
    const hasDimensions = !!($(el).attr('width') && $(el).attr('height'))

    if (!hasAlt) imagesWithoutAlt++
    if (!hasLazy) imagesNotLazy++
    if (!isWebP && src && !src.startsWith('data:')) imagesNotWebP++
    if (!hasDimensions) imagesWithoutDimensions++

    imageDetails.push({ src: src.slice(0, 200), alt: alt.slice(0, 100), hasAlt, hasLazy, isWebP, hasDimensions })
  })

  if (imagesWithoutAlt > 0) {
    issues.push({ severity: 'warning', category: 'images', message: `${imagesWithoutAlt} imagini fără atribut alt`, fix: 'Adaugă text alt descriptiv la toate imaginile' })
  }
  if (imagesNotWebP > 0 && imageDetails.length > 0) {
    issues.push({ severity: 'info', category: 'images', message: `${imagesNotWebP} imagini nu sunt în format WebP`, fix: 'Convertește imaginile în WebP pentru viteză mai bună (-25-35% dimensiune)' })
  }
  if (imagesNotLazy > 2) {
    issues.push({ severity: 'info', category: 'images', message: `${imagesNotLazy} imagini fără lazy loading`, fix: 'Adaugă loading="lazy" la imaginile below-the-fold' })
  }
  if (imagesWithoutDimensions > 2) {
    issues.push({ severity: 'info', category: 'images', message: `${imagesWithoutDimensions} imagini fără dimensiuni explicite`, fix: 'Setează width și height pe imagini pentru a preveni CLS' })
  }

  // ── Technical ──

  const hasViewportMeta = $('meta[name="viewport"]').length > 0
  if (!hasViewportMeta) {
    issues.push({ severity: 'error', category: 'technical', message: 'Lipsește meta viewport', fix: 'Adaugă <meta name="viewport" content="width=device-width, initial-scale=1">' })
  }

  const hasFavicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0

  // Schema.org markup
  const schemaScripts = $('script[type="application/ld+json"]')
  const schemaTypes: string[] = []
  schemaScripts.each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}')
      if (json['@type']) schemaTypes.push(json['@type'])
      if (Array.isArray(json['@graph'])) {
        for (const item of json['@graph']) {
          if (item['@type']) schemaTypes.push(item['@type'])
        }
      }
    } catch { /* ignore parse errors */ }
  })

  if (schemaTypes.length === 0) {
    issues.push({ severity: 'info', category: 'technical', message: 'Lipsește Schema.org markup', fix: 'Adaugă structured data (Organization, LocalBusiness, Product, etc.)' })
  }

  if (!canonical) {
    issues.push({ severity: 'warning', category: 'technical', message: 'Lipsește canonical URL', fix: 'Adaugă <link rel="canonical"> pentru a preveni duplicate content' })
  }

  if (redirectChain.length > 2) {
    issues.push({ severity: 'warning', category: 'technical', message: `Lanț de redirect-uri (${redirectChain.length - 1} hop-uri)`, fix: 'Elimină redirect-urile intermediare — link direct la URL-ul final' })
  }

  // Check robots.txt & sitemap (only from page domain root)
  let hasRobotsTxt = false
  let hasSitemap = false
  try {
    const robotsUrl = new URL('/robots.txt', url).href
    const robotsRes = await fetch(robotsUrl, { signal: AbortSignal.timeout(3000) }).catch(() => null)
    hasRobotsTxt = robotsRes?.status === 200
    if (hasRobotsTxt) {
      const robotsText = await robotsRes!.text()
      hasSitemap = robotsText.toLowerCase().includes('sitemap:')
    }
  } catch { /* ignore */ }

  if (!hasRobotsTxt) {
    issues.push({ severity: 'info', category: 'technical', message: 'Lipsește robots.txt', fix: 'Creează robots.txt cu reguli User-agent și Sitemap' })
  }

  // ── Scoring ──

  let metaScore = 100
  let contentScore = 100
  let technicalScore = 100
  let linksScore = 100
  let imagesScore = 100

  // Meta scoring
  if (!titleTag) metaScore -= 30; else if (titleScore !== 'good') metaScore -= 15
  if (!metaDesc) metaScore -= 25; else if (metaDescScore !== 'good') metaScore -= 10
  if (!ogTags['og:title']) metaScore -= 10
  if (!canonical) metaScore -= 10

  // Content scoring
  if (wordCount < 300) contentScore -= 25
  if (h1Values.length === 0) contentScore -= 25
  if (h1Values.length > 1) contentScore -= 10
  if (h2Values.length === 0) contentScore -= 15

  // Technical scoring
  if (!hasViewportMeta) technicalScore -= 25
  if (schemaTypes.length === 0) technicalScore -= 15
  if (statusCode !== 200) technicalScore -= 30
  if (loadTimeMs > 5000) technicalScore -= 20; else if (loadTimeMs > 3000) technicalScore -= 10
  if (!lang) technicalScore -= 5

  // Links scoring
  if (internalUrls.length < 3) linksScore -= 20
  if (internalUrls.length === 0) linksScore -= 20

  // Images scoring (enhanced)
  const totalImages = imageDetails.length
  if (totalImages > 0 && imagesWithoutAlt > 0) {
    imagesScore -= Math.min(40, Math.round((imagesWithoutAlt / totalImages) * 50))
  }
  if (totalImages > 3 && imagesNotWebP > totalImages * 0.5) {
    imagesScore -= 10 // More than half not WebP
  }
  if (totalImages > 3 && imagesWithoutDimensions > totalImages * 0.5) {
    imagesScore -= 10 // CLS risk
  }

  // Redirect penalty
  if (redirectChain.length > 2) technicalScore -= 10

  // Clamp
  metaScore = Math.max(0, metaScore)
  contentScore = Math.max(0, contentScore)
  technicalScore = Math.max(0, technicalScore)
  linksScore = Math.max(0, linksScore)
  imagesScore = Math.max(0, imagesScore)

  
  // Run advanced content metrics
  const advMetrics = analyzeAdvancedContentMetrics($, bodyText, targetKeywords, undefined, issues, contentScore)
  contentScore = advMetrics.updatedScore
  const readabilityScore = advMetrics.readability

  // External Links Check
  if (externalUrls.length === 0) {
    issues.push({ severity: 'info', category: 'links', message: 'Lipsesc linkurile externe', fix: 'Adaugă 1-2 linkuri către surse externe de autoritate' })
    linksScore -= 10
  }

  const overallScore = Math.round(
    metaScore * 0.30 +
    contentScore * 0.25 +
    technicalScore * 0.20 +
    linksScore * 0.15 +
    imagesScore * 0.10
  )

  return {
    url,
    fetchedAt: new Date().toISOString(),
    statusCode,
    loadTimeMs,
    title: { value: titleTag, length: titleLen, score: titleScore, suggestion: titleSuggestion },
    metaDescription: { value: metaDesc, length: metaDescLen, score: metaDescScore, suggestion: metaDescSuggestion },
    canonical, robots, ogTags, twitterTags, lang, charset,
    h1: { count: h1Values.length, values: h1Values },
    h2: { count: h2Values.length, values: h2Values },
    h3: { count: h3Values.length, values: h3Values },
    headingHierarchy,
    wordCount, readingTimeMin, paragraphCount, keywordDensity, readabilityScore,
    internalLinks: { count: internalUrls.length, urls: internalUrls.slice(0, 50) },
    externalLinks: { count: externalUrls.length, urls: externalUrls.slice(0, 20) },
    noFollowLinks: noFollowCount,
    totalImages, imagesWithoutAlt, imagesWithoutDimensions, imagesNotLazy, imagesNotWebP,
    imageDetails: imageDetails.slice(0, 30),
    hasSchemaMarkup: schemaTypes.length > 0, schemaTypes,
    hasViewportMeta, hasFavicon, hasRobotsTxt, hasSitemap,
    redirectChain: redirectChain.length > 0 ? redirectChain : null,
    httpHeaders: headers,
    overallScore,
    issues: issues.sort((a, b) => {
      const sev: Record<string, number> = { error: 0, warning: 1, info: 2, success: 3 }
      return (sev[a.severity] || 3) - (sev[b.severity] || 3)
    }),
    scoreBreakdown: { meta: metaScore, content: contentScore, technical: technicalScore, links: linksScore, images: imagesScore },
  }
}

// ─── Live Content Analyzer ───

export function analyzeHtmlContent(html: string, title: string, metaDescription: string, targetKeywords?: string[], gscKeywords?: string[], existingPostTitles?: string[]): SeoPageAnalysis {
  const startTime = Date.now()
  const issues: SeoIssue[] = []
  
  // Create a minimal HTML shell if just fragments are passed, or just load directly
  const fullHtml = `<!DOCTYPE html><html lang="ro"><head><title>${title}</title><meta name="description" content="${metaDescription}"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`
  const $ = cheerio.load(fullHtml)
  const pageDomain = 'local'

  // ── Meta Analysis ──
  const titleTag = title || ''
  const titleLen = titleTag.length
  let titleScore: 'good' | 'warning' | 'error' = 'good'
  let titleSuggestion: string | undefined

  if (!titleTag) {
    titleScore = 'error'
    titleSuggestion = 'Pagina nu are tag <title>'
    issues.push({ severity: 'error', category: 'meta', message: 'Lipsește tag-ul <title>', fix: 'Adaugă un titlu descriptiv de 50-60 caractere' })
  } else if (titleLen < 30) {
    titleScore = 'warning'
    titleSuggestion = `Titlul e prea scurt (${titleLen} chars). Ideal: 50-60.`
    issues.push({ severity: 'warning', category: 'meta', message: `Titlu prea scurt (${titleLen} caractere)`, fix: 'Extinde titlul la 50-60 caractere cu keyword-ul principal' })
  } else if (titleLen > 65) {
    titleScore = 'warning'
    titleSuggestion = `Titlul e prea lung (${titleLen} chars). Va fi trunchiat în SERP.`
    issues.push({ severity: 'warning', category: 'meta', message: `Titlu prea lung (${titleLen} caractere)`, fix: 'Scurtează titlul la max 60 caractere' })
  } else {
    issues.push({ severity: 'success', category: 'meta', message: `Titlul are o lungime optimă (${titleLen} caractere)`, fix: '' })
  }

  const metaDesc = metaDescription || ''
  const metaDescLen = metaDesc.length
  let metaDescScore: 'good' | 'warning' | 'error' = 'good'
  let metaDescSuggestion: string | undefined

  if (!metaDesc) {
    metaDescScore = 'error'
    metaDescSuggestion = 'Lipsește meta description'
    issues.push({ severity: 'error', category: 'meta', message: 'Lipsește meta description', fix: 'Adaugă o descriere de 120-160 caractere' })
  } else if (metaDescLen < 100) {
    metaDescScore = 'warning'
    metaDescSuggestion = `Meta description prea scurtă (${metaDescLen} chars). Ideal: 120-160.`
    issues.push({ severity: 'warning', category: 'meta', message: `Meta description prea scurtă (${metaDescLen} chars)`, fix: 'Extinde la 120-160 caractere' })
  } else if (metaDescLen > 165) {
    metaDescScore = 'warning'
    metaDescSuggestion = `Meta description prea lungă (${metaDescLen} chars). Va fi trunchiată.`
    issues.push({ severity: 'warning', category: 'meta', message: `Meta description prea lungă (${metaDescLen} chars)`, fix: 'Scurtează la max 160 caractere' })
  } else {
    issues.push({ severity: 'success', category: 'meta', message: `Meta description are o lungime optimă (${metaDescLen} caractere)`, fix: '' })
  }

  // ── Headings ──
  const h1Values = $('h1').map((_, el) => $(el).text().trim()).get()
  const h2Values = $('h2').map((_, el) => $(el).text().trim()).get()
  const h3Values = $('h3').map((_, el) => $(el).text().trim()).get()

  const headingHierarchy: HeadingAnalysis[] = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName.toLowerCase()
    headingHierarchy.push({
      tag,
      text: $(el).text().trim().slice(0, 100),
      level: parseInt(tag.charAt(1)),
    })
  })

  if (h1Values.length === 0) {
    issues.push({ severity: 'error', category: 'content', message: 'Lipsește H1', fix: 'Adaugă un singur H1 cu keyword-ul principal' })
  } else if (h1Values.length > 1) {
    issues.push({ severity: 'warning', category: 'content', message: `Multiple H1 tags (${h1Values.length})`, fix: 'Folosește un singur H1 per pagină' })
  } else {
    issues.push({ severity: 'success', category: 'content', message: 'Pagina are exact un singur titlu H1', fix: '' })
  }
  
  if (h2Values.length === 0) {
    issues.push({ severity: 'warning', category: 'content', message: 'Lipsesc H2 subtitluri', fix: 'Adaugă subtitluri H2 pentru structură' })
  } else {
    issues.push({ severity: 'success', category: 'content', message: 'Conținutul folosește subtitluri H2 pentru structură', fix: '' })
  }

  // ── Content ──
  const bodyText = getTextContent($)
  const bodyTextLower = bodyText.toLowerCase()
  const words = bodyText.split(/\s+/).filter(w => w.length > 1)
  const wordCount = words.length
  const readingTimeMin = Math.ceil(wordCount / 200)
  const paragraphCount = $('p').length

  if (wordCount < 300) {
    issues.push({ severity: 'warning', category: 'content', message: `Conținut subțire (${wordCount} cuvinte)`, fix: 'Adaugă minim 300 cuvinte de conținut relevant' })
  } else {
    issues.push({ severity: 'success', category: 'content', message: `Conținut text suficient (${wordCount} cuvinte)`, fix: '' })
  }

  const keywordDensity = computeKeywordDensity(bodyText)

  if (targetKeywords && targetKeywords.length > 0) {
    const kwsLower = targetKeywords.map(k => k.toLowerCase())
    const inTitle = kwsLower.some(kw => titleTag.toLowerCase().includes(kw))
    const inMeta = kwsLower.some(kw => metaDesc.toLowerCase().includes(kw))
    const inH1 = kwsLower.some(kw => h1Values.some(h => h.toLowerCase().includes(kw)))

    if (!inTitle) issues.push({ severity: 'warning', category: 'meta', message: `Niciun keyword principal nu apare în titlu`, fix: 'Include cel puțin un keyword principal în tag-ul <title>' })
    else issues.push({ severity: 'success', category: 'meta', message: `Cuvântul cheie apare în titlu`, fix: '' })
    
    if (!inMeta) issues.push({ severity: 'info', category: 'meta', message: `Niciun keyword principal nu apare în meta description`, fix: 'Include keyword-ul în meta description' })
    else issues.push({ severity: 'success', category: 'meta', message: `Cuvântul cheie apare în meta description`, fix: '' })
    
    if (!inH1) issues.push({ severity: 'warning', category: 'content', message: `Niciun keyword principal nu apare în H1`, fix: 'Include keyword-ul principal în H1' })
    else issues.push({ severity: 'success', category: 'content', message: `Cuvântul cheie apare în titlul H1`, fix: '' })
  }

  // ── Links ──
  const internalUrls: string[] = []
  const externalUrls: string[] = []
  let noFollowCount = 0

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const rel = $(el).attr('rel') || ''
    if (rel.includes('nofollow')) noFollowCount++
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return
    if (isInternalLink(href, pageDomain)) {
      internalUrls.push(href)
    } else if (href.startsWith('http')) {
      externalUrls.push(href)
    }
  })

  // ── Images ──
  const imageDetails: any[] = []
  let imagesWithoutAlt = 0
  
  $('img').each((_, el) => {
    const src = $(el).attr('src') || ''
    const alt = $(el).attr('alt') || ''
    const hasAlt = alt.length > 0
    if (!hasAlt) imagesWithoutAlt++
    imageDetails.push({ src: src.slice(0, 200), alt: alt.slice(0, 100), hasAlt, hasLazy: true, isWebP: true, hasDimensions: true })
  })

  const totalImages = imageDetails.length
  if (imagesWithoutAlt > 0) {
    issues.push({ severity: 'warning', category: 'images', message: `${imagesWithoutAlt} imagini fără atribut alt`, fix: 'Adaugă text alt descriptiv la toate imaginile' })
  } else if (totalImages > 0) {
    issues.push({ severity: 'success', category: 'images', message: `Toate imaginile au atribut alt`, fix: '' })
  }

  // ── Scoring ──
  let metaScore = 100
  let contentScore = 100
  let technicalScore = 100 // default for drafts
  let linksScore = 100
  let imagesScore = 100

  if (!titleTag) metaScore -= 30; else if (titleScore !== 'good') metaScore -= 15
  if (!metaDesc) metaScore -= 25; else if (metaDescScore !== 'good') metaScore -= 10
  
  if (wordCount < 300) contentScore -= 25
  if (h1Values.length === 0) contentScore -= 25
  if (h1Values.length > 1) contentScore -= 10
  if (h2Values.length === 0) contentScore -= 15

  if (totalImages > 0 && imagesWithoutAlt > 0) {
    imagesScore -= Math.min(40, Math.round((imagesWithoutAlt / totalImages) * 50))
  }

  metaScore = Math.max(0, metaScore)
  contentScore = Math.max(0, contentScore)
  technicalScore = Math.max(0, technicalScore)
  linksScore = Math.max(0, linksScore)
  imagesScore = Math.max(0, imagesScore)

  
  // 5. Internal Linking Opportunities
  if (existingPostTitles && existingPostTitles.length > 0) {
    const existingLinksText = $('a').toArray().map(a => $(a).text().toLowerCase())
    let suggestionsFound = 0
    
    for (const postTitle of existingPostTitles) {
      if (suggestionsFound >= 3) break // Max 3 suggestions
      
      const ptLower = postTitle.toLowerCase()
      // If the text contains the post title AND it's not already linked
      if (ptLower.length > 5 && bodyTextLower.includes(ptLower) && !existingLinksText.some(linkText => linkText.includes(ptLower))) {
        issues.push({ 
          severity: 'info', 
          category: 'links', 
          message: `Oportunitate Link Intern: Ai menționat "${postTitle}".`, 
          fix: 'Transformă acest text într-un link către articolul respectiv pentru a crește autoritatea.' 
        })
        suggestionsFound++
      }
    }
  }

  // Run advanced content metrics
  const advMetrics = analyzeAdvancedContentMetrics($, bodyText, targetKeywords, gscKeywords, issues, contentScore)
  contentScore = advMetrics.updatedScore
  const readabilityScore = advMetrics.readability

  // External Links Check
  if (externalUrls.length === 0) {
    issues.push({ severity: 'info', category: 'links', message: 'Lipsesc linkurile externe', fix: 'Adaugă 1-2 linkuri către surse externe de autoritate' })
    linksScore -= 10
  }

  const overallScore = Math.round(
    metaScore * 0.30 +
    contentScore * 0.25 +
    technicalScore * 0.20 +
    linksScore * 0.15 +
    imagesScore * 0.10
  )

  return {
    url: 'draft',
    fetchedAt: new Date().toISOString(),
    statusCode: 200,
    loadTimeMs: Date.now() - startTime,
    title: { value: titleTag, length: titleLen, score: titleScore, suggestion: titleSuggestion },
    metaDescription: { value: metaDesc, length: metaDescLen, score: metaDescScore, suggestion: metaDescSuggestion },
    canonical: null, robots: null, ogTags: {}, twitterTags: {}, lang: 'ro', charset: 'UTF-8',
    h1: { count: h1Values.length, values: h1Values },
    h2: { count: h2Values.length, values: h2Values },
    h3: { count: h3Values.length, values: h3Values },
    headingHierarchy,
    wordCount, readingTimeMin, paragraphCount, keywordDensity, readabilityScore,
    internalLinks: { count: internalUrls.length, urls: internalUrls.slice(0, 50) },
    externalLinks: { count: externalUrls.length, urls: externalUrls.slice(0, 20) },
    noFollowLinks: noFollowCount,
    totalImages, imagesWithoutAlt, imagesWithoutDimensions: 0, imagesNotLazy: 0, imagesNotWebP: 0,
    imageDetails: imageDetails.slice(0, 30),
    hasSchemaMarkup: true, schemaTypes: ['Article'],
    hasViewportMeta: true, hasFavicon: true, hasRobotsTxt: true, hasSitemap: true,
    redirectChain: null,
    httpHeaders: {},
    overallScore,
    issues: issues.sort((a, b) => {
      const sev: Record<string, number> = { error: 0, warning: 1, info: 2, success: 3 }
      return (sev[a.severity] || 3) - (sev[b.severity] || 3)
    }),
    scoreBreakdown: { meta: metaScore, content: contentScore, technical: technicalScore, links: linksScore, images: imagesScore },
  }
}

// ─── Multi-Page Audit ───

export async function auditSite(
  domain: string,
  urls: string[],
  targetKeywords?: Map<string, string>,
): Promise<{ pages: SeoPageAnalysis[]; summary: SiteAuditSummary }> {
  const maxPages = Math.min(urls.length, 100) // Best practice: up to 100 pages
  const pagesToCrawl = urls.slice(0, maxPages)

  // Crawl in batches of 3 to avoid overwhelming the server
  const pages: SeoPageAnalysis[] = []
  for (let i = 0; i < pagesToCrawl.length; i += 3) {
    const batch = pagesToCrawl.slice(i, i + 3)
    const results = await Promise.all(
      batch.map(u => {
        const kw = targetKeywords?.get(u)
        return analyzePage(u, kw ? [kw] : undefined).catch(() => null)
      })
    )
    for (const r of results) {
      if (r) pages.push(r)
    }
    // Small delay between batches
    if (i + 3 < pagesToCrawl.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // Build summary
  const avgScore = pages.length > 0 ? Math.round(pages.reduce((s, p) => s + p.overallScore, 0) / pages.length) : 0

  const issueCounts = new Map<string, { count: number; severity: string }>()
  for (const page of pages) {
    for (const issue of page.issues) {
      const key = issue.message
      const existing = issueCounts.get(key) || { count: 0, severity: issue.severity }
      existing.count++
      issueCounts.set(key, existing)
    }
  }

  const topIssues = Array.from(issueCounts.entries())
    .map(([message, data]) => ({ message, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const sorted = [...pages].sort((a, b) => b.overallScore - a.overallScore)

  // ── Broken links detection ──
  const brokenLinks: Array<{ from: string; to: string; status: number }> = []
  const checkedUrls = new Map<string, number>()

  for (const page of pages) {
    for (const link of page.internalLinks.urls.slice(0, 20)) {
      const fullUrl = link.startsWith('http') ? link : `https://${domain}${link.startsWith('/') ? '' : '/'}${link}`
      if (checkedUrls.has(fullUrl)) {
        const status = checkedUrls.get(fullUrl)!
        if (status >= 400) brokenLinks.push({ from: page.url, to: fullUrl, status })
        continue
      }
      try {
        const checkRes = await fetch(fullUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
          redirect: 'follow',
        })
        checkedUrls.set(fullUrl, checkRes.status)
        if (checkRes.status >= 400) {
          brokenLinks.push({ from: page.url, to: fullUrl, status: checkRes.status })
        }
      } catch {
        checkedUrls.set(fullUrl, 0)
        brokenLinks.push({ from: page.url, to: fullUrl, status: 0 })
      }
    }
  }

  // ── Duplicate content detection ──
  const titleMap = new Map<string, string[]>()
  const descMap = new Map<string, string[]>()
  const missingCanonicals: string[] = []
  const redirectChains: Array<{ url: string; chain: string[] }> = []

  for (const page of pages) {
    const t = page.title.value.trim()
    if (t) {
      const existing = titleMap.get(t) || []
      existing.push(page.url)
      titleMap.set(t, existing)
    }
    const d = page.metaDescription.value.trim()
    if (d) {
      const existing = descMap.get(d) || []
      existing.push(page.url)
      descMap.set(d, existing)
    }
    if (!page.canonical) missingCanonicals.push(page.url)
    if (page.redirectChain && page.redirectChain.length > 1) {
      redirectChains.push({ url: page.url, chain: page.redirectChain })
    }
  }

  const duplicateTitles = Array.from(titleMap.entries())
    .filter(([, urls]) => urls.length > 1)
    .map(([title, pages]) => ({ title, pages }))

  const duplicateDescriptions = Array.from(descMap.entries())
    .filter(([, urls]) => urls.length > 1)
    .map(([description, pages]) => ({ description, pages }))

  const summary: SiteAuditSummary = {
    domain,
    pagesAnalyzed: pages.length,
    avgScore,
    criticalIssues: pages.reduce((s, p) => s + p.issues.filter(i => i.severity === 'error').length, 0),
    warnings: pages.reduce((s, p) => s + p.issues.filter(i => i.severity === 'warning').length, 0),
    topIssues,
    bestPages: sorted.slice(0, 5).map(p => ({ url: p.url, score: p.overallScore })),
    worstPages: sorted.slice(-5).reverse().map(p => ({
      url: p.url,
      score: p.overallScore,
      topIssue: p.issues[0]?.message || 'N/A',
    })),
    brokenLinks: brokenLinks.slice(0, 50),
    duplicateTitles,
    duplicateDescriptions,
    missingCanonicals,
    redirectChains,
  }

  return { pages, summary }
}
