/**
 * Keeping partner coordinates legitimate and current.
 *
 *  google  Place Details (location only) through the stored Place ID; refreshed once older than 20 days, deleted at 30
 *          unless the refresh worked. This is the only Google-derived value that is kept, and only for 30 days at a time.
 *  osm     OpenStreetMap Nominatim geocoding of the confirmed address (no expiry; © OpenStreetMap contributors, ODbL).
 *          Used when there is no Place ID, when Google fails, or when Google coordinates had to be dropped.
 *  manual  typed by a person; never touched.
 *
 * Nominatim policy: identify the application (User-Agent), at most 1 request/second, no bulk geocoding. Partners number in the
 * dozens, so a 1.1 s pause between requests is plenty.
 */
import { db } from '@repo/db'
import { coordsState } from './geo'
import { PlacesError } from './places'
import { partnerBusinessLineId } from './service'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** Romania, with a margin: a hit outside it is a wrong match, not a location. */
const inRomania = (lat: number, lng: number) => lat >= 43.4 && lat <= 48.4 && lng >= 20.1 && lng <= 30.0

export async function googleLocation(placeId: string, fetchImpl: typeof fetch = fetch): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new PlacesError('GOOGLE_MAPS_API_KEY nu este configurat', 503)
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(placeId)) return null
  const res = await fetchImpl(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'location' }, // location only: the cheapest Place Details request
    signal: AbortSignal.timeout(15_000),
  })
  if (res.status === 404) return null // place no longer exists
  if (!res.ok) throw new PlacesError(`Google Place Details a răspuns ${res.status}`)
  const j = (await res.json()) as { location?: { latitude?: number; longitude?: number } }
  const { latitude: lat, longitude: lng } = j.location ?? {}
  return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null
}

export async function osmGeocode(address: string, city: string | null, fetchImpl: typeof fetch = fetch): Promise<{ lat: number; lng: number } | null> {
  if (address.trim().length < 6) return null // "x" is not an address; "România" appended below would make it look like one
  const q = [address.trim(), city, 'România'].filter(Boolean).join(', ')
  if (q.length > 300) return null
  const url = `${NOMINATIM}?${new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'ro', addressdetails: '0' })}`
  const ua = process.env.NOMINATIM_USER_AGENT || 'AgencyOS-eCaroseria/1.0 (partner service geocoding)'
  const res = await fetchImpl(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'ro' }, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return null
  const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>
  const hit = rows[0]
  const lat = Number(hit?.lat), lng = Number(hit?.lon)
  return Number.isFinite(lat) && Number.isFinite(lng) && inRomania(lat, lng) ? { lat, lng } : null
}

export interface RefreshReport {
  checked: number; refreshedGoogle: number; geocodedOsm: number; clearedExpired: number; stillMissing: number; failed: number
  googleRequests: number; osmRequests: number; dryRun: boolean; notes: string[]
}

export async function refreshPartnerCoords(opts: { dryRun?: boolean; now?: Date; fetchImpl?: typeof fetch; pauseMs?: number } = {}): Promise<RefreshReport> {
  const now = opts.now ?? new Date()
  const f = opts.fetchImpl ?? fetch
  const pause = opts.pauseMs ?? 1100
  const rep: RefreshReport = { checked: 0, refreshedGoogle: 0, geocodedOsm: 0, clearedExpired: 0, stillMissing: 0, failed: 0, googleRequests: 0, osmRequests: 0, dryRun: !!opts.dryRun, notes: [] }
  const partners = await db.commerceServicePartner.findMany({
    where: { businessLineId: await partnerBusinessLineId(), status: { notIn: ['declined'] } },
    select: { id: true, name: true, address: true, city: true, lat: true, lng: true, googlePlaceId: true, coordsSource: true, coordsFetchedAt: true },
  })
  let lastOsm = 0
  const osm = async (address: string | null, city: string | null) => {
    if (!address) return null
    const wait = lastOsm + pause - Date.now()
    if (wait > 0) await sleep(wait)
    lastOsm = Date.now()
    rep.osmRequests++
    try { return await osmGeocode(address, city, f) } catch { return null }
  }

  for (const p of partners) {
    const st = coordsState(p, now)
    if (st === 'fresh' || st === 'permanent') continue
    rep.checked++
    // 1) Google through the Place ID (refresh, or fill in coordinates that are missing)
    let got: { lat: number; lng: number } | null = null
    let source: 'google' | 'osm' | null = null
    if (p.googlePlaceId && !opts.dryRun) {
      try { rep.googleRequests++; got = await googleLocation(p.googlePlaceId, f); if (got) source = 'google' }
      catch (e) { rep.failed++; rep.notes.push(`${p.name}: ${e instanceof Error ? e.message : 'Google error'}`) }
    } else if (p.googlePlaceId && opts.dryRun) rep.googleRequests++
    // 2) OpenStreetMap as the fallback — only needed when Google gave nothing and the old Google value is unusable or absent
    const needFallback = !got && (st === 'missing' || st === 'expired' || (st === 'refresh' && !p.googlePlaceId))
    if (needFallback && !opts.dryRun) {
      const o = await osm(p.address, p.city)
      if (o) { got = o; source = 'osm' }
    } else if (needFallback && opts.dryRun) rep.osmRequests++

    if (opts.dryRun) continue
    if (got && source) {
      await db.commerceServicePartner.update({ where: { id: p.id }, data: { lat: got.lat, lng: got.lng, coordsSource: source, coordsFetchedAt: now } })
      if (source === 'google') rep.refreshedGoogle++; else rep.geocodedOsm++
    } else if (st === 'expired') {
      // The terms require deleting expired Google coordinates; the partner stays reachable by county/city.
      await db.commerceServicePartner.update({ where: { id: p.id }, data: { lat: null, lng: null, coordsSource: null, coordsFetchedAt: null } })
      rep.clearedExpired++
    } else if (st === 'missing') rep.stillMissing++
  }
  if (opts.dryRun) rep.notes.push('dry-run: no request was made and nothing was written; counters show what would be attempted')
  else if (rep.googleRequests > 0) {
    await db.commerceServicePartnerSearch.create({ data: { query: 'coords-refresh', requests: rep.googleRequests, resultCount: rep.refreshedGoogle } })
  }
  return rep
}
