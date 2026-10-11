/**
 * Storefront side of the partner registry: which active partners can serve this customer, nearest first.
 *
 * Only what a customer needs is exposed (name, city, street address, distance, sale price, lead time). Never exposed:
 * settlement cost, phone, e-mail, notes, ratings and coordinates (those come from Google or are internal).
 */
import { db } from '@repo/db'
import { coordsState, haversineKm } from './geo'
import { BULKY, SERVICES } from './schemas'
import { StorefrontInputError } from '../storefront/auth'

type Service = (typeof SERVICES)[number]
type Bulky = (typeof BULKY)[number]

export interface ActivePartner {
  id: string; name: string; city: string | null; county: string | null; address: string | null; lat: number | null; lng: number | null
  rates: Array<{ service: string; bulkyClass: string | null; salePriceRon: number | null; leadTimeDays: number | null }>
}

export interface NearbyQuery { lat: number | null; lng: number | null; county: string | null; city: string | null; service: Service | null; bulky: Bulky | null; limit: number; maxKm: number }

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function parseNearbyQuery(sp: URLSearchParams): NearbyQuery {
  const numParam = (name: string, min: number, max: number): number | null => {
    const raw = sp.get(name)
    if (raw == null || raw === '') return null
    const n = Number(raw)
    if (!Number.isFinite(n) || n < min || n > max) throw new StorefrontInputError(`Invalid ${name}`)
    return n
  }
  const lat = numParam('lat', -90, 90)
  const lng = numParam('lng', -180, 180)
  if ((lat == null) !== (lng == null)) throw new StorefrontInputError('lat and lng must be sent together')
  const text = (name: string) => { const v = sp.get(name)?.trim(); if (!v) return null; if (v.length > 100) throw new StorefrontInputError(`Invalid ${name}`); return v }
  const service = sp.get('service')
  if (service && !(SERVICES as readonly string[]).includes(service)) throw new StorefrontInputError('Invalid service')
  const bulky = sp.get('bulky')
  if (bulky && !(BULKY as readonly string[]).includes(bulky)) throw new StorefrontInputError('Invalid bulky')
  return {
    lat, lng, county: text('county'), city: text('city'),
    service: (service as Service) || null, bulky: (bulky as Bulky) || null,
    limit: Math.round(numParam('limit', 1, 20) ?? 3), maxKm: numParam('maxKm', 1, 500) ?? 150,
  }
}

/** Rate for a service: the one for the part's size class if it exists, otherwise the "any size" one. Needs a sale price to be sellable. */
function offerFor(p: ActivePartner, service: string, bulky: Bulky | null) {
  const rows = p.rates.filter((r) => r.service === service && r.salePriceRon != null)
  const hit = (bulky && rows.find((r) => r.bulkyClass === bulky)) || rows.find((r) => r.bulkyClass == null)
  return hit ? { service, priceRon: hit.salePriceRon as number, leadTimeDays: hit.leadTimeDays } : null
}

export function selectNearby(partners: ActivePartner[], q: NearbyQuery) {
  const wanted = q.service ? [q.service] : [...SERVICES]
  const cand = partners
    .map((p) => ({ p, offers: wanted.map((s) => offerFor(p, s, q.bulky)).filter((o): o is NonNullable<typeof o> => !!o) }))
    .filter((x) => x.offers.length > 0)

  const located = q.lat != null && q.lng != null
  const countyOk = (p: ActivePartner) => !q.county || (p.county != null && norm(p.county) === norm(q.county))
  const cityOk = (p: ActivePartner) => !q.city || (p.city != null && norm(p.city) === norm(q.city))

  type Row = { x: (typeof cand)[number]; distanceKm: number | null }
  let rows: Row[]
  let mode: 'distance' | 'area' | 'all'
  if (located) {
    mode = 'distance'
    const here = { lat: q.lat!, lng: q.lng! }
    const withCoords = cand
      .filter((x) => x.p.lat != null && x.p.lng != null)
      .map((x) => ({ x, distanceKm: Math.round(haversineKm(here, { lat: x.p.lat!, lng: x.p.lng! }) * 10) / 10 }))
      .filter((r) => r.distanceKm! <= q.maxKm)
      .sort((a, b) => a.distanceKm! - b.distanceKm!)
    // Partners without coordinates can still serve the customer's own county: listed after the measured ones.
    const without = q.county ? cand.filter((x) => (x.p.lat == null || x.p.lng == null) && countyOk(x.p)).map((x) => ({ x, distanceKm: null })) : []
    rows = [...withCoords, ...without]
  } else if (q.county || q.city) {
    mode = 'area'
    rows = cand.filter((x) => countyOk(x.p) && cityOk(x.p)).sort((a, b) => a.p.name.localeCompare(b.p.name, 'ro')).map((x) => ({ x, distanceKm: null }))
  } else {
    mode = 'all'
    rows = cand.sort((a, b) => a.p.name.localeCompare(b.p.name, 'ro')).map((x) => ({ x, distanceKm: null }))
  }

  return {
    mode,
    total: rows.length,
    items: rows.slice(0, q.limit).map(({ x, distanceKm }) => ({
      id: x.p.id, name: x.p.name, city: x.p.city, county: x.p.county, address: x.p.address, distanceKm,
      services: x.offers,
    })),
  }
}

// Active partners change rarely; a short cache keeps the endpoint off the database.
let cache: { until: number; data: ActivePartner[] } | null = null

export function invalidateActivePartners() { cache = null }

export async function loadActivePartners(businessLineId: string): Promise<ActivePartner[]> {
  if (cache && cache.until > Date.now()) return cache.data
  const rows = await db.commerceServicePartner.findMany({ where: { businessLineId, status: 'active' }, select: { id: true, name: true, city: true, county: true, address: true, lat: true, lng: true, coordsSource: true, coordsFetchedAt: true } })
  const rates = await db.commerceServicePartnerRate.findMany({
    where: { partnerId: { in: rows.map((r) => r.id) }, isActive: true },
    select: { partnerId: true, service: true, bulkyClass: true, salePriceRon: true, leadTimeDays: true },
  })
  const now = new Date()
  const data = rows.map(({ coordsSource, coordsFetchedAt, ...p }) => ({
    ...p,
    // Defence in depth: Google-derived coordinates older than 30 days are never used, even if the refresh job has not run.
    ...(coordsState({ lat: p.lat, lng: p.lng, coordsSource, coordsFetchedAt }, now) === 'expired' ? { lat: null, lng: null } : {}),
    rates: rates.filter((r) => r.partnerId === p.id).map((r) => ({ service: r.service, bulkyClass: r.bulkyClass, salePriceRon: r.salePriceRon != null ? Number(r.salePriceRon) : null, leadTimeDays: r.leadTimeDays })),
  }))
  cache = { until: Date.now() + 60_000, data }
  return data
}
