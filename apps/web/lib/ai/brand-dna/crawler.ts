// ─── Brand DNA Crawler ───
// Ported from DNA Studio (MIT) — uses Playwright for full-fidelity crawling
// Crawls a website, extracts visual identity + brand voice using LLM analysis

import { extractColorsFromCSS } from './color-extractor'
import { extractFonts } from './font-extractor'
import { generateJSON } from '../client'
import type {
  BrandDNA, LogoInfo, ToneProfile, AudienceProfile, CrawlProgress,
} from './types'

export type ProgressCallback = (progress: CrawlProgress) => void

export async function crawlBrandDNA(
  url: string,
  onProgress?: ProgressCallback
): Promise<BrandDNA> {
  const progress = (step: string, status: CrawlProgress['status'], detail?: string) => {
    onProgress?.({ step, status, detail })
  }

  // Dynamic import — Playwright is heavy, only load when needed
  const { chromium } = await import('playwright')
  let browser: import('playwright').Browser | null = null

  try {
    // Step 1: Launch browser and navigate
    progress('Launching browser', 'running')
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    })
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await context.newPage()

    progress('Crawling site', 'running', url)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000) // Let dynamic content render
    progress('Crawling site', 'done')

    // Step 2: Extract meta data
    progress('Extracting metadata', 'running')
    const meta = await extractMetaData(page)
    progress('Extracting metadata', 'done')

    // Step 3: Extract colors
    progress('Extracting colors', 'running')
    const cssColors = await page.evaluate(() => {
      const colors: string[] = []
      const elements = document.querySelectorAll('*')
      const subset = Array.from(elements).slice(0, 200)
      for (const el of subset) {
        const style = window.getComputedStyle(el)
        colors.push(style.color, style.backgroundColor, style.borderColor)
      }
      // Also get CSS custom properties from :root
      const root = document.documentElement
      const rootStyle = window.getComputedStyle(root)
      for (let i = 0; i < rootStyle.length; i++) {
        const prop = rootStyle[i]!
        if (prop.startsWith('--')) {
          colors.push(rootStyle.getPropertyValue(prop))
        }
      }
      return colors.filter(Boolean)
    })
    const colorInfos = extractColorsFromCSS(cssColors)
    progress('Extracting colors', 'done', `Found ${colorInfos.length} colors`)

    // Step 4: Extract fonts
    progress('Extracting fonts', 'running')
    const fontData = await page.evaluate(() => {
      const data: { family: string; tag: string; weight: string }[] = []
      const tags = ['h1', 'h2', 'h3', 'h4', 'p', 'a', 'button', 'span', 'nav', 'li']
      for (const tag of tags) {
        const elements = document.querySelectorAll(tag)
        for (const el of Array.from(elements).slice(0, 5)) {
          const style = window.getComputedStyle(el)
          data.push({
            family: style.fontFamily,
            tag,
            weight: style.fontWeight,
          })
        }
      }
      return data
    })
    const fontInfos = extractFonts(fontData)
    progress('Extracting fonts', 'done', `Found ${fontInfos.length} fonts`)

    // Step 5: Extract logos
    progress('Extracting logos', 'running')
    const logoInfos = await extractLogos(page)
    progress('Extracting logos', 'done', `Found ${logoInfos.length} logos`)

    // Step 6: Extract page text
    progress('Extracting content', 'running')
    const pageText = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      )
      const texts: string[] = []
      let node
      while ((node = walker.nextNode()) && texts.length < 100) {
        const text = node.textContent?.trim()
        if (text && text.length > 10) {
          texts.push(text)
        }
      }
      return texts.join('\n').slice(0, 5000)
    })
    progress('Extracting content', 'done')

    // Step 7: Analyze tone and audience with LLM
    progress('Analyzing tone', 'running')
    let analysisError: string | undefined
    const analysis = await analyzeBrandWithLLM(
      meta.name,
      meta.description,
      pageText,
      url,
      (err) => { analysisError = err }
    )
    progress(
      'Analyzing tone',
      analysisError ? 'error' : 'done',
      analysisError ? `LLM failed: ${analysisError} — using fallback` : undefined
    )

    progress('Complete', 'done')

    return {
      name: meta.name || new URL(url).hostname,
      tagline: meta.description || '',
      url,
      logoUrl: meta.logoUrl,
      favicon: meta.favicon,
      ogImage: meta.ogImage,
      logos: logoInfos,
      colors: colorInfos,
      fonts: fontInfos,
      tone: analysis.tone,
      audience: analysis.audience,
      industry: analysis.industry,
      category: analysis.category,
      keywords: analysis.keywords,
      rawText: pageText.slice(0, 2000),
    }
  } finally {
    if (browser) await browser.close()
  }
}

