/** Database layer of the partner service registry (admin side). */
import { db, Prisma } from '@repo/db'
import { z } from 'zod'
import { dedupeKey, parsePartnersCsv } from './csv'
import { PartnerBody, PartnerPatch, RatesBody } from './schemas'

const SLUG = () => process.env.COMMERCE_SYNC_BUSINESS_LINE || 'ecaroseria'

export async function partnerBusinessLineId(): Promise<string> {
  const bl = await db.businessLine.findUnique({ where: { slug: SLUG() }, select: { id: true } })
  if (!bl) throw new Error(`Business line "${SLUG()}" not found`)
  return bl.id
}

export class PartnerError extends Error {
  constructor(message: string, readonly status = 400) { super(message) }
}

export async function listPartners(f: { status?: string; q?: string; county?: string }) {
  const businessLineId = await partnerBusinessLineId()
  const where: Prisma.CommerceServicePartnerWhereInput = { businessLineId }
  if (f.status) where.status = f.status
  if (f.county) where.county = { equals: f.county, mode: 'insensitive' }
  if (f.q) where.OR = [{ name: { contains: f.q, mode: 'insensitive' } }, { address: { contains: f.q, mode: 'insensitive' } }, { city: { contains: f.q, mode: 'insensitive' } }]
  const [rows, counts] = await Promise.all([
    db.commerceServicePartner.findMany({ where, orderBy: [{ status: 'asc' }, { name: 'asc' }], take: 500 }),
    db.commerceServicePartner.groupBy({ by: ['status'], where: { businessLineId }, _count: true }),
  ])
  const rates = await db.commerceServicePartnerRate.findMany({ where: { partnerId: { in: rows.map((r) => r.id) } }, orderBy: [{ service: 'asc' }, { bulkyClass: 'asc' }] })
  const byPartner = new Map<string, typeof rates>()
  for (const r of rates) byPartner.set(r.partnerId, [...(byPartner.get(r.partnerId) ?? []), r])
  return {
    partners: rows.map((p) => ({ ...p, rating: p.rating != null ? Number(p.rating) : null, rates: (byPartner.get(p.id) ?? []).map((r) => ({ ...r, settlementRon: Number(r.settlementRon), salePriceRon: r.salePriceRon != null ? Number(r.salePriceRon) : null })) })),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
  }
}

/** Activating a partner makes it visible to customers: it needs a location and at least one active rate. */
async function assertCanBeActive(id: string, p: { city: string | null; county: string | null; lat: number | null }) {
  if (!p.city && !p.county && p.lat == null) throw new PartnerError('Pentru activare trebuie oraș/județ sau coordonate')
  const n = await db.commerceServicePartnerRate.count({ where: { partnerId: id, isActive: true } })
  if (n === 0) throw new PartnerError('Pentru activare adaugă cel puțin un tarif activ')
}

