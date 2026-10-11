import { storefrontHandler } from '@/lib/commerce/storefront/auth'
import { loadActivePartners, parseNearbyQuery, selectNearby } from '@/lib/commerce/partners/storefront'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/storefront/service-partners?lat=&lng=&county=&city=&service=mount|paint|paint_mount&bulky=small|standard|large|xlarge&limit=3&maxKm=150
 * Active partner services near the customer, nearest first (lat+lng) or by county/city. `bulky` picks the price for the part's size class.
 * → { mode: "distance"|"area"|"all", total, items: [{ id, name, city, county, address, distanceKm, services: [{ service, priceRon, leadTimeDays }] }] }
 */
export const GET = storefrontHandler(async (req, ctx) => {
  const q = parseNearbyQuery(new URL(req.url).searchParams)
  return selectNearby(await loadActivePartners(ctx.businessLineId), q)
})
