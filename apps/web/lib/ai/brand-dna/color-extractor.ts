// ─── Color Extractor ───
// Ported from DNA Studio (MIT) — extracts and classifies colors from CSS

import type { ColorInfo } from './types'

const COLOR_NAMES: Record<string, string> = {
  '#000000': 'Black',
  '#FFFFFF': 'White',
  '#FF0000': 'Red',
  '#00FF00': 'Green',
  '#0000FF': 'Blue',
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [
    parseInt(result[1]!, 16),
    parseInt(result[2]!, 16),
    parseInt(result[3]!, 16),
  ]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function getColorName(hex: string): string {
  const upper = hex.toUpperCase()
  if (COLOR_NAMES[upper]) return COLOR_NAMES[upper]!

  const [, s, l] = rgbToHsl(...hexToRgb(hex))
  if (l < 10) return 'Black'
  if (l > 90) return 'White'
  if (s < 10) return 'Gray'

  const [h] = rgbToHsl(...hexToRgb(hex))
  if (h < 15) return 'Red'
  if (h < 45) return 'Orange'
  if (h < 65) return 'Yellow'
  if (h < 170) return 'Green'
  if (h < 200) return 'Cyan'
  if (h < 260) return 'Blue'
  if (h < 290) return 'Purple'
  if (h < 340) return 'Pink'
  return 'Red'
}

function classifyColorUsage(
  index: number,
  _rgb: [number, number, number],
  total: number
): ColorInfo['usage'] {
  if (index === 0) return 'primary'
  if (index === 1) return 'secondary'
  if (index === 2) return 'accent'
  if (index >= total - 1) return 'text'
  return 'background'
}

export function extractColorsFromCSS(cssColors: string[]): ColorInfo[] {
  const hexRegex = /#[0-9a-fA-F]{3,8}/g
  const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g

  const colorSet = new Map<string, number>()

  for (const color of cssColors) {
    const hexMatches = color.match(hexRegex)
    if (hexMatches) {
      for (const hex of hexMatches) {
        let normalized = hex
        if (hex.length === 4) {
          normalized = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        }
        normalized = normalized.toUpperCase().slice(0, 7)
        colorSet.set(normalized, (colorSet.get(normalized) || 0) + 1)
      }
    }

    let rgbMatch
    while ((rgbMatch = rgbRegex.exec(color)) !== null) {
      const r = parseInt(rgbMatch[1]!)
      const g = parseInt(rgbMatch[2]!)
      const b = parseInt(rgbMatch[3]!)
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
      colorSet.set(hex, (colorSet.get(hex) || 0) + 1)
    }
  }

  // Sort by frequency, filter boring colors
  const sorted = [...colorSet.entries()]
    .filter(([hex]) => {
      const [, s, l] = rgbToHsl(...hexToRgb(hex))
      return !(l > 97 || l < 3 || (s < 5 && l > 85))
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return sorted.map(([hex], index) => {
    const rgb = hexToRgb(hex)
    return {
      hex,
      name: getColorName(hex),
      usage: classifyColorUsage(index, rgb, sorted.length),
      rgb,
    }
  })
}
