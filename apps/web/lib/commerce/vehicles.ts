/**
 * Vehicle name parser for supplier model strings.
 *
 * Examples (gr-txt-v1 feed, column 8):
 *   "DACIA LOGAN III 2021- (3K)"
 *   "VW GOLF VI 2008-2013 (5K1)"
 *   "KIA RIO H/B 2014-2017 (UB)"
 *   "BMW SERIES 2 ACTIVE/GRAN TOURER 2014-2017 (F45/F46"   ← unclosed paren
 *   "TESLA MODEL X 2016-(5YJX)"
 *   "DAEWOO NUBIRA 1997-1999 (J100)" with make column "DAEWOO - CHEVROLET"
 *
 * Output is deterministic so re-imports map to the same slugs.
 * Imperfect parses can be corrected manually in the ERP (CommerceModelMap.isManual).
 */
import { slugify, titleCase } from './text'

export interface ParsedVehicle {
  makeName: string
  makeSlug: string
  modelName: string
  modelSlug: string
  generationName: string
  generationSlug: string
  variant: string | null
  yearFrom: number | null
  yearTo: number | null
  chassisCodes: string[]
  bodyTypes: string[]
}

const YEAR_RE = /^(.*?)\s+((?:19|20)\d{2})\s*-\s*((?:19|20)\d{2})?\s*((?:\([^)]*\)?\s*)*)$/

// Tokens describing body style (kept as variant + bodyTypes, not part of model family)
const BODY_TOKENS: Record<string, string> = {
  'H/B': 'hatchback',
  HB: 'hatchback',
  SDN: 'sedan',
  SEDAN: 'sedan',
  'S.W.': 'break',
  SW: 'break',
  'S/W': 'break',
  ESTATE: 'break',
  AVANT: 'break',
  VARIANT: 'break',
  TOURING: 'break',
  KOMBI: 'break',
  COMBI: 'break',
  BREAK: 'break',
  COUPE: 'coupe',
  CABRIO: 'cabrio',
  CABRIOLET: 'cabrio',
  CONVERTIBLE: 'cabrio',
  ROADSTER: 'cabrio',
  SPIDER: 'cabrio',
  'P/U': 'pickup',
  'P.UP': 'pickup',
  PICKUP: 'pickup',
  VAN: 'van',
  MCV: 'break',
  '2D': '2 uși',
  '3D': '3 uși',
  '4D': '4 uși',
  '5D': '5 uși',
}

// First tokens that need the following token to form the model family name
const TWO_WORD_PREFIX = new Set([
  'SERIES', 'MODEL', 'GRAND', 'LAND', 'RANGE', 'NEW', 'ALFA', 'TOWN', 'SANTA', 'GRANDE',
])


function stripMakePrefix(name: string, makeRaw: string): { make: string; rest: string } {
  const upper = name.toUpperCase()
  // Combined makes like "DAEWOO - CHEVROLET": take the real make from the name
  const candidates = makeRaw.split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean)
  for (const c of candidates) {
    if (upper.startsWith(c.toUpperCase() + ' ')) {
      return { make: c, rest: name.slice(c.length).trim() }
    }
  }
  // Fallback: first word of the name is the make
  const [first, ...rest] = name.split(/\s+/)
  return { make: candidates[0] || first || makeRaw, rest: rest.join(' ') }
}

/**
 * Returns null when the string is not a vehicle (accessories, universal items).
 */
export function parseVehicleName(raw: string, makeRaw: string): ParsedVehicle | null {
  const cleaned = raw.replace(/\s+/g, ' ').trim()
  const m = YEAR_RE.exec(cleaned)
  if (!m) return null

  const namePart = m[1]!.trim()
  const yearFrom = Number(m[2])
  const yearTo = m[3] ? Number(m[3]) : null
  const parenGroups = [...(m[4] || '').matchAll(/\(([^)]*)\)?/g)].map((g) => g[1]!.trim()).filter(Boolean)
  // Last group = chassis codes; earlier groups (e.g. "T5", "EXPORT TYPE") belong to the label
  const chassisCodes = (parenGroups.pop() || '')
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 12)

  const { make, rest: restBase } = stripMakePrefix(namePart, makeRaw)
  const rest = [restBase, ...parenGroups].filter(Boolean).join(' ')
  const tokens = rest.split(' ').filter(Boolean)
  if (tokens.length === 0) return null

  // Model family = first token (or first two for generic prefixes / Mercedes "E CLASS")
  let familyLen = 1
  let familyStart = 0
  const t0 = tokens[0]!.toUpperCase()
  const t1 = tokens[1]?.toUpperCase()
  // Electric prefix "e JUMPER" → family Jumper, variant "e"
  const electricPrefix = t0 === 'E' && tokens.length > 1 && t1 !== 'CLASS'
  if (electricPrefix) familyStart = 1
  const ft0 = tokens[familyStart]!.toUpperCase()
  const ft1 = tokens[familyStart + 1]?.toUpperCase()
  if (TWO_WORD_PREFIX.has(ft0) && tokens.length > familyStart + 1) familyLen = 2
  if (ft1 === 'CLASS' || ft1 === 'KLASSE') familyLen = 2
  // "LOGAN-MCV/P.UP/VAN" → family "LOGAN", variant "MCV/P.UP/VAN"
  let family = tokens.slice(familyStart, familyStart + familyLen).join(' ')
  let variantFromFamily: string | null = electricPrefix ? 'e' : null
  const hy = familyLen === 1 ? /^([A-Z0-9]+)-((?:MCV|VAN|P\.UP)(?:\/.*)?)$/i.exec(family) : null
  if (hy) {
    family = hy[1]!
    variantFromFamily = hy[2]!
  } else if (familyLen === 1 && family.includes('/') && !/^P\/U$/i.test(family)) {
    // "JUMPY/SPACE" → "JUMPY"
    family = family.split('/')[0]!
  }

  const bodyTypes = new Set<string>()
  const variantTokens: string[] = []
  if (variantFromFamily) {
    variantTokens.push(variantFromFamily)
    for (const part of variantFromFamily.split('/')) {
      const b = BODY_TOKENS[part.toUpperCase()]
      if (b) bodyTypes.add(b)
    }
  }
  for (const tok of tokens.slice(familyStart + familyLen)) {
    const up = tok.toUpperCase()
    const b = BODY_TOKENS[up]
    if (b) {
      bodyTypes.add(b)
      variantTokens.push(tok)
    }
  }

  const makeName = titleCase(make)
  const modelName = titleCase(family)
  const genLabel = titleCase(rest) // full remainder incl. roman numeral / variant
  const years = `${yearFrom}-${yearTo ?? ''}`
  const generationName = `${genLabel} (${years})`

  return {
    makeName,
    makeSlug: slugify(make),
    modelName,
    modelSlug: slugify(family),
    generationName,
    generationSlug: slugify(`${rest} ${yearFrom} ${yearTo ?? ''}`),
    variant: variantTokens.length ? variantTokens.join(' ') : null,
    yearFrom,
    yearTo,
    chassisCodes,
    bodyTypes: [...bodyTypes],
  }
}