async function extractLogos(page: import('playwright').Page): Promise<LogoInfo[]> {
  return page.evaluate(() => {
    const results: { url: string; alt: string; width: number; height: number }[] = []
    const seen = new Set<string>()

    const imgs = Array.from(document.querySelectorAll('img'))
    for (const img of imgs) {
      const src = img.src || img.getAttribute('src') || ''
      if (!src || !src.startsWith('http')) continue

      const alt = (img.alt || '').toLowerCase()
      const src2 = src.toLowerCase()
      const classes = (img.className || '').toLowerCase()
      const id = (img.id || '').toLowerCase()
      const parent = (img.closest('[class]') as HTMLElement)?.className?.toLowerCase() || ''

      const isLogo =
        alt.includes('logo') ||
        src2.includes('logo') ||
        classes.includes('logo') ||
        id.includes('logo') ||
        parent.includes('logo') ||
        parent.includes('brand') ||
        parent.includes('header')

      if (isLogo && !seen.has(src)) {
        seen.add(src)
        results.push({
          url: src,
          alt: img.alt || 'Logo',
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0,
        })
        if (results.length >= 6) break
      }
    }

    return results
  })
}

async function extractMetaData(page: import('playwright').Page) {
  return page.evaluate(() => {
    const getMeta = (name: string) =>
      document
        .querySelector(`meta[property="${name}"], meta[name="${name}"]`)
        ?.getAttribute('content') || ''

    const toAbsolute = (href: string) => {
      if (!href) return ''
      if (href.startsWith('http')) return href
      return new URL(href, window.location.origin).href
    }

    const name =
      getMeta('og:site_name') ||
      getMeta('og:title') ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.title

    const description =
      getMeta('og:description') ||
      getMeta('description') ||
      document.querySelector('h1')?.textContent?.trim() ||
      ''

    const ogImage = toAbsolute(getMeta('og:image') || getMeta('og:image:url'))

    const faviconEl =
      document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]') ||
      document.querySelector<HTMLLinkElement>('link[rel="icon"][sizes="192x192"]') ||
      document.querySelector<HTMLLinkElement>('link[rel="icon"][sizes="128x128"]') ||
      document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]') ||
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    const favicon = toAbsolute(
      faviconEl?.getAttribute('href') || '/favicon.ico'
    )

    let logoUrl = ''
    const imgs = Array.from(document.querySelectorAll('img'))
    const logoImg = imgs.find(
      (img) =>
        img.alt?.toLowerCase().includes('logo') ||
        img.src?.toLowerCase().includes('logo') ||
        img.className?.toLowerCase().includes('logo')
    )
    if (logoImg) logoUrl = logoImg.src

    return {
      name,
      description,
      logoUrl: logoUrl || favicon || null,
      favicon: favicon || null,
      ogImage: ogImage || null,
    }
  })
}

