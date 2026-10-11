/**
 * Google Places results → CRM leads (internal prospecting) → confirmed partners in the registry.
 *
 * Search results are held server-side (30 min) and saved by Place ID, so the browser never sends back data we would trust.
 * A lead keeps what Google returned together with when it was fetched (customFields.google.fetchedAt).
 * Nothing from a lead reaches the storefront: only a partner created through promoteLead(), from values confirmed by a person.
 */
import { randomUUID } from 'node:crypto'
import { db, Prisma } from '@repo/db'
import { z } from 'zod'
import { partnerBusinessLineId, createPartner, PartnerError } from './service'
import { searchPlaces, type PlaceResult, type SearchOutcome } from './places'
import { PartnerFields } from './schemas'
import { osmGeocode } from './coords'
import { PARTNER_ENTITY_TYPE, leadStatusForPartner } from './lead-sync'

export const LEAD_SOURCE = 'google_places'
const TTL_MS = 30 * 60_000
const searches = new Map<string, { at: number; query: string; results: PlaceResult[] }>()

function remember(query: string, results: PlaceResult[]): string {
  const now = Date.now()
  for (const [k, v] of searches) if (now - v.at > TTL_MS) searches.delete(k)
  if (searches.size >= 20) searches.delete(searches.keys().next().value!)
  const id = randomUUID()
  searches.set(id, { at: now, query, results })
  return id
}

export async function runSearch(query: string, pages: number, createdBy: string | null) {
  const out: SearchOutcome = await searchPlaces({ query, pages, createdBy })
  const ids = out.results.map((r) => r.placeId)
  const [leads, partners] = await Promise.all([
    db.lead.findMany({ where: { externalSource: LEAD_SOURCE, externalId: { in: ids } }, select: { externalId: true } }),
    db.commerceServicePartner.findMany({ where: { businessLineId: await partnerBusinessLineId(), googlePlaceId: { in: ids } }, select: { googlePlaceId: true } }),
  ])
  const inLeads = new Set(leads.map((l) => l.externalId))
  const inRegistry = new Set(partners.map((p) => p.googlePlaceId))
  const searchId = remember(query, out.results)
  return {
    searchId, requests: out.requests, usedToday: out.usedToday, cap: out.cap, truncated: out.truncated,
    results: out.results.map((r) => ({ ...r, inLeads: inLeads.has(r.placeId), inRegistry: inRegistry.has(r.placeId) })),
  }
}

const SaveBody = z.object({ searchId: z.string().uuid(), placeIds: z.array(z.string().max(200)).min(1).max(100) })

export async function saveAsLeads(input: unknown) {
  const { searchId, placeIds } = SaveBody.parse(input)
  const s = searches.get(searchId)
  if (!s || Date.now() - s.at > TTL_MS) throw new PartnerError('Căutarea a expirat: rulează-o din nou', 410)
  const businessLineId = await partnerBusinessLineId()
  const want = new Set(placeIds)
  const picked = s.results.filter((r) => want.has(r.placeId))
  const fetchedAt = new Date(s.at).toISOString()
  const data: Prisma.LeadCreateManyInput[] = picked.map((r) => ({
    businessLineId, entityType: PARTNER_ENTITY_TYPE, companyName: r.name, contactPerson: 'Nespecificat', email: '',
    phone: r.phone, website: r.website, address: r.address, city: r.city, county: r.county,
    status: 'prospect', source: LEAD_SOURCE, sourceService: 'service-partner-prospecting',
    industry: 'Service auto — tinichigerie / vopsitorie',
    externalId: r.placeId, externalSource: LEAD_SOURCE,
    notes: [`Găsit prin Google Places (căutare: „${s.query}”).`, `Vopsitorie: ${r.paintLikely ? 'probabil (din denumire)' : 'necunoscut — de verificat telefonic'}.`, `Tinichigerie: ${r.bodyLikely ? 'probabil (din denumire)' : 'necunoscut'}.`].join(' '),
    customFields: {
      google: { placeId: r.placeId, mapsUrl: r.mapsUrl, rating: r.rating, ratingCount: r.ratingCount, lat: r.lat, lng: r.lng, types: r.types, fetchedAt, query: s.query },
      paintLikely: r.paintLikely, bodyLikely: r.bodyLikely,
    } as Prisma.InputJsonValue,
  }))
  const created = data.length ? (await db.lead.createMany({ data, skipDuplicates: true })).count : 0
  return { requested: placeIds.length, found: picked.length, created, alreadyThere: picked.length - created }
}

