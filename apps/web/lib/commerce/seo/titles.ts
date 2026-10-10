/**
 * SEO title / description / slug for a sellable part, built from its Romanian base name, side and compatible vehicles.
 * Pure functions (no DB): the base name (nameRo) is never changed, these are derived fields.
 *
 *   title:  {Piesă} {stânga|dreapta} {Marcă} {Model[, Model…]} {an–an}      (≤ 70 characters, most detailed variant that fits)
 *   slug:   slugified title + "-" + SKU                                      (the "-SKU" suffix is part of the storefront contract)
 */
import { slugify } from '../text'

export interface VehicleRef { make: string; model: string; yearFrom: number | null; yearTo: number | null }
export interface SeoInput { sku: string; nameRo: string; side: string | null; oeMain: string | null; vehicles: VehicleRef[] }
export interface SeoOutput {
  title: string
  description: string
  slug: string
  hasVehicle: boolean
  modelCount: number
  /** true when even the shortest variant had to be cut */
  truncated: boolean
  /** which level of detail was used: 0 = with years, 1 = without years, 2 = first vehicle, 3 = make only, 4 = name only */
  level: number
  /** trailing technical parentheses were left out of the title to make room for the vehicle */
  shortened: boolean
}

export const TITLE_MAX = 70
const DESC_MAX = 160
const SLUG_TEXT_MAX = 100
const SIDE_RE = /\b(st[aâă]nga|dreapta|stg|drt)\b/i

const clean = (s: string) => s.replace(/\s+/g, ' ').replace(/[\s.,;:-]+$/, '').trim()

export function yearRange(vs: Array<Pick<VehicleRef, 'yearFrom' | 'yearTo'>>): string {
  const froms = vs.map((v) => v.yearFrom).filter((x): x is number => x != null)
  if (!froms.length) {
    const tos = vs.map((v) => v.yearTo).filter((x): x is number => x != null)
    return tos.length ? `până în ${Math.max(...tos)}` : ''
  }
  const from = Math.min(...froms)
  const open = vs.some((v) => v.yearFrom != null && v.yearTo == null)
  if (open) return `din ${from}`
  const to = Math.max(...vs.map((v) => v.yearTo ?? v.yearFrom!))
  return to === from ? String(from) : `${from}-${to}`
}

function uniqueVehicles(vs: VehicleRef[]): VehicleRef[] {
  // one entry per make+model, years merged
  const map = new Map<string, VehicleRef>()
  for (const v of vs) {
    const key = `${v.make}\u0000${v.model}`
    const cur = map.get(key)
    if (!cur) { map.set(key, { ...v }); continue }
    cur.yearFrom = cur.yearFrom == null ? v.yearFrom : v.yearFrom == null ? cur.yearFrom : Math.min(cur.yearFrom, v.yearFrom)
    // an open-ended generation keeps the merged range open
    cur.yearTo = cur.yearTo == null || v.yearTo == null ? null : Math.max(cur.yearTo, v.yearTo)
  }
  return [...map.values()].sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model))
}

function vehiclePhrase(vs: VehicleRef[]): string {
  if (!vs.length) return ''
  const makes = [...new Set(vs.map((v) => v.make))]
  if (vs.length <= 3) {
    if (makes.length === 1) return `${makes[0]} ${vs.map((v) => v.model).join(', ')}`
    return vs.map((v) => `${v.make} ${v.model}`).join(', ')
  }
  if (makes.length === 1) return `${makes[0]} (${vs.length} modele)`
  return `${makes.slice(0, 2).join(', ')} și altele`
}