function deriveIndustryFromText(
  name: string,
  description: string,
  url: string
): { industry: string; category: string } {
  const text = `${name} ${description} ${url}`.toLowerCase()

  if (/real.?estate|propert|properties|realt|housing|apartment|villa|mortgage/.test(text))
    return { industry: 'Real Estate', category: 'Property Development' }
  if (/health|medic|pharma|clinic|hospital|wellness|dental/.test(text))
    return { industry: 'Healthcare', category: 'Medical Services' }
  if (/finance|bank|invest|fund|capital|wealth|insurance|loan/.test(text))
    return { industry: 'Finance', category: 'Financial Services' }
  if (/restaurant|food|cafe|hotel|hospitality|travel|tourism|vin|wine|cramă/.test(text))
    return { industry: 'Hospitality', category: 'Food & Beverage' }
  if (/education|school|university|learn|training|course|academy/.test(text))
    return { industry: 'Education', category: 'Learning & Development' }
  if (/retail|shop|store|fashion|clothing|apparel|ecommerce/.test(text))
    return { industry: 'Retail', category: 'Consumer Goods' }
  if (/tech|software|saas|app|digital|platform|cloud|ai|data/.test(text))
    return { industry: 'Technology', category: 'Software & Digital' }
  if (/construct|build|architect|engineer|infrastructure|instal/.test(text))
    return { industry: 'Construction', category: 'Building & Infrastructure' }
  if (/consult|agency|marketing|advertis|pr |public relations/.test(text))
    return { industry: 'Professional Services', category: 'Consulting & Agency' }
  if (/avoca|juridic|drept|law|legal|notar/.test(text))
    return { industry: 'Legal Services', category: 'Law & Compliance' }
  if (/debitare|plasma|cnc|prelucrare|metal|sudur/.test(text))
    return { industry: 'Manufacturing', category: 'Metal & CNC' }

  return { industry: 'Business Services', category: 'General' }
}

interface BrandAnalysis {
  tone: ToneProfile
  audience: AudienceProfile
  industry: string
  category: string
  keywords: string[]
}

async function analyzeBrandWithLLM(
  name: string,
  description: string,
  pageText: string,
  url: string,
  onError?: (msg: string) => void
): Promise<BrandAnalysis> {
  const prompt = `Analyze this brand and return a JSON object. Do not include any text outside the JSON.

Brand: ${name}
URL: ${url}
Description: ${description}
Page Content (excerpt): ${pageText.slice(0, 3000)}

Return this exact JSON structure:
{
  "tone": {
    "primary": "<one of: formal, casual, playful, professional, authoritative, friendly, inspirational, technical, luxurious, minimalist>",
    "secondary": "<same options as primary>",
    "description": "<2-sentence description of their communication style>",
    "formality": <0-100>,
    "energy": <0-100>,
    "warmth": <0-100>
  },
  "audience": {
    "primary": "<primary target audience in one phrase>",
    "secondary": "<secondary audience>",
    "ageRange": "<e.g. 25-45>",
    "interests": ["<interest1>", "<interest2>", "<interest3>"],
    "painPoints": ["<pain point 1>", "<pain point 2>"]
  },
  "industry": "<industry name>",
  "category": "<specific category within industry>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"]
}`

  try {
    return await generateJSON<BrandAnalysis>([
      {
        role: 'system',
        content:
          'You are a brand analyst. Analyze brands and return structured JSON. Be specific and insightful.',
      },
      { role: 'user', content: prompt },
    ], { json: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Brand DNA] LLM analysis failed:', msg)
    onError?.(msg)
    // Fallback — derive basic context from brand text
    const { industry, category } = deriveIndustryFromText(name, description, url)
    const domainKeywords = url
      .replace(/https?:\/\/(www\.)?/, '')
      .split(/[./\-_]/)[0]
    return {
      tone: {
        primary: 'professional',
        secondary: 'friendly',
        description: `${name} communicates in a professional and approachable manner.`,
        formality: 60,
        energy: 50,
        warmth: 60,
      },
      audience: {
        primary: 'Potential clients',
        secondary: 'Business partners',
        ageRange: '25-55',
        interests: [industry.toLowerCase(), 'quality', 'value'],
        painPoints: ['finding reliable partners', 'quality assurance'],
      },
      industry,
      category,
      keywords: [name.toLowerCase(), domainKeywords || '', industry.toLowerCase(), 'brand', 'services'].filter(
        (v, i, a) => v && a.indexOf(v) === i
      ),
    }
  }
}
