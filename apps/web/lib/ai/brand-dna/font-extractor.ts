// ─── Font Extractor ───
// Ported from DNA Studio (MIT)

import type { FontInfo } from './types'

const GENERIC_FONTS = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace',
  '-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
  'Arial', 'Helvetica', 'Times New Roman', 'Verdana',
  'Georgia', 'Tahoma', 'Trebuchet MS', 'Courier New',
])

export function extractFonts(
  fontData: { family: string; tag: string; weight: string }[]
): FontInfo[] {
  const fontMap = new Map<string, { tags: Set<string>; weight: string }>()

  for (const { family, tag, weight } of fontData) {
    // Parse font-family stack and take the first non-generic one
    const families = family.split(',').map((f) => f.trim().replace(/['"]/g, ''))
    const meaningful = families.find((f) => !GENERIC_FONTS.has(f))
    if (!meaningful) continue

    if (!fontMap.has(meaningful)) {
      fontMap.set(meaningful, { tags: new Set(), weight })
    }
    fontMap.get(meaningful)!.tags.add(tag.toLowerCase())
  }

  const fonts: FontInfo[] = []

  for (const [family, { tags, weight }] of fontMap) {
    let usage: FontInfo['usage'] = 'body'

    if (tags.has('h1') || tags.has('h2') || tags.has('h3')) {
      usage = 'heading'
    } else if (tags.has('button') || tags.has('a') || tags.has('nav')) {
      usage = 'accent'
    }

    fonts.push({ family, usage, weight })
  }

  // Limit to 3 most relevant fonts
  return fonts.slice(0, 3)
}
