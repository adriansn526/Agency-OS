/** Distance helpers for "services near the customer". Haversine is plenty for a few hundred partners (no PostGIS needed). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371.0088
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function nearest<T extends { lat: number | null; lng: number | null }>(items: T[], from: { lat: number; lng: number }, limit = 3, maxKm = Infinity): Array<T & { distanceKm: number }> {
  return items
    .filter((i): i is T & { lat: number; lng: number } => i.lat != null && i.lng != null)
    .map((i) => ({ ...i, distanceKm: Math.round(haversineKm(from, { lat: i.lat, lng: i.lng }) * 10) / 10 }))
    .filter((i) => i.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
}

/** Google lets Places coordinates be cached for 30 days at most; refresh well before that. */
export const GOOGLE_COORDS_MAX_DAYS = 30
export const GOOGLE_COORDS_REFRESH_DAYS = 20

export type CoordsState = 'missing' | 'permanent' | 'fresh' | 'refresh' | 'expired'

export function coordsState(c: { lat: number | null; lng: number | null; coordsSource: string | null; coordsFetchedAt: Date | null }, now = new Date()): CoordsState {
  if (c.lat == null || c.lng == null) return 'missing'
  if (c.coordsSource !== 'google') return 'permanent' // osm / manual / legacy
  if (!c.coordsFetchedAt) return 'expired' // google coordinates without a date cannot be proven fresh
  const days = (now.getTime() - c.coordsFetchedAt.getTime()) / 86_400_000
  if (days >= GOOGLE_COORDS_MAX_DAYS) return 'expired'
  return days >= GOOGLE_COORDS_REFRESH_DAYS ? 'refresh' : 'fresh'
}
