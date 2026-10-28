/**
 * Quote requests (cereri de ofertă): customer → firms.
 *
 * - A GENERAL request (from a service page) is routed by the "routing" rules to the best firms of that county and category; a DIRECT request
 *   (from a firm's profile) always goes to that firm and is not subject to routing.
 * - Before accepting, a firm sees a teaser (no contact data) and the price from the "pricing" rules. Accepting reveals the customer's contact data.
 *   A firm on the "abonament" plan receives direct requests with full data and no per-request fee.
 * - Acceptances are capped per request (maxAcceptances, atomically); the fee owed is stored on the delivery (invoiced by the team, no online payment yet).
 */
import { describeSource } from './source'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { resolveRule } from '../rules/engine'
import type { Facts, RuleKind, RuleLike } from '../rules/types'
import { getTaxonomy } from '../glossary/live'
import { nationalPhone } from '../../prospectare/import-mapping'
import type { Notifier } from '../partner/auth'
import { planActive } from '../plan'
import { pickFirms, teaserText, type Candidate } from './routing'

export const REQUEST_TTL_HOURS = 72
const MAX_PER_CONTACT_PER_DAY = 5
const URGENCY = ['urgent', 'saptamana', 'luna', 'flexibil'] as const
export const URGENCY_LABEL: Record<string, string> = { urgent: 'Urgent', saptamana: 'În această săptămână', luna: 'În această lună', flexibil: 'Flexibil' }

const short = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined)
export const requestSchema = z.object({
  type: z.enum(['direct', 'general']),
  companySlug: short(200),
  category: z.string().trim().min(1).max(80),
  county: z.string().trim().min(2).max(60),
  city: short(80),
  description: z.string().trim().min(15, 'Descrie pe scurt lucrarea (minim 15 caractere)').max(2000),
  budgetRon: z.number().int().min(0).max(100_000_000).optional(),
  urgency: z.enum(URGENCY).optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200).transform((e) => e.toLowerCase()),
  phone: z.string().trim().max(40),
  consent: z.literal(true, { message: 'Acceptă prelucrarea datelor' }),
  sourcePage: short(300),
  ip: short(64),
})

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const toLike = (r: { id: string; kind: string; name: string; priority: number; isActive: boolean; conditions: unknown; action: unknown; validFrom: Date | null; validTo: Date | null; createdAt: Date }): RuleLike =>
  ({ id: r.id, kind: r.kind as RuleKind, name: r.name, priority: r.priority, isActive: r.isActive, conditions: r.conditions as never, action: r.action, validFrom: r.validFrom, validTo: r.validTo, createdAt: r.createdAt })

type Req = { type: string; category: string; county: string; city: string | null; budgetRon: number | null; urgency: string | null }
type EntryLike = { id: string; plan: string; planUntil: Date | null; verified: boolean }


function requestFacts(r: Req): Facts {
  return { requestType: r.type, county: r.county, city: r.city ?? undefined, category: r.category, specialization: [r.category], budget: r.budgetRon ?? undefined, urgency: r.urgency ?? undefined }
}

/** What a firm owes for accepting this request (rules + the firm's own history), and why. */
export async function priceFor(lineId: string, entry: EntryLike, r: Req, now = new Date()): Promise<{ amountRon: number; reason: 'abonament' | 'gratuit' | 'tarif' }> {
  if (r.type === 'direct' && planActive(entry, now)) return { amountRon: 0, reason: 'abonament' }
  const [rows, founding, prior] = await Promise.all([
    db.websiteRule.findMany({ where: { businessLineId: lineId, kind: 'pricing' } }),
    db.websiteFoundingSlot.count({ where: { entryId: entry.id, county: r.county, category: r.category } }),
    db.websiteRequestDelivery.count({ where: { entryId: entry.id, status: 'accepted' } }),
  ])
  const facts: Facts = { ...requestFacts(r), founding: founding > 0, plan: planActive(entry, now) ? 'abonament' : 'gratuit', verified: entry.verified }
  const a = resolveRule('pricing', facts, rows.map(toLike), now).action
  if (a.amountRon === 0 || prior < a.freeFirstN) return { amountRon: 0, reason: 'gratuit' }
  return { amountRon: a.amountRon, reason: 'tarif' }
}

// ─── customer side ───────────────────────────────────────────────

