/**
 * Customer address → coordinates, for "service partners near you" (GET /api/storefront/geocode).
 *
 * Uses the public OpenStreetMap Nominatim service, so its usage policy is enforced here, in one place:
 *  - at most 1 request per second for the whole ERP (global queue; callers wait, or get 429 when the queue is long),
 *  - an identifying User-Agent,
 *  - NO autocomplete/typeahead: a search is an explicit user action, minimum 6 characters,
 *  - results are cached (24 h) so repeated searches never reach Nominatim again.
 * Queries are customer addresses (personal data): they are not logged and not stored; only the in-memory cache holds them for 24 h.
 * Heavy traffic needs a self-hosted Nominatim or a commercial geocoder (same response shape can be produced by swapping `fetchCandidates`).
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
export const ATTRIBUTION = '© OpenStreetMap contributors'
const CACHE_TTL_MS = 24 * 3_600_000
const CACHE_MAX = 2_000
const MAX_WAITING = 8
const MIN_LEN = 6
const MAX_LEN = 150

export class GeocodeError extends Error {
  constructor(message: string, readonly status: 400 | 429 | 502 = 502) { super(message) }
}

export interface GeoCandidate { label: string; lat: number; lng: number; precision: 'house' | 'street' | 'area' }

const inRomania = (lat: number, lng: number) => lat >= 43.4 && lat <= 48.4 && lng >= 20.1 && lng <= 30.0

const cache = new Map<string, { until: number; items: GeoCandidate[] }>()
let tail: Promise<unknown> = Promise.resolve()
let waiting = 0
let lastCall = 0

export function resetGeocodeState() { cache.clear(); tail = Promise.resolve(); waiting = 0; lastCall = 0 }

const norm = (q: string) => q.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

interface RawHit { lat?: string; lon?: string; display_name?: string; addresstype?: string; type?: string; category?: string }

export function precisionOf(h: RawHit): GeoCandidate['precision'] {
  const t = h.addresstype ?? h.type ?? ''
  if (['house', 'building', 'apartments', 'residential', 'detached', 'commercial', 'retail', 'yes'].includes(t) || h.type === 'house') return 'house'
  if (['road', 'street', 'pedestrian', 'footway', 'residential_road', 'primary', 'secondary', 'tertiary', 'service', 'living_street', 'unclassified'].includes(t) || h.category === 'highway') return 'street'
  return 'area'
}

export function parseHits(rows: RawHit[], limit: number): GeoCandidate[] {
  const out: GeoCandidate[] = []
  for (const h of rows) {
    const lat = Number(h.lat), lng = Number(h.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inRomania(lat, lng) || !h.display_name) continue
    // "Strada X 5, Sector 3, București, 030167, România" → drop the country; keep it short enough for a list
    const label = h.display_name.replace(/,\s*România$/i, '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 160)
    out.push({ label, lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, precision: precisionOf(h) })
    if (out.length >= limit) break
  }
  return out
}

export async function geocodeAddress(
  query: string, opts: { limit?: number; fetchImpl?: typeof fetch; spacingMs?: number; now?: () => number } = {},
): Promise<{ items: GeoCandidate[]; cached: boolean; attribution: string }> {
  const q = query.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (q.length < MIN_LEN) throw new GeocodeError(`Introdu adresa completă (minimum ${MIN_LEN} caractere).`, 400)
  if (q.length > MAX_LEN) throw new GeocodeError('Adresa este prea lungă.', 400)
  const limit = Math.min(10, Math.max(1, Math.round(opts.limit ?? 5)))
  const now = opts.now ?? Date.now
  const key = `${norm(q)}|${limit}`
  const hit = cache.get(key)
  if (hit && hit.until > now()) return { items: hit.items, cached: true, attribution: ATTRIBUTION }

  if (waiting >= MAX_WAITING) throw new GeocodeError('Serviciul de localizare este ocupat. Încearcă din nou în câteva secunde.', 429)
  const f = opts.fetchImpl ?? fetch
  const spacing = opts.spacingMs ?? 1100
  waiting++
  const run = tail.then(async () => {
    const wait = lastCall + spacing - now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastCall = now()
    const url = `${NOMINATIM}?${new URLSearchParams({ q: `${q}, România`, format: 'jsonv2', limit: String(limit + 3), countrycodes: 'ro', addressdetails: '0', dedupe: '1' })}`
    const ua = process.env.NOMINATIM_USER_AGENT || 'AgencyOS-eCaroseria/1.0 (storefront address lookup)'
    let res: Response
    try { res = await f(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'ro' }, signal: AbortSignal.timeout(10_000) }) }
    catch { throw new GeocodeError('Nu am putut localiza adresa acum. Încearcă din nou.') }
    if (res.status === 429 || res.status === 503) throw new GeocodeError('Serviciul de localizare este ocupat. Încearcă din nou în câteva secunde.', 429)
    if (!res.ok) throw new GeocodeError('Nu am putut localiza adresa acum. Încearcă din nou.')
    return parseHits((await res.json()) as RawHit[], limit)
  })
  tail = run.catch(() => undefined)
  try {
    const items = await run
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!)
    cache.set(key, { until: now() + CACHE_TTL_MS, items })
    return { items, cached: false, attribution: ATTRIBUTION }
  } finally { waiting-- }
}
