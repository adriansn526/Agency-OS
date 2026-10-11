/**
 * Google Places API (New) text search, used only to FIND garages that do bodywork/painting ("tinichigerie / vopsitorie").
 *
 * - The API key (GOOGLE_MAPS_API_KEY) is read server-side only and never returned, logged or put in an error message.
 * - Cost control: at most MAX_PAGES requests per search and a daily request cap (GOOGLE_PLACES_MAX_REQUESTS_PER_DAY, default 100),
 *   counted in CommerceServicePartnerSearch. Phone/website/rating make each request an "Enterprise" SKU, so the cap matters.
 * - What is kept from a result, and where, is decided by leads.ts (CRM lead, internal only; Place ID is the durable key).
 */
import { db } from '@repo/db'
import { inferLocation, cleanWebsite, normalizePhone } from './csv'

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.websiteUri', 'places.rating', 'places.userRatingCount', 'places.googleMapsUri',
  'places.types', 'places.primaryType', 'places.businessStatus', 'nextPageToken',
].join(',')
export const MAX_PAGES = 3
const PAGE_SIZE = 20

export class PlacesError extends Error {
  constructor(message: string, readonly status = 502) { super(message) }
}

export interface PlaceResult {
  placeId: string
  name: string
  address: string | null
  city: string | null
  county: string | null
  phone: string | null
  website: string | null
  mapsUrl: string | null
  rating: number | null
  ratingCount: number | null
  lat: number | null
  lng: number | null
  types: string[]
  businessStatus: string | null
  /** name says paint shop */ paintLikely: boolean
  /** name says body shop / car-body repair */ bodyLikely: boolean
  /** looks like an auto repair business at all */ relevant: boolean
}

const strip = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Names are the only signal Google gives; "unknown" means call and ask. */
export function classify(name: string, types: string[]): Pick<PlaceResult, 'paintLikely' | 'bodyLikely' | 'relevant'> {
  const n = strip(name)
  const paintLikely = /vopsit|vopsea|vopsire|\bpaint|lacuire|\blac\b/.test(n)
  const bodyLikely = /tinichig|caroseri|body ?shop|auto ?body|dezmembr?|\bpanel/.test(n)
  const autoType = types.some((t) => ['car_repair', 'car_body_shop', 'auto_body_shop', 'car_painting'].includes(t))
  return { paintLikely, bodyLikely, relevant: paintLikely || bodyLikely || autoType || /\bauto\b|service|garaj|moto/.test(n) }
}

/** "Str. X 5, Sector 3, 030167 București, România" → city/county. Outside Bucharest only the city can be read reliably. */
export function locationFromAddress(address: string | null): { city: string | null; county: string | null } {
  if (!address) return { city: null, county: null }
  const loc = inferLocation(address, null, null)
  if (loc.city) return loc
  const m = /\b\d{6}\s+([^,]+)/.exec(address)
  return { city: m ? m[1]!.trim() : null, county: null }
}

interface RawPlace {
  id?: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number }
  nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string; rating?: number; userRatingCount?: number
  googleMapsUri?: string; types?: string[]; businessStatus?: string
}

export function parsePlace(r: RawPlace): PlaceResult | null {
  if (!r.id || !r.displayName?.text) return null
  const name = r.displayName.text.replace(/[\u0000-\u001f\u007f\s]+/g, ' ').trim().slice(0, 200)
  const address = r.formattedAddress ? r.formattedAddress.slice(0, 300) : null
  const types = (r.types ?? []).slice(0, 12)
  const loc = locationFromAddress(address)
  const maps = r.googleMapsUri && /^https:\/\/(www\.)?google\.[a-z.]+\//.test(r.googleMapsUri) ? r.googleMapsUri : null
  return {
    placeId: r.id, name, address, city: loc.city, county: loc.county,
    phone: normalizePhone(r.internationalPhoneNumber ?? r.nationalPhoneNumber),
    website: r.websiteUri ? cleanWebsite(r.websiteUri) : null,
    mapsUrl: maps,
    rating: typeof r.rating === 'number' ? r.rating : null, ratingCount: typeof r.userRatingCount === 'number' ? r.userRatingCount : null,
    lat: r.location?.latitude ?? null, lng: r.location?.longitude ?? null,
    types, businessStatus: r.businessStatus ?? null, ...classify(name, types),
  }
}

export function dailyCap(): number {
  const n = Number(process.env.GOOGLE_PLACES_MAX_REQUESTS_PER_DAY ?? 100)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 100
}

export async function requestsUsedToday(): Promise<number> {
  const since = new Date(); since.setUTCHours(0, 0, 0, 0)
  const r = await db.commerceServicePartnerSearch.aggregate({ where: { createdAt: { gte: since } }, _sum: { requests: true } })
  return r._sum.requests ?? 0
}

export interface SearchOutcome { results: PlaceResult[]; requests: number; usedToday: number; cap: number; truncated: boolean }

export async function searchPlaces(opts: { query: string; pages?: number; createdBy?: string | null; fetchImpl?: typeof fetch }): Promise<SearchOutcome> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new PlacesError('GOOGLE_MAPS_API_KEY nu este configurat', 503)
  const query = opts.query.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  if (query.length < 3 || query.length > 150) throw new PlacesError('Căutarea trebuie să aibă între 3 și 150 de caractere', 400)
  const pages = Math.min(MAX_PAGES, Math.max(1, Math.floor(opts.pages ?? 1)))
  const cap = dailyCap()
  const used = await requestsUsedToday()
  if (used + 1 > cap) throw new PlacesError(`Plafonul zilnic de ${cap} cereri Google a fost atins`, 429)
  const doFetch = opts.fetchImpl ?? fetch

  const results = new Map<string, PlaceResult>()
  let requests = 0
  let pageToken: string | undefined
  let truncated = false
  for (let i = 0; i < pages; i++) {
    if (used + requests + 1 > cap) { truncated = true; break }
    const body: Record<string, unknown> = { textQuery: query, languageCode: 'ro', regionCode: 'RO', pageSize: PAGE_SIZE }
    if (pageToken) body.pageToken = pageToken
    let res: Response
    try {
      res = await doFetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new PlacesError('Google Places nu răspunde (timeout sau rețea)')
    }
    requests++
    if (!res.ok) {
      // Google's message is useful ("API not enabled", "key restricted"); it never contains the key, but strip it defensively.
      let detail = ''
      try { detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? '' } catch { /* not json */ }
      detail = detail.split(key).join('***').slice(0, 300)
      await logSearch(query, requests, results.size, opts.createdBy)
      throw new PlacesError(`Google Places a răspuns ${res.status}${detail ? `: ${detail}` : ''}`, res.status === 429 ? 429 : 502)
    }
    const json = (await res.json()) as { places?: RawPlace[]; nextPageToken?: string }
    for (const raw of json.places ?? []) {
      const p = parsePlace(raw)
      if (p && p.businessStatus !== 'CLOSED_PERMANENTLY') results.set(p.placeId, p)
    }
    pageToken = json.nextPageToken
    if (!pageToken) break
    if (i === pages - 1) truncated = true
  }
  await logSearch(query, requests, results.size, opts.createdBy)
  return { results: [...results.values()], requests, usedToday: used + requests, cap, truncated }
}

async function logSearch(query: string, requests: number, resultCount: number, createdBy?: string | null) {
  await db.commerceServicePartnerSearch.create({ data: { query, requests, resultCount, createdBy: createdBy ?? null } })
}
