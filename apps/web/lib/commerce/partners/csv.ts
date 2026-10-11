/**
 * CSV import for partner services (e.g. a Google Maps export). Tolerant on headers (RO/EN synonyms) and delimiters (, ; tab).
 * Pure functions: parsing and normalisation only; the database part lives in service.ts.
 */
import { PartnerFields } from './schemas'

export const MAX_CSV_BYTES = 2 * 1024 * 1024
export const MAX_CSV_ROWS = 2000

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const first = src.split(/\r?\n/, 1)[0] ?? ''
  const delim = [',', ';', '\t'].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0]
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQ = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!
    if (inQ) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else inQ = false } else cell += c
    } else if (c === '"') inQ = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

const strip = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const HEADERS: Record<string, string[]> = {
  name: ['name', 'title', 'nume', 'denumire', 'business name'],
  address: ['address', 'adresa', 'full address', 'street address'],
  city: ['city', 'oras', 'localitate'],
  county: ['county', 'judet', 'state', 'region'],
  phone: ['phone', 'telefon', 'phone number', 'phone 1'],
  email: ['email', 'e mail', 'mail'],
  website: ['website', 'site', 'web', 'url website', 'domain'],
  lat: ['lat', 'latitude', 'latitudine'],
  lng: ['lng', 'lon', 'long', 'longitude', 'longitudine'],
  googlePlaceId: ['place id', 'placeid', 'google place id', 'place_id'],
  googleMapsUrl: ['maps url', 'google maps url', 'google maps link', 'link', 'url', 'maps link'],
  rating: ['rating', 'stars', 'review rating', 'average rating'],
  ratingCount: ['reviews', 'review count', 'ratings count', 'user ratings total', 'number of reviews', 'reviews count'],
  contactPerson: ['contact', 'contact person', 'persoana de contact'],
  notes: ['notes', 'note', 'observatii', 'category', 'categories', 'categorie'],
}

export function mapHeaders(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {}
  const norm = header.map(strip)
  for (const [field, names] of Object.entries(HEADERS)) {
    const at = norm.findIndex((h) => names.map(strip).includes(h))
    if (at >= 0) idx[field] = at
  }
  return idx
}

/** "0721 123 456" / "+40 721-123-456" / "0040721123456" → "+40721123456"; anything else is kept digits-only or dropped. */
export function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null
  let d = raw.replace(/[^\d+]/g, '')
  if (d.startsWith('0040')) d = '+40' + d.slice(4)
  else if (/^0\d{9}$/.test(d)) d = '+40' + d.slice(1)
  else if (/^40\d{9}$/.test(d)) d = '+' + d
  return /^\+?\d{7,15}$/.test(d) ? d : null
}

/** Bucharest addresses are the common case here: "Sector 3, București" → city/county București. */
export function inferLocation(address: string | null, city: string | null, county: string | null): { city: string | null; county: string | null } {
  const hay = strip([address, city, county].filter(Boolean).join(' '))
  if (/\b(bucuresti|bucharest)\b/.test(hay) || /\bsector [1-6]\b/.test(hay)) {
    return { city: city ?? 'București', county: county ?? 'București' }
  }
  return { city, county }
}

/** Keeps only plain http(s) URLs with a real host name; "rapid.ro" becomes https://rapid.ro, "javascript:…" is dropped. */
export function cleanWebsite(raw: string): string | null {
  const v = raw.trim()
  if (!v || /^[a-z][a-z0-9+.-]*:(?!\/\/)/i.test(v)) return null
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || u.username || u.password) return null
    return u.toString().replace(/\/$/, '')
  } catch { return null }
}

export const dedupeKey = (name: string, address: string | null) => `${strip(name)}|${strip(address ?? '')}`

export interface ParsedPartner { row: number; data: ReturnType<typeof PartnerFields.parse> }
export interface ParseResult {
  partners: ParsedPartner[]
  invalid: Array<{ row: number; reason: string }>
  missingHeaders: string[]
}

export function parsePartnersCsv(text: string): ParseResult {
  if (Buffer.byteLength(text) > MAX_CSV_BYTES) throw new Error('CSV prea mare (max 2 MB)')
  const rows = parseCsv(text)
  const out: ParseResult = { partners: [], invalid: [], missingHeaders: [] }
  if (rows.length < 2) { out.missingHeaders.push('name'); return out }
  if (rows.length - 1 > MAX_CSV_ROWS) throw new Error(`CSV are prea multe rânduri (max ${MAX_CSV_ROWS})`)
  const idx = mapHeaders(rows[0]!)
  if (idx.name == null) { out.missingHeaders.push('name'); return out }
  const get = (r: string[], f: string) => (idx[f] != null ? (r[idx[f]!] ?? '').trim() : '')
  const num = (v: string) => { const n = Number(v.replace(',', '.')); return v !== '' && Number.isFinite(n) ? n : null }
  rows.slice(1).forEach((r, i) => {
    const rowNo = i + 2
    const address = get(r, 'address') || null
    const loc = inferLocation(address, get(r, 'city') || null, get(r, 'county') || null)
    const website = get(r, 'website')
    const mapsUrl = get(r, 'googleMapsUrl')
    const candidate = {
      name: get(r, 'name'), address, city: loc.city, county: loc.county,
      phone: normalizePhone(get(r, 'phone')), email: get(r, 'email') || null,
      website: cleanWebsite(website),
      lat: num(get(r, 'lat')), lng: num(get(r, 'lng')),
      googlePlaceId: get(r, 'googlePlaceId') || null,
      googleMapsUrl: /^https?:\/\//i.test(mapsUrl) ? mapsUrl : null,
      rating: num(get(r, 'rating')), ratingCount: (() => { const n = num(get(r, 'ratingCount').replace(/[^\d.,]/g, '')); return n == null ? null : Math.round(n) })(),
      contactPerson: get(r, 'contactPerson') || null, notes: get(r, 'notes') || null,
      status: 'prospect' as const, source: 'csv' as const, services: [] as never[],
    }
    const p = PartnerFields.safeParse(candidate)
    if (p.success) out.partners.push({ row: rowNo, data: p.data })
    else out.invalid.push({ row: rowNo, reason: p.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ').slice(0, 200) })
  })
  return out
}