export async function listGoogleLeads() {
  const rows = await db.lead.findMany({
    where: { externalSource: LEAD_SOURCE, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 300,
    select: { id: true, companyName: true, phone: true, website: true, address: true, city: true, county: true, status: true, notes: true, customFields: true, createdAt: true },
  })
  return {
    leads: rows.map((r) => {
      const cf = (r.customFields ?? {}) as { google?: { placeId?: string; mapsUrl?: string; rating?: number; ratingCount?: number; fetchedAt?: string }; paintLikely?: boolean; bodyLikely?: boolean; partnerId?: string }
      return {
        id: r.id, name: r.companyName, phone: r.phone, website: r.website, address: r.address, city: r.city, county: r.county, status: r.status,
        mapsUrl: cf.google?.mapsUrl ?? null, rating: cf.google?.rating ?? null, ratingCount: cf.google?.ratingCount ?? null, fetchedAt: cf.google?.fetchedAt ?? null,
        paintLikely: !!cf.paintLikely, bodyLikely: !!cf.bodyLikely, partnerId: cf.partnerId ?? null, createdAt: r.createdAt,
      }
    }),
  }
}

/** The values a person confirmed (by phone / from the partner). Only these go into the registry. */
const PromoteBody = PartnerFields.pick({ name: true, address: true, city: true, county: true, phone: true, email: true, website: true, contactPerson: true, services: true, notes: true, lat: true, lng: true })
  .extend({ status: z.enum(['prospect', 'contacted', 'negotiating']).default('prospect') })

export async function promoteLead(leadId: string, input: unknown) {
  const data = PromoteBody.parse(input)
  const businessLineId = await partnerBusinessLineId()
  const lead = await db.lead.findFirst({ where: { id: leadId, businessLineId, externalSource: LEAD_SOURCE, deletedAt: null } })
  if (!lead) throw new PartnerError('Lead negăsit', 404)
  const cf = (lead.customFields ?? {}) as { google?: { placeId?: string; mapsUrl?: string }; partnerId?: string }
  if (cf.partnerId) throw new PartnerError('Lead-ul este deja în registru', 409)
  // Place ID and Maps link carry over. Coordinates carry over only as Google-sourced values with their fetch date (valid 30 days, then
  // refreshed through the Place ID); rating and reviews stay in the lead. Without Google coordinates the confirmed address is geocoded (OSM).
  const partner = await createPartner({ ...data, googlePlaceId: cf.google?.placeId ?? null, googleMapsUrl: cf.google?.mapsUrl ?? null, source: 'google_maps' })
  const g = (lead.customFields as { google?: { lat?: number | null; lng?: number | null; fetchedAt?: string } } | null)?.google
  const fetched = g?.fetchedAt ? new Date(g.fetchedAt) : null
  if (!(data.lat != null && data.lng != null)) {
    if (typeof g?.lat === 'number' && typeof g?.lng === 'number' && fetched && Date.now() - fetched.getTime() < 29 * 86_400_000) {
      await db.commerceServicePartner.update({ where: { id: partner.id }, data: { lat: g.lat, lng: g.lng, coordsSource: 'google', coordsFetchedAt: fetched } })
    } else {
      const o = await osmGeocode(data.address ?? lead.address ?? '', data.city ?? lead.city ?? null).catch(() => null)
      if (o) await db.commerceServicePartner.update({ where: { id: partner.id }, data: { lat: o.lat, lng: o.lng, coordsSource: 'osm', coordsFetchedAt: new Date() } })
    }
  }
  await db.lead.update({
    where: { id: leadId },
    data: { status: leadStatusForPartner(data.status) ?? 'prospect', customFields: { ...(lead.customFields as object), partnerId: partner.id } as Prisma.InputJsonValue },
  })
  return partner
}