export function buildSeo(input: SeoInput): SeoOutput {
  const vs = uniqueVehicles(input.vehicles)
  // a stray trailing year hint in the name ("… 2000-", "… 1996-2002") is dropped: the vehicle years say it better
  let base = clean(vs.length > 0 ? input.nameRo.replace(/\s+(?:19|20)\d{2}\s*-\s*(?:(?:19|20)\d{2})?\s*$/, '') : input.nameRo)
  const side = input.side === 'L' ? 'stânga' : input.side === 'R' ? 'dreapta' : ''
  const sidePart = side && !SIDE_RE.test(base) ? side : ''
  const head = clean(`${base} ${sidePart}`)
  const years = yearRange(vs)
  const full = vehiclePhrase(vs)
  const first = vs[0]

  const candidates: string[] = [
    clean(`${head} ${full} ${years}`),
    clean(`${head} ${full}`),
    first ? clean(`${head} ${first.make} ${first.model}`) : '',
    first ? clean(`${head} ${first.make}`) : '',
    head,
  ]
  // Title: keep make+model over technical parentheses. Try the full name first, then drop trailing "(…)" groups one by one.
  const heads: string[] = [head]
  for (let b = base; ;) {
    const next = clean(b.replace(/\s*\([^()]*\)\s*$/, ''))
    if (next === b || !next) break
    heads.push(clean(`${next} ${sidePart}`)); b = next
  }
  const detail = (h: string, d: number): string =>
    d === 0 ? clean(`${h} ${full} ${years}`) : d === 1 ? clean(`${h} ${full}`) : d === 2 && first ? clean(`${h} ${first.make} ${first.model}`) : d === 3 && first ? clean(`${h} ${first.make}`) : h
  let level = -1, title = '', shortened = false
  if (vs.length > 0) {
    outer: for (const d of [0, 1, 2, 3]) {
      for (let i = 0; i < heads.length; i++) {
        const c = detail(heads[i]!, d)
        if (c.length <= TITLE_MAX) { level = d; title = c; shortened = i > 0; break outer }
      }
    }
  }
  let truncated = false
  if (level === -1) {
    level = 4
    const h = heads.find((x) => x.length <= TITLE_MAX) ?? head
    shortened = h !== head
    if (h.length <= TITLE_MAX) title = h
    else {
      truncated = true
      const cut = h.slice(0, TITLE_MAX + 1)
      title = clean(cut.slice(0, cut.lastIndexOf(' ') > 30 ? cut.lastIndexOf(' ') : TITLE_MAX))
    }
  }

  // description: most detailed text that fits, then the standard facts
  const detailed = candidates[0] || head
  const facts = `Cod produs ${input.sku}${input.oeMain ? `, cod OE ${input.oeMain}` : ''}. Plată ramburs, comandă confirmată telefonic.`
  let description = `${detailed}. ${facts}`
  if (description.length > DESC_MAX) description = `${title}. ${facts}`
  if (description.length > DESC_MAX) description = `${title}. Cod produs ${input.sku}. Plată ramburs.`

  // slug from the most detailed variant (years included), cut at a hyphen boundary, then "-SKU"
  let text = slugify(detailed) || 'piesa-auto'
  if (text.length > SLUG_TEXT_MAX) { text = text.slice(0, SLUG_TEXT_MAX); const i = text.lastIndexOf('-'); if (i > 20) text = text.slice(0, i) }
  const slug = `${text}-${input.sku}`

  return { title, description, slug, hasVehicle: vs.length > 0, modelCount: vs.length, truncated, level, shortened }
}

/**
 * Titles shared by several products: append the OE code in parentheses when it still fits, so near-identical variants differ.
 * `titles` is index-aligned with `oe`; returns the new titles (unchanged where no room or no OE code).
 */
export function disambiguate(titles: string[], oe: Array<string | null>): string[] {
  const count = new Map<string, number>()
  for (const t of titles) count.set(t, (count.get(t) ?? 0) + 1)
  return titles.map((t, i) => {
    if ((count.get(t) ?? 0) < 2 || !oe[i]) return t
    const c = `${t} (${oe[i]})`
    return c.length <= TITLE_MAX ? c : t
  })
}
