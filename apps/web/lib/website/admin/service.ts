/** Admin operations of the Website module. Every function is scoped to one business line; callers are admin-guarded. */
import { parseSendingWindow } from '@/lib/marketing/sending-window'
import { onProfilePublished } from '@/lib/crm/pipeline-events'
import { db, Prisma } from '@repo/db'
import { z } from 'zod'
import { AdminError } from './errors'
import { validateEntryData, validateFieldDefs, type CollectionField } from './entry-data'
import { withWipField } from '../content/wip'
import { collectionCreate, collectionPatch, channelPatch, entryCreate, entryFromLead, entryPatch } from './schemas'
import { slugify, uniqueSlug } from './slug'
import { normalizeWebsite } from './url'
import { validityDays } from '../preview/service'
import { entryObjectUrls, removeObjects } from '../media/service'
import { invalidateTaxonomy } from '../glossary/live'
import { assertServiceEntry, assertServiceRemovable } from '../glossary/validate'
import { notifyPublished } from '../endorsements/invites'
import { generateWebsiteKey, parseStoredKeys } from '../storefront/keys'
import { invalidateWebsiteKeyCache } from '../storefront/auth'

const MAX_KEYS = 10
const PAGE_SIZE = 25

export async function assertLine(lineId: string) {
  if (!lineId || lineId === 'all') throw new AdminError('Alege o linie de business', 400)
  const line = await db.businessLine.findUnique({ where: { id: lineId }, select: { id: true, name: true, slug: true } })
  if (!line) throw new AdminError('Linia nu există', 404)
  return line
}

// ─── Channel & keys ───────────────────────────────────────────────

export async function getOverview(lineId: string) {
  const line = await assertLine(lineId)
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: lineId } })
  if (!channel) return { line, channel: null }
  const [collections, byStatus, pendingReviews] = await Promise.all([
    db.websiteCollection.count({ where: { businessLineId: lineId } }),
    db.websiteEntry.groupBy({ by: ['status'], where: { businessLineId: lineId }, _count: { _all: true } }),
    db.websiteReview.count({ where: { businessLineId: lineId, status: 'pending' } }),
  ])
  return {
    line,
    channel: {
      id: channel.id, isEnabled: channel.isEnabled, siteUrl: channel.siteUrl, createdAt: channel.createdAt, previewValidityDays: validityDays(channel.config), endorsementsPublic: (channel.config as { endorsementsPublic?: unknown } | null)?.endorsementsPublic === true, legalEmail: ((channel.config as { legalEmail?: unknown } | null)?.legalEmail as string | undefined) ?? null, sendingWindow: parseSendingWindow((channel.config as { sendingWindow?: unknown } | null)?.sendingWindow),
      // hashes never leave the server
      keys: parseStoredKeys(channel.apiKeys).map((k) => ({ id: k.id, label: k.label, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt ?? null })),
    },
    counts: { collections, entries: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])), pendingReviews },
  }
}

export async function enableChannel(lineId: string, raw: unknown) {
  await assertLine(lineId)
  const input = channelPatch.parse(raw ?? {})
  await db.websiteChannel.upsert({
    where: { businessLineId: lineId },
    create: { businessLineId: lineId, siteUrl: input.siteUrl ?? null },
    update: {},
  })
  invalidateWebsiteKeyCache()
  return getOverview(lineId)
}

