import { NextResponse } from 'next/server'
import { storefrontHandler, StorefrontInputError } from '@/lib/commerce/storefront/auth'
import { GeocodeError, geocodeAddress } from '@/lib/commerce/partners/geocode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/storefront/geocode?q=<street, number, city>&limit=5  — address → candidate coordinates (OpenStreetMap), Romania only.
 * → { items: [{ label, lat, lng, precision: "house"|"street"|"area" }], cached, attribution }
 * Call it on an explicit user action (button / Enter), never while typing: the public OSM service forbids autocomplete and the ERP
 * allows ~1 lookup per second overall (429 + Retry-After when busy). Feed the chosen lat/lng to GET /api/storefront/service-partners.
 */
export const GET = storefrontHandler(async (req) => {
  const sp = new URL(req.url).searchParams
  const q = sp.get('q') ?? ''
  const limitRaw = sp.get('limit')
  const limit = limitRaw == null || limitRaw === '' ? 5 : Number(limitRaw)
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new StorefrontInputError('Invalid limit')
  try {
    return await geocodeAddress(q, { limit })
  } catch (e) {
    if (e instanceof GeocodeError) {
      if (e.status === 400) throw new StorefrontInputError(e.message)
      return NextResponse.json({ error: e.message }, { status: e.status, headers: { 'Cache-Control': 'no-store', ...(e.status === 429 ? { 'Retry-After': '5' } : {}) } })
    }
    throw e
  }
})
