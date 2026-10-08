/**
 * Attribute extraction from supplier English descriptions + group names.
 *
 *   "FRONT BUMPER PRIMED (W/2 PDC & WASHER HOLES) (F-SPORT)"
 *   → { primed: true, pdcHoles: 2, washerHoles: true, trim: "F-SPORT" }
 *
 * Attributes are stored as JSON on CommerceProduct and used for storefront filters
 * and the product configurator.
 */

export interface ProductAttributes {
  primed?: boolean
  pdcHoles?: number | boolean // number of parking sensor holes, true = unspecified count, false = without
  fogLampHoles?: boolean
  washerHoles?: boolean
  heated?: boolean
  electric?: boolean
  foldable?: boolean
  sideLamp?: boolean
  blis?: boolean // blind spot
  memory?: boolean
  led?: boolean
  xenon?: boolean
  motor?: boolean
  glass?: 'convex' | 'aspherical' | 'flat'
  color?: string
  material?: string
  pins?: number
  bulb?: string
  trim?: string[]
  yearUntil?: number
  yearFrom?: number
  eMark?: boolean
  set?: boolean
  part?: 'upper' | 'lower' | 'front' | 'rear' | 'central' | 'outer' | 'inner'
  origin?: string
}

export interface GroupInfo {
  brand: string | null
  quality: 'OE' | 'A' | 'B' | 'aftermarket' | null
}

const BRANDS = ['DEPO', 'TYC', 'VALEO', 'MARELLI', 'HELLA', 'NRF', 'KOYO', 'NISSENS', 'ALGO', 'ULO', 'BOSCH', 'DENSO', 'MAHLE']
const TRIMS = ['M-SPORT', 'AMG-LINE', 'AMG LINE', 'S-LINE', 'R-LINE', 'F-SPORT', 'GTI', 'RS', 'ST', 'N-LINE', 'ELEGANCE', 'ELEGENCE', 'AVANTGARDE', 'GT-LINE', 'FR', 'ST-LINE', 'TITANIUM', 'OPC']

export function parseGroup(group: string): GroupInfo {
  const g = group.toUpperCase()
  const brand = BRANDS.find((b) => new RegExp(`\\b${b}\\b`).test(g)) || null
  let quality: GroupInfo['quality'] = null
  if (/\bORIGINAL\b/.test(g)) quality = 'OE'
  else if (/\bA QUALITY\b/.test(g)) quality = 'A'
  else if (/\bB QUALITY\b/.test(g)) quality = 'B'
  else if (/AFTER ?MARKET/.test(g)) quality = 'aftermarket'
  return { brand: brand ? brand.charAt(0) + brand.slice(1).toLowerCase() : null, quality }
}

export function parseAttributes(descEn: string): { attributes: ProductAttributes; brand: string | null; quality: GroupInfo['quality'] } {
  const d = ` ${descEn.toUpperCase().replace(/\s+/g, ' ')} `
  const a: ProductAttributes = {}

  if (/\bPRIMED\b/.test(d)) a.primed = true

  const pdc = /W\/\s?(\d+)\s?PDC/.exec(d)
  if (pdc) a.pdcHoles = Number(pdc[1])
  else if (/W\/O\s?PDC/.test(d)) a.pdcHoles = false
  else if (/W\/\s?PDC|PDC HOLES/.test(d)) a.pdcHoles = true

  if (/W\/O\s?FOG|WITHOUT FOG/.test(d)) a.fogLampHoles = false
  else if (/FOG LAMP HOLE/.test(d)) a.fogLampHoles = true

  if (/WASHER HOLE|W\/\s?(HEAD ?LAMP )?WASHER/.test(d)) a.washerHoles = true
  if (/\bHEATED\b/.test(d)) a.heated = true
  if (/\bELECTRICAL?\b/.test(d)) a.electric = true
  if (/\bFOLDABLE|FOLDING\b/.test(d)) a.foldable = true
  if (/W\/\s?SIDE LAMP/.test(d)) a.sideLamp = true
  if (/\bBLIS\b|SIDE ASSIST/.test(d)) a.blis = true
  if (/W\/\s?MEMORY/.test(d)) a.memory = true
  if (/\bLED\b/.test(d)) a.led = true
  if (/\bXENON\b/.test(d)) a.xenon = true
  if (/W\/O\s?MOTOR/.test(d)) a.motor = false
  else if (/W\/\s?MOTOR|MOTOR\+FAN/.test(d)) a.motor = true

  if (/CONVEX/.test(d)) a.glass = 'convex'
  else if (/ASPHERICAL/.test(d)) a.glass = 'aspherical'
  else if (/FLAT GLASS/.test(d)) a.glass = 'flat'

  const color = /\b(BLACK|CHROME|GR[AE]Y|WHITE|SILVER|SMOKED|AMBER|RED|CLEAR)\b/.exec(d)
  if (color) a.color = color[1]!.replace('GRAY', 'GREY').toLowerCase()
  if (/\bALUMINI?UM\b/.test(d)) a.material = 'aluminium'
  else if (/\bSTEEL\b/.test(d)) a.material = 'steel'
  else if (/\bPLASTIC\b/.test(d)) a.material = 'plastic'

  const pins = /\b(\d{1,2})\s?PINS?\b/.exec(d)
  if (pins) a.pins = Number(pins[1])
  const bulb = /\b(H\d{1,2}|HB[34]|HIR2|D[1-8][SR]|P21W|PY21W|W5W)\b/.exec(d)
  if (bulb) a.bulb = bulb[1]

  const trims = TRIMS.filter((t) => d.includes(`(${t})`) || d.includes(` ${t} `)).map((t) => t.replace('ELEGENCE', 'ELEGANCE'))
  if (trims.length) a.trim = [...new Set(trims)]

  const until = /\s-((?:19|20)\d{2})\b/.exec(d)
  if (until) a.yearUntil = Number(until[1])
  const from = /\b((?:19|20)\d{2})-(?!\d)/.exec(d)
  if (from) a.yearFrom = Number(from[1])

  if (/\(E\)/.test(d)) a.eMark = true
  if (/\(SET\)|\bSET\b/.test(d)) a.set = true

  const part = /\b(UPPER|LOWER|CENTRAL|OUTER|INNER) PART\b|\((FRONT|REAR) PART\)/.exec(d)
  if (part) a.part = (part[1] || part[2])!.toLowerCase() as ProductAttributes['part']
  else if (/\bUPPER\b/.test(d)) a.part = 'upper'
  else if (/\bLOWER\b/.test(d)) a.part = 'lower'

  const origin = /\((TURKEY|TAIWAN|CHINA|ITALY|SPAIN|POLAND)\)/.exec(d)
  if (origin) a.origin = origin[1]!.toLowerCase()

  const g = parseGroup(d)
  return { attributes: a, brand: g.brand, quality: g.quality }
}

/** Merge group-level and description-level brand/quality (description wins when explicit). */
export function resolveBrandQuality(desc: ReturnType<typeof parseAttributes>, group: GroupInfo): GroupInfo {
  return {
    brand: desc.brand || group.brand,
    quality: desc.quality || group.quality,
  }
}