export async function updateChannel(lineId: string, raw: unknown) {
  await assertLine(lineId)
  const input = channelPatch.parse(raw)
  const exists = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { id: true, config: true } })
  if (!exists) throw new AdminError('Modulul Website nu este activat pe această linie', 404)
  let nextConfig: Record<string, unknown> | undefined
  if (input.previewValidityDays !== undefined) nextConfig = { ...(nextConfig ?? (exists.config ?? {}) as Record<string, unknown>), previewValidityDays: input.previewValidityDays }
  if (input.sendingWindow !== undefined) nextConfig = { ...(nextConfig ?? (exists.config ?? {}) as Record<string, unknown>), sendingWindow: input.sendingWindow }
  if (input.endorsementsPublic !== undefined) nextConfig = { ...(nextConfig ?? (exists.config ?? {}) as Record<string, unknown>), endorsementsPublic: input.endorsementsPublic }
  if (input.legalEmail !== undefined) { nextConfig = { ...(nextConfig ?? (exists.config ?? {}) as Record<string, unknown>) }; if (input.legalEmail) nextConfig.legalEmail = input.legalEmail; else delete nextConfig.legalEmail }
  const config = nextConfig ? (nextConfig as Prisma.InputJsonValue) : undefined
  await db.websiteChannel.update({ where: { businessLineId: lineId }, data: { ...(input.siteUrl !== undefined ? { siteUrl: input.siteUrl } : {}), ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}), ...(config ? { config } : {}) } })
  invalidateWebsiteKeyCache()
  return getOverview(lineId)
}

/** Returns the plain key once; only its hash is stored. */
export async function createApiKey(lineId: string, raw: unknown) {
  const { label } = z.object({ label: z.string().trim().min(1).max(60) }).parse(raw)
  await assertLine(lineId)
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: lineId } })
  if (!channel) throw new AdminError('Activează mai întâi modulul Website', 404)
  const keys = parseStoredKeys(channel.apiKeys)
  if (keys.length >= MAX_KEYS) throw new AdminError(`Maxim ${MAX_KEYS} chei per linie. Revocă una veche.`, 409)
  const g = generateWebsiteKey(label)
  await db.websiteChannel.update({ where: { id: channel.id }, data: { apiKeys: [...keys, g.stored] as unknown as Prisma.InputJsonValue } })
  invalidateWebsiteKeyCache()
  return { key: g.key, id: g.stored.id, label: g.stored.label }
}

export async function revokeApiKey(lineId: string, keyId: string) {
  await assertLine(lineId)
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: lineId } })
  if (!channel) throw new AdminError('Canalul nu există', 404)
  const keys = parseStoredKeys(channel.apiKeys)
  if (!keys.some((k) => k.id === keyId)) throw new AdminError('Cheia nu există', 404)
  await db.websiteChannel.update({ where: { id: channel.id }, data: { apiKeys: keys.filter((k) => k.id !== keyId) as unknown as Prisma.InputJsonValue } })
  invalidateWebsiteKeyCache()
  return { revoked: keyId }
}

// ─── Collections ──────────────────────────────────────────────────

export async function listCollections(lineId: string) {
  await assertLine(lineId)
  const [rows, counts] = await Promise.all([
    db.websiteCollection.findMany({ where: { businessLineId: lineId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    db.websiteEntry.groupBy({ by: ['collectionId'], where: { businessLineId: lineId }, _count: { _all: true } }),
  ])
  const n = new Map(counts.map((c) => [c.collectionId, c._count._all]))
  return rows.map((c) => ({ ...c, entryCount: n.get(c.id) ?? 0 }))
}

function checkFieldDefs(fields: CollectionField[]) {
  const issues = validateFieldDefs(fields)
  if (issues.length) throw new AdminError('Câmpuri invalide', 422, issues)
}

export async function createCollection(lineId: string, raw: unknown) {
  await assertLine(lineId)
  const input = collectionCreate.parse(raw)
  checkFieldDefs(input.fields as CollectionField[])
  if (await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: lineId, key: input.key } }, select: { id: true } })) {
    throw new AdminError(`Există deja o colecție cu cheia „${input.key}”`, 409)
  }
  return db.websiteCollection.create({ data: { ...input, businessLineId: lineId, fields: input.fields as unknown as Prisma.InputJsonValue } })
}

export async function updateCollection(lineId: string, id: string, raw: unknown) {
  await assertLine(lineId)
  const input = collectionPatch.parse(raw)
  const existing = await db.websiteCollection.findFirst({ where: { id, businessLineId: lineId }, select: { id: true } })
  if (!existing) throw new AdminError('Colecția nu există', 404)
  if (input.fields) checkFieldDefs(input.fields as CollectionField[])
  return db.websiteCollection.update({ where: { id }, data: { ...input, ...(input.fields ? { fields: input.fields as unknown as Prisma.InputJsonValue } : {}) } })
}