export async function createPartner(input: unknown) {
  const data = PartnerBody.parse(input)
  if (data.status === 'active') throw new PartnerError('Un partener nou nu poate fi activ: adaugă întâi tarifele')
  const businessLineId = await partnerBusinessLineId()
  try {
    return await db.commerceServicePartner.create({ data: { ...data, businessLineId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new PartnerError('Există deja un partener cu acest Google Place ID', 409)
    throw e
  }
}

export async function updatePartner(id: string, input: unknown) {
  const patch = PartnerPatch.parse(input)
  const businessLineId = await partnerBusinessLineId()
  const cur = await db.commerceServicePartner.findFirst({ where: { id, businessLineId } })
  if (!cur) throw new PartnerError('Not found', 404)
  const merged = { city: patch.city !== undefined ? patch.city : cur.city, county: patch.county !== undefined ? patch.county : cur.county, lat: patch.lat !== undefined ? patch.lat : cur.lat }
  const becomesActive = patch.status === 'active' && cur.status !== 'active'
  if (patch.status === 'active') await assertCanBeActive(id, merged)
  const extra: Prisma.CommerceServicePartnerUpdateInput = {}
  if (becomesActive) extra.activatedAt = new Date()
  if (patch.status && ['contacted', 'negotiating'].includes(patch.status) && cur.status !== patch.status) extra.lastContactedAt = new Date()
  try {
    return await db.commerceServicePartner.update({ where: { id }, data: { ...patch, ...extra } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new PartnerError('Există deja un partener cu acest Google Place ID', 409)
    throw e
  }
}

export async function deletePartner(id: string) {
  const businessLineId = await partnerBusinessLineId()
  const cur = await db.commerceServicePartner.findFirst({ where: { id, businessLineId } })
  if (!cur) throw new PartnerError('Not found', 404)
  if (cur.status === 'active') throw new PartnerError('Un partener activ nu se șterge: dezactivează-l întâi', 409)
  await db.commerceServicePartner.delete({ where: { id } })
}

export async function setRates(id: string, input: unknown) {
  const { rates } = RatesBody.parse(input)
  const keys = new Set<string>()
  for (const r of rates) {
    const k = `${r.service}|${r.bulkyClass ?? ''}`
    if (keys.has(k)) throw new PartnerError(`Tarif duplicat: ${r.service}${r.bulkyClass ? ` / ${r.bulkyClass}` : ''}`)
    keys.add(k)
    if (r.salePriceRon != null && r.salePriceRon < r.settlementRon) throw new PartnerError('Prețul de vânzare nu poate fi sub costul de decontare')
  }
  const businessLineId = await partnerBusinessLineId()
  const cur = await db.commerceServicePartner.findFirst({ where: { id, businessLineId } })
  if (!cur) throw new PartnerError('Not found', 404)
  if (cur.status === 'active' && !rates.some((r) => r.isActive)) throw new PartnerError('Un partener activ are nevoie de cel puțin un tarif activ')
  await db.$transaction([
    db.commerceServicePartnerRate.deleteMany({ where: { partnerId: id } }),
    db.commerceServicePartnerRate.createMany({ data: rates.map((r) => ({ ...r, partnerId: id })) }),
    db.commerceServicePartner.update({ where: { id }, data: { services: [...new Set(rates.filter((r) => r.isActive).map((r) => r.service))] } }),
  ])
}

const ImportBody = z.object({ csv: z.string().max(3_000_000), dryRun: z.boolean().default(true) })

export async function importPartners(input: unknown) {
  const { csv, dryRun } = ImportBody.parse(input)
  const parsed = parsePartnersCsv(csv)
  if (parsed.missingHeaders.length) throw new PartnerError('CSV-ul trebuie să aibă un antet cu o coloană de nume (name / title / nume / denumire)')
  const businessLineId = await partnerBusinessLineId()
  const existing = await db.commerceServicePartner.findMany({ where: { businessLineId }, select: { name: true, address: true, googlePlaceId: true } })
  const seenPlace = new Set(existing.map((e) => e.googlePlaceId).filter(Boolean))
  const seenKey = new Set(existing.map((e) => dedupeKey(e.name, e.address)))
  const toCreate: typeof parsed.partners = []
  const duplicates: Array<{ row: number; name: string; why: string }> = []
  for (const p of parsed.partners) {
    const k = dedupeKey(p.data.name, p.data.address)
    if (p.data.googlePlaceId && seenPlace.has(p.data.googlePlaceId)) { duplicates.push({ row: p.row, name: p.data.name, why: 'Google Place ID existent' }); continue }
    if (seenKey.has(k)) { duplicates.push({ row: p.row, name: p.data.name, why: 'același nume și adresă' }); continue }
    if (p.data.googlePlaceId) seenPlace.add(p.data.googlePlaceId)
    seenKey.add(k)
    toCreate.push(p)
  }
  let created = 0
  if (!dryRun && toCreate.length) {
    const r = await db.commerceServicePartner.createMany({ data: toCreate.map((p) => ({ ...p.data, businessLineId, status: 'prospect', source: 'csv' })), skipDuplicates: true })
    created = r.count
  }
  return {
    dryRun, rows: parsed.partners.length + parsed.invalid.length, toCreate: toCreate.length, created, duplicates: duplicates.slice(0, 50), duplicateCount: duplicates.length,
    invalid: parsed.invalid.slice(0, 50), invalidCount: parsed.invalid.length,
    withoutCoordinates: toCreate.filter((p) => p.data.lat == null || p.data.lng == null).length,
    sample: toCreate.slice(0, 5).map((p) => ({ name: p.data.name, city: p.data.city, phone: p.data.phone, lat: p.data.lat, lng: p.data.lng })),
  }
}