export async function createRequest(lineId: string, raw: unknown, o: { notifier?: Notifier; now?: Date; siteUrl?: string } = {}) {
  const now = o.now ?? new Date()
  const input = requestSchema.parse(raw)
  const phone = nationalPhone(input.phone)
  if (!phone) throw new AdminError('Telefon invalid', 422)
  const tax = await getTaxonomy(lineId)
  if (!tax.categories.some((c) => c.slug === input.category)) throw new AdminError('Categorie necunoscută', 422)

  const since = new Date(now.getTime() - 86_400_000)
  const recent = await db.websiteRequest.count({ where: { businessLineId: lineId, createdAt: { gt: since }, OR: [{ customerEmail: input.email }, { customerPhone: phone }] } })
  if (recent >= MAX_PER_CONTACT_PER_DAY) throw new AdminError('Ai trimis deja mai multe cereri astăzi. Încearcă mâine.', 429)

  const base = { type: input.type, category: input.category, county: input.county, city: input.city ?? null, budgetRon: input.budgetRon ?? null, urgency: input.urgency ?? null }
  let firms: { entry: EntryLike & { title: string; email: string | null; phone: string | null }; }[] = []
  let routing: Record<string, unknown> = {}
  let maxAcceptances = 1

  if (input.type === 'direct') {
    if (!input.companySlug) throw new AdminError('Lipsește firma', 422)
    const e = await db.websiteEntry.findFirst({ where: { businessLineId: lineId, slug: input.companySlug, status: 'published', collection: { key: 'companii' } }, select: { id: true, title: true, email: true, phone: true, plan: true, planUntil: true, verified: true, data: true } })
    if (!e) throw new AdminError('Firma nu există', 404)
    const services = Array.isArray((e.data as { servicii?: unknown } | null)?.servicii) ? ((e.data as { servicii: unknown[] }).servicii).map(String) : []
    if (!services.includes(input.category)) throw new AdminError('Firma nu oferă acest serviciu', 422)
    firms = [{ entry: e }]
    routing = { mode: 'direct' }
  } else {
    const rules = await db.websiteRule.findMany({ where: { businessLineId: lineId, kind: 'routing' } })
    const res = resolveRule('routing', requestFacts(base), rules.map(toLike), now)
    const a = res.action
    maxAcceptances = a.maxAcceptances
    const entries = await db.websiteEntry.findMany({
      where: { businessLineId: lineId, status: 'published', collection: { key: 'companii' }, county: { equals: input.county, mode: 'insensitive' }, data: { path: ['servicii'], array_contains: input.category } },
      select: { id: true, title: true, email: true, phone: true, city: true, plan: true, planUntil: true, verified: true, ratingAvg: true, ratingCount: true },
    })
    const last = await db.websiteRequestDelivery.groupBy({ by: ['entryId'], where: { entryId: { in: entries.map((e) => e.id) } }, _max: { sentAt: true } })
    const lastBy = new Map(last.map((l) => [l.entryId, l._max.sentAt]))
    const cands: (Candidate & { e: (typeof entries)[number] })[] = entries.map((e) => ({ id: e.id, city: e.city, ratingAvg: e.ratingAvg === null ? null : Number(e.ratingAvg), ratingCount: e.ratingCount, lastDeliveryAt: lastBy.get(e.id) ?? null, e }))
    const picked = pickFirms(cands, a, input.city ?? null) as typeof cands
    firms = picked.map((c) => ({ entry: c.e }))
    routing = { mode: 'general', via: res.via, rule: res.rule, candidates: entries.length, selected: picked.length, selection: a.selection, maxFirms: a.maxFirms }
  }

  const billingRows = await db.websiteRule.findMany({ where: { businessLineId: lineId, kind: 'billing' } })
  const chargeAt = resolveRule('billing', requestFacts(base), billingRows.map(toLike), now).action.chargeAt

  const deliveries: { entryId: string; status: string; chargedRon: number | null; chargeReason: string | null; respondedAt: Date | null }[] = []
  for (const { entry } of firms) {
    const p = await priceFor(lineId, entry, base, now)
    const included = p.reason === 'abonament'
    deliveries.push({
      entryId: entry.id, status: included ? 'accepted' : 'sent', respondedAt: included ? now : null,
      chargedRon: included ? 0 : chargeAt === 'delivery' ? p.amountRon : null, chargeReason: included ? 'abonament' : chargeAt === 'delivery' ? 'livrare' : null,
    })
  }

  const request = await db.websiteRequest.create({
    data: {
      businessLineId: lineId, ...base, directEntryId: input.type === 'direct' ? firms[0]?.entry.id : null, description: input.description,
      customerName: input.name, customerEmail: input.email, customerPhone: phone, maxAcceptances,
      status: firms.length ? 'sent' : 'unrouted', routing: routing as Prisma.InputJsonValue, sourcePage: input.sourcePage ?? null, ipHash: input.ip ? sha(input.ip) : null,
      expiresAt: new Date(now.getTime() + REQUEST_TTL_HOURS * 3_600_000),
      deliveries: { create: deliveries.map((d) => ({ ...d, businessLineId: lineId })) },
    },
    select: { id: true },
  })

  if (o.notifier) void notifyFirms(lineId, request.id, firms.map((f) => f.entry), o.notifier, o.siteUrl).catch((e) => console.error('[requests] notify firms', e instanceof Error ? e.message : e))
  return { id: request.id, firms: firms.length }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

async function notifyFirms(lineId: string, requestId: string, entries: { id: string; title: string; email: string | null }[], n: Notifier, siteUrl = 'https://intraconstruct.ro') {
  const req = await db.websiteRequest.findUnique({ where: { id: requestId }, include: { deliveries: true } })
  if (!req) return
  const tax = await getTaxonomy(lineId)
  const cat = tax.categories.find((c) => c.slug === req.category)?.title ?? req.category
  for (const e of entries) {
    if (!e.email) continue
    const d = req.deliveries.find((x) => x.entryId === e.id)
    const full = d?.status === 'accepted'
    const where = `${req.city ? req.city + ', ' : ''}${req.county}`
    const body = full
      ? `Aveți o cerere nouă (abonament): ${cat}, ${where}.\n\n${req.description}\n\nClient: ${req.customerName}, ${req.customerPhone}, ${req.customerEmail}`
      : `Aveți o cerere nouă: ${cat}, ${where}.\n\n${teaserText(req.description)}\n\nDeschideți Profilul meu pentru detalii și acceptare: ${siteUrl}/cont`
    await n.email(e.email, `Cerere nouă: ${cat} în ${where}`, body.split('\n').map((l) => `<p>${esc(l)}</p>`).join(''), body).catch((err) => console.error('[requests] email', err instanceof Error ? err.message : err))
  }
}

// ─── firm side ───────────────────────────────────────────────────

type DeliveryRow = Prisma.WebsiteRequestDeliveryGetPayload<{ include: { request: true } }>

async function serialize(lineId: string, entry: EntryLike, d: DeliveryRow, now: Date) {
  const r = d.request
  const open = d.status === 'sent' && r.expiresAt > now
  const status = d.status === 'sent' && !open ? 'expired' : d.status
  const full = status === 'accepted'
  const price = open ? await priceFor(lineId, entry, r, now) : null
  return {
    id: r.id, status, category: r.category, county: r.county, city: r.city, budgetRon: r.budgetRon, urgency: r.urgency, urgencyLabel: r.urgency ? URGENCY_LABEL[r.urgency] : null,
    description: full ? r.description : teaserText(r.description), createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt.toISOString(), type: r.type,
    firmsCount: r.maxAcceptances, // how many firms may accept
    offerRon: price ? price.amountRon : null, chargedRon: d.chargedRon === null ? null : Number(d.chargedRon), chargeReason: d.chargeReason,
    customer: full ? { name: r.customerName, phone: r.customerPhone, email: r.customerEmail } : null,
  }
}

export async function listForPartner(lineId: string, entry: EntryLike, now = new Date()) {
  const rows = await db.websiteRequestDelivery.findMany({ where: { entryId: entry.id, sentAt: { gt: new Date(now.getTime() - 90 * 86_400_000) } }, include: { request: true }, orderBy: { sentAt: 'desc' }, take: 100 })
  return { plan: planActive(entry as EntryLike, now) ? 'abonament' : 'gratuit', items: await Promise.all(rows.map((d) => serialize(lineId, entry, d, now))) }
}

export const respondSchema = z.object({ action: z.enum(['accept', 'decline']) })

export async function respond(lineId: string, entry: EntryLike & { title: string; email: string | null; phone: string | null }, requestId: string, raw: unknown, o: { notifier?: Notifier; brandName?: string; now?: Date } = {}) {
  const now = o.now ?? new Date()
  const { action } = respondSchema.parse(raw)
  const found = await db.websiteRequestDelivery.findFirst({ where: { requestId, entryId: entry.id, businessLineId: lineId }, include: { request: true } })
  if (!found) throw new AdminError('Cererea nu există', 404)
  if (found.status !== 'sent') return { state: found.status as string, request: await serialize(lineId, entry, found, now) }
  if (found.request.expiresAt <= now) {
    await db.websiteRequestDelivery.update({ where: { id: found.id }, data: { status: 'expired', respondedAt: now } })
    throw new AdminError('Cererea a expirat', 410)
  }
  if (action === 'decline') {
    const d = await db.websiteRequestDelivery.update({ where: { id: found.id }, data: { status: 'declined', respondedAt: now }, include: { request: true } })
    return { state: 'declined', request: await serialize(lineId, entry, d, now) }
  }

  const price = found.chargedRon === null ? await priceFor(lineId, entry, found.request, now) : null
  const outcome = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requestId}))`
    const cur = await tx.websiteRequestDelivery.findUniqueOrThrow({ where: { id: found.id } })
    if (cur.status !== 'sent') return cur.status
    const taken = await tx.websiteRequestDelivery.count({ where: { requestId, status: 'accepted' } })
    if (taken >= found.request.maxAcceptances) {
      await tx.websiteRequestDelivery.update({ where: { id: found.id }, data: { status: 'full', respondedAt: now } })
      return 'full'
    }
    await tx.websiteRequestDelivery.update({ where: { id: found.id }, data: { status: 'accepted', respondedAt: now, ...(price ? { chargedRon: price.amountRon, chargeReason: price.reason } : {}) } })
    return 'accepted'
  })
  const d = await db.websiteRequestDelivery.findUniqueOrThrow({ where: { id: found.id }, include: { request: true } })
  if (outcome === 'accepted' && o.notifier) void notifyCustomer(d.request, entry, o.notifier, o.brandName ?? 'IntraConstruct').catch((e) => console.error('[requests] notify customer', e instanceof Error ? e.message : e))
  return { state: outcome, request: await serialize(lineId, entry, d, now) }
}

async function notifyCustomer(r: { customerEmail: string; customerName: string }, firm: { title: string; email: string | null; phone: string | null }, n: Notifier, brand: string) {
  const body = `Bună ziua, ${r.customerName},\n\n${firm.title} a acceptat cererea dumneavoastră și vă va contacta în curând.\nContact firmă: ${[firm.phone, firm.email].filter(Boolean).join(' · ') || 'veți fi contactat de firmă'}\n\nEchipa ${brand}`
  await n.email(r.customerEmail, `${firm.title} a acceptat cererea dumneavoastră`, body.split('\n').map((l) => `<p>${esc(l)}</p>`).join(''), body)
}

// ─── admin side ──────────────────────────────────────────────────

export async function adminOverview(lineId: string, q: { month?: string; page?: number }) {
  const month = /^\d{4}-\d{2}$/.test(q.month ?? '') ? q.month! : new Date().toISOString().slice(0, 7)
  const from = new Date(`${month}-01T00:00:00Z`), to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1)
  const page = Math.max(1, q.page ?? 1)
  const [requests, owed] = await Promise.all([
    db.websiteRequest.findMany({ where: { businessLineId: lineId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 30, take: 30, include: { deliveries: { include: { entry: { select: { title: true } } } } } }),
    db.websiteRequestDelivery.groupBy({ by: ['entryId'], where: { businessLineId: lineId, status: 'accepted', respondedAt: { gte: from, lt: to }, chargedRon: { gt: 0 } }, _sum: { chargedRon: true }, _count: true }),
  ])
  const titles = new Map((await db.websiteEntry.findMany({ where: { id: { in: owed.map((o) => o.entryId) } }, select: { id: true, title: true } })).map((e) => [e.id, e.title]))
  return {
    month,
    owed: owed.map((o) => ({ entryId: o.entryId, title: titles.get(o.entryId) ?? o.entryId, accepted: o._count, totalRon: Number(o._sum.chargedRon ?? 0) })).sort((a, b) => b.totalRon - a.totalRon),
    items: requests.map((r) => ({
      id: r.id, type: r.type, status: r.status, category: r.category, county: r.county, city: r.city, createdAt: r.createdAt.toISOString(), customerName: r.customerName, routing: r.routing,
      sourcePage: r.sourcePage, source: describeSource(r.sourcePage),
      deliveries: r.deliveries.map((d) => ({ entryId: d.entryId, title: d.entry.title, status: d.status, chargedRon: d.chargedRon === null ? null : Number(d.chargedRon), chargeReason: d.chargeReason })),
    })),
  }
}