export async function deleteCollection(lineId: string, id: string) {
  await assertLine(lineId)
  const c = await db.websiteCollection.findFirst({ where: { id, businessLineId: lineId }, select: { id: true } })
  if (!c) throw new AdminError('Colecția nu există', 404)
  const entries = await db.websiteEntry.count({ where: { collectionId: id } })
  if (entries > 0) throw new AdminError(`Colecția are ${entries} intrări. Mută-le sau șterge-le întâi (sau dezactivează colecția).`, 409)
  await db.websiteCollection.delete({ where: { id } })
  return { deleted: id }
}

// ─── Entries ──────────────────────────────────────────────────────

export interface EntryListQuery { collectionId?: string; status?: string; q?: string; page?: number; leadId?: string }

export async function listEntries(lineId: string, q: EntryListQuery) {
  await assertLine(lineId)
  const page = Math.max(1, Math.min(q.page ?? 1, 10_000))
  const where: Prisma.WebsiteEntryWhereInput = {
    businessLineId: lineId,
    ...(q.collectionId ? { collectionId: q.collectionId } : {}),
    ...(q.leadId ? { leadId: q.leadId } : {}),
    ...(q.status && ['draft', 'preview', 'published', 'suspended'].includes(q.status) ? { status: q.status } : {}),
    ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { city: { contains: q.q, mode: 'insensitive' } }, { slug: { contains: q.q, mode: 'insensitive' } }] } : {}),
  }
  const [total, items] = await Promise.all([
    db.websiteEntry.count({ where }),
    db.websiteEntry.findMany({
      where, orderBy: [{ updatedAt: 'desc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      select: { id: true, collectionId: true, leadId: true, slug: true, title: true, status: true, verified: true, featured: true, city: true, county: true, ratingAvg: true, ratingCount: true, updatedAt: true, publishedAt: true },
    }),
  ])
  return { total, page, pageSize: PAGE_SIZE, items }
}

export async function getEntry(lineId: string, id: string) {
  await assertLine(lineId)
  const e = await db.websiteEntry.findFirst({ where: { id, businessLineId: lineId }, include: { media: { orderBy: { sortOrder: 'asc' } } } })
  if (!e) throw new AdminError('Intrarea nu există', 404)
  const lead = e.leadId ? await db.lead.findUnique({ where: { id: e.leadId }, select: { id: true, companyName: true, status: true, entityType: true } }) : null
  return { ...e, lead }
}

async function collectionFor(lineId: string, collectionId: string) {
  const c = await db.websiteCollection.findFirst({ where: { id: collectionId, businessLineId: lineId } })
  if (!c) throw new AdminError('Colecția nu există pe această linie', 404)
  return c
}

/** Drafts may be incomplete; required custom fields are enforced only for published entries. */
function cleanData(fields: CollectionField[], status: string, data: unknown) {
  const defs = status === 'published' ? fields : fields.map((f) => ({ ...f, required: false }))
  return validateEntryData(defs, data) as Prisma.InputJsonValue
}

export async function createEntry(lineId: string, raw: unknown) {
  await assertLine(lineId)
  const input = entryCreate.parse(raw)
  const collection = await collectionFor(lineId, input.collectionId)
  const data = cleanData(withWipField(collection.key, collection.fields as unknown as CollectionField[]), input.status, input.data)
  if (collection.key === 'servicii') await assertServiceEntry(lineId, data as Record<string, unknown>, input.slug ?? slugify(input.title))
  const slug = input.slug
    ? input.slug
    : await uniqueSlug(slugify(input.title), async (s) => !!(await db.websiteEntry.findUnique({ where: { businessLineId_collectionId_slug: { businessLineId: lineId, collectionId: collection.id, slug: s } }, select: { id: true } })))
  try {
    const created = await db.websiteEntry.create({
      data: { ...input, slug, data, businessLineId: lineId, collectionId: collection.id, publishedAt: input.status === 'published' ? new Date() : null },
    })
    if (collection.key === 'servicii') invalidateTaxonomy(lineId)
    return created
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new AdminError(`Slug-ul „${slug}” este deja folosit în această colecție`, 409)
    throw e
  }
}

export async function updateEntry(lineId: string, id: string, raw: unknown) {
  await assertLine(lineId)
  const input = entryPatch.parse(raw)
  const existing = await db.websiteEntry.findFirst({ where: { id, businessLineId: lineId }, include: { collection: true } })
  if (!existing) throw new AdminError('Intrarea nu există', 404)

  const status = input.status ?? existing.status
  const fields = withWipField(existing.collection.key, existing.collection.fields as unknown as CollectionField[])
  // data is re-validated whenever it, or the status that decides which fields are required, changes
  const data = input.data !== undefined || input.status !== undefined ? cleanData(fields, status, input.data ?? existing.data) : undefined
  const { data: _d, ...rest } = input
  if (input.leadId) await assertLinkableLead(lineId, input.leadId, id)
  const isService = existing.collection.key === 'servicii'
  if (isService) {
    const merged = (data ?? (existing.data as Record<string, unknown>)) as Record<string, unknown>
    await assertServiceEntry(lineId, merged, input.slug ?? existing.slug, id)
    // suspending or renaming a service takes its old slug out of use
    if (status === 'suspended' && existing.status !== 'suspended') await assertServiceRemovable(lineId, existing)
    if (input.slug && input.slug !== existing.slug) await assertServiceRemovable(lineId, existing)
  }
  try {
    const saved = await db.websiteEntry.update({
      where: { id },
      data: { ...rest, ...(data !== undefined ? { data } : {}), ...(status === 'published' && !existing.publishedAt ? { publishedAt: new Date() } : {}) },
    })
    if (isService) invalidateTaxonomy(lineId)
    if (saved.status === 'published' && existing.status !== 'published') {
      await onProfilePublished(saved.leadId)
      await notifyInviters(lineId, saved.id)
    }
    return saved
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new AdminError('Slug-ul este deja folosit în această colecție', 409)
    throw e
  }
}

export async function deleteEntry(lineId: string, id: string) {
  await assertLine(lineId)
  const e = await db.websiteEntry.findFirst({ where: { id, businessLineId: lineId }, select: { id: true, slug: true, data: true, collection: { select: { key: true } } } })
  if (!e) throw new AdminError('Intrarea nu există', 404)
  if (e.collection.key === 'servicii') await assertServiceRemovable(lineId, e)
  const urls = await entryObjectUrls(id)
  await db.websiteEntry.delete({ where: { id } })
  await removeObjects(urls) // best effort: files of a deleted entry must not stay public
  if (e.collection.key === 'servicii') invalidateTaxonomy(lineId)
  return { deleted: id }
}

// ─── CRM link (partner lead ↔ website entry) ──────────────────────

/** A lead can be linked from its own business line only, and to one entry at a time. */
async function assertLinkableLead(lineId: string, leadId: string, exceptEntryId?: string) {
  const lead = await db.lead.findFirst({ where: { id: leadId, businessLineId: lineId }, select: { id: true } })
  if (!lead) throw new AdminError('Lead-ul nu există pe această linie', 404)
  const other = await db.websiteEntry.findFirst({ where: { leadId, ...(exceptEntryId ? { NOT: { id: exceptEntryId } } : {}) }, select: { id: true, title: true } })
  if (other) throw new AdminError(`Lead-ul este deja legat de intrarea „${other.title}”`, 409, { entryId: other.id })
}

/** Creates a DRAFT entry prefilled from a CRM lead and links it. Nothing is published automatically. */
export async function createEntryFromLead(lineId: string, raw: unknown) {
  await assertLine(lineId)
  const input = entryFromLead.parse(raw)
  const collection = await collectionFor(lineId, input.collectionId)
  const lead = await db.lead.findFirst({ where: { id: input.leadId, businessLineId: lineId } })
  if (!lead) throw new AdminError('Lead-ul nu există pe această linie', 404)
  await assertLinkableLead(lineId, lead.id)

  const fields = collection.fields as unknown as CollectionField[]
  const data: Record<string, string> = {}
  // reuse what the CRM already knows when the collection has a matching text field
  if (lead.cui && fields.some((f) => f.key === 'cui' && f.type === 'text')) data.cui = lead.cui.trim().slice(0, 200)

  const title = (lead.companyName || '').trim().slice(0, 160)
  if (title.length < 2) throw new AdminError('Lead-ul nu are o denumire de companie utilizabilă', 422)
  const slug = await uniqueSlug(slugify(title), async (s) => !!(await db.websiteEntry.findUnique({ where: { businessLineId_collectionId_slug: { businessLineId: lineId, collectionId: collection.id, slug: s } }, select: { id: true } })))
  return db.websiteEntry.create({
    data: {
      businessLineId: lineId, collectionId: collection.id, slug, title, status: 'draft', leadId: lead.id, data,
      email: lead.email && !lead.email.endsWith('@formular.ro') ? lead.email : null,
      phone: lead.phone?.trim().slice(0, 40) || null,
      city: lead.city?.trim().slice(0, 80) || null,
      county: lead.county?.trim().slice(0, 80) || null,
      address: lead.address?.trim().slice(0, 200) || null,
      websiteUrl: normalizeWebsite(lead.website),
    },
  })
}

// ─── Reviews ──────────────────────────────────────────────────────

async function recomputeRating(tx: Prisma.TransactionClient, entryId: string) {
  const agg = await tx.websiteReview.aggregate({ where: { entryId, status: 'approved' }, _avg: { rating: true }, _count: { _all: true } })
  const avg = agg._avg.rating
  await tx.websiteEntry.update({ where: { id: entryId }, data: { ratingCount: agg._count._all, ratingAvg: avg == null ? null : new Prisma.Decimal(avg.toFixed(2)) } })
}

export async function listReviews(lineId: string, q: { status?: string; page?: number }) {
  await assertLine(lineId)
  const page = Math.max(1, Math.min(q.page ?? 1, 10_000))
  const where: Prisma.WebsiteReviewWhereInput = { businessLineId: lineId, ...(q.status && ['pending', 'approved', 'rejected'].includes(q.status) ? { status: q.status } : {}) }
  const [total, items] = await Promise.all([
    db.websiteReview.count({ where }),
    db.websiteReview.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { entry: { select: { title: true, slug: true } } } }),
  ])
  return { total, page, pageSize: PAGE_SIZE, items }
}

export async function moderateReview(lineId: string, id: string, userId: string | null, raw: unknown) {
  await assertLine(lineId)
  const { status } = (await import('./schemas')).reviewPatch.parse(raw)
  const r = await db.websiteReview.findFirst({ where: { id, businessLineId: lineId }, select: { id: true, entryId: true } })
  if (!r) throw new AdminError('Recenzia nu există', 404)
  return db.$transaction(async (tx) => {
    const updated = await tx.websiteReview.update({ where: { id }, data: { status, moderatedAt: new Date(), moderatedBy: userId } })
    await recomputeRating(tx, r.entryId)
    return updated
  })
}

export async function deleteReview(lineId: string, id: string) {
  await assertLine(lineId)
  const r = await db.websiteReview.findFirst({ where: { id, businessLineId: lineId }, select: { entryId: true } })
  if (!r) throw new AdminError('Recenzia nu există', 404)
  await db.$transaction(async (tx) => {
    await tx.websiteReview.delete({ where: { id } })
    await recomputeRating(tx, r.entryId)
  })
  return { deleted: id }
}

/** Tells the colleagues who invited this doctor (and were confirmed) that the profile is now public; uses the first site of the line. */
async function notifyInviters(lineId: string, entryId: string) {
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { siteUrl: true, apiKeys: true } })
  if (!channel) return
  const key = parseStoredKeys(channel.apiKeys).find((k) => k.siteUrl && k.brandName)
  await notifyPublished(entryId, { siteUrl: key?.siteUrl ?? channel.siteUrl ?? '', brandName: key?.brandName ?? 'platforma' })
}
