/**
 * Private profile previews for partner outreach.
 *
 * - A preview is a WebsiteEntry with status 'preview'. Its link carries a random token; only the sha256 is stored.
 * - The token is issued when the preview is SENT: that moment starts the expiry clock (default 14 days, WebsiteChannel.config.previewValidityDays).
 * - The firm can accept (consent recorded), ask for changes or decline (opt-out). Nothing here publishes the profile:
 *   publication stays an explicit team action after acceptance.
 */
import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { categoryTitles } from '../glossary/taxonomy'
import type { LiveTaxonomy } from '../glossary/live'
import { effectiveLayout } from '../layout/blocks'
import { announceAnswer } from './views'
import { buildOffer, type Offer } from './offer'
import { claimSlots, type ClaimResult } from '../founding/service'

/** Short code (10 chars of base58, ~58 bits, used in /p/<code> links) or the long legacy form pv_… (still valid for links already issued). */
export const PREVIEW_TOKEN_RE = /^(?:[1-9A-HJ-NP-Za-km-z]{10}|pv_[A-Za-z0-9_-]{40,60})$/
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
export const DEFAULT_VALIDITY_DAYS = 14
export const MAX_VALIDITY_DAYS = 90

/** 10 random base58 characters (rejection sampling keeps every character equally likely). */
export function generatePreviewToken(): string {
  let out = ''
  while (out.length < 10) for (const b of randomBytes(16)) { if (b < 232 && out.length < 10) out += BASE58[b % 58] } // 232 = 4 × 58
  return out
}
export const hashPreviewToken = (t: string) => createHash('sha256').update(t).digest('hex')

export function validityDays(config: unknown): number {
  const v = Number((config as { previewValidityDays?: unknown } | null)?.previewValidityDays)
  return Number.isInteger(v) && v >= 1 && v <= MAX_VALIDITY_DAYS ? v : DEFAULT_VALIDITY_DAYS
}

/** Issues (or re-issues, invalidating the previous link) the token of a preview entry and starts its expiry clock. */
export async function issuePreview(lineId: string, entryId: string, o: { days?: number; now?: Date } = {}) {
  const entry = await db.websiteEntry.findFirst({ where: { id: entryId, businessLineId: lineId }, select: { id: true, status: true, title: true, slug: true } })
  if (!entry) throw new AdminError('Intrarea nu există', 404)
  if (entry.status !== 'preview') throw new AdminError('Doar intrările în starea „preview” primesc link de previzualizare', 409)
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { config: true } })
  const days = o.days ?? validityDays(channel?.config)
  if (!Number.isInteger(days) || days < 1 || days > MAX_VALIDITY_DAYS) throw new AdminError(`Valabilitatea trebuie să fie între 1 și ${MAX_VALIDITY_DAYS} zile`, 422)
  const now = o.now ?? new Date()
  const expiresAt = new Date(now.getTime() + days * 86_400_000)
  for (let attempt = 0; ; attempt++) {
    const token = generatePreviewToken()
    try {
      await db.websiteEntry.update({ where: { id: entry.id }, data: { previewTokenHash: hashPreviewToken(token), previewSentAt: now, previewExpiresAt: expiresAt } })
      return { token, expiresAt, days, entry }
    } catch (e) {
      if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue // hash collision with another preview: draw again
      throw e
    }
  }
}

export type PreviewLookup = { state: 'invalid' } | { state: 'expired' } | { state: 'ok'; entry: Awaited<ReturnType<typeof findRow>> & object }

async function findRow(lineId: string, token: string) {
  return db.websiteEntry.findFirst({
    where: { businessLineId: lineId, previewTokenHash: hashPreviewToken(token), status: 'preview' },
    include: { collection: { select: { key: true, name: true, fields: true } }, media: { orderBy: { sortOrder: 'asc' }, take: 60 } },
  })
}

export async function lookupPreview(lineId: string, token: string, now = new Date()): Promise<PreviewLookup> {
  if (!PREVIEW_TOKEN_RE.test(token)) return { state: 'invalid' }
  const entry = await findRow(lineId, token)
  if (!entry) return { state: 'invalid' }
  if (!entry.previewExpiresAt || entry.previewExpiresAt <= now) return { state: 'expired' }
  return { state: 'ok', entry }
}

/** What the firm sees: its own profile data, never CRM / ERP ids. */
export function serializePreview(e: NonNullable<Awaited<ReturnType<typeof findRow>>>, tax?: LiveTaxonomy, offer?: Offer) {
  return {
    ...(offer ? { offer: offer.lines } : {}),
    title: e.title, summary: e.summary, city: e.city, county: e.county, address: e.address, email: e.email, phone: e.phone, websiteUrl: e.websiteUrl,
    body: e.body, coverUrl: e.coverUrl, logoUrl: e.logoUrl, media: e.media.map((m) => ({ url: m.url, alt: m.alt, kind: m.kind })),
    layout: effectiveLayout(e.layout),
    services: categoryTitles((e.data as Record<string, unknown> | null)?.servicii, tax?.categories),
    data: e.data ?? {}, fields: Array.isArray(e.collection.fields) ? e.collection.fields : [], collection: { key: e.collection.key, name: e.collection.name },
    expiresAt: e.previewExpiresAt!.toISOString(),
  }
}

const short = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined)
const client = z.object({ ip: short(64), userAgent: short(300) }).optional()
export const respondSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('accept'), acceptTerms: z.literal(true, { message: 'Acceptă termenii' }), acceptGdpr: z.literal(true, { message: 'Acceptă prelucrarea datelor' }),
    contactName: z.string().trim().min(2).max(120), contactRole: short(80), termsVersion: z.string().trim().min(1).max(40), client,
  }),
  z.object({
    action: z.literal('changes'), message: z.string().trim().min(5).max(1500), contactName: short(120),
    phone: short(40), email: z.string().trim().email().max(200).optional(), websiteUrl: short(300), address: short(200), client,
  }),
  z.object({ action: z.literal('decline'), reason: short(500), client }),
])
export type RespondInput = z.infer<typeof respondSchema>

const ACTIONS = { accept: 'partner_preview_accept', changes: 'partner_preview_changes', decline: 'partner_preview_decline' } as const

/** Records the firm's answer on the linked lead (stage, flags, audit trail). Accepting twice is harmless; declining revokes the link and opts the lead out. */
export async function respondPreview(lineId: string, token: string, raw: unknown, now = new Date()) {
  const found = await lookupPreview(lineId, token, now)
  if (found.state !== 'ok') return found
  const entry = found.entry
  const input = respondSchema.parse(raw)
  if (!entry.leadId) throw new AdminError('Profilul nu e legat de un lead', 409)
  const lead = await db.lead.findFirst({ where: { id: entry.leadId, businessLineId: lineId }, select: { id: true, companyName: true, customFields: true } })
  if (!lead) throw new AdminError('Lead-ul nu există', 404)

  const cf = { ...((lead.customFields ?? {}) as Record<string, unknown>) }
  const { action, client: meta, ...details } = input as RespondInput & { client?: { ip?: string; userAgent?: string } }
  let leadData: Prisma.LeadUpdateInput
  if (input.action === 'accept') {
    Object.assign(cf, { preview_raspuns: 'acceptat', preview_raspuns_la: now.toISOString() })
    leadData = { status: 'onboarding', customFields: cf as Prisma.InputJsonValue }
  } else if (input.action === 'changes') {
    Object.assign(cf, { preview_raspuns: 'modificari', preview_raspuns_la: now.toISOString() })
    leadData = { status: 'in_discutii', customFields: cf as Prisma.InputJsonValue }
  } else {
    Object.assign(cf, { preview_raspuns: 'refuzat', preview_raspuns_la: now.toISOString() })
    leadData = { status: 'refuzat', optOut: true, customFields: cf as Prisma.InputJsonValue }
  }
  const offer = input.action === 'accept' ? await buildOffer(lineId, entry).catch(() => null) : null
  await db.$transaction([
    db.lead.update({ where: { id: lead.id }, data: leadData }),
    db.activity.create({ data: {
      businessLineId: lineId, userName: 'Partener (previzualizare)', action: ACTIONS[input.action], entityType: 'lead', entityId: lead.id, entityName: lead.companyName, leadId: lead.id,
      details: { ...details, ...(offer ? { offerShown: offer.lines, offerTerms: offer.terms } : {}), entryId: entry.id, at: now.toISOString(), ip: meta?.ip, userAgent: meta?.userAgent } as Prisma.InputJsonValue,
    } }),
    ...(input.action === 'decline' ? [db.websiteEntry.update({ where: { id: entry.id }, data: { previewTokenHash: null, previewExpiresAt: now } })] : []),
    ...(input.action === 'accept' ? [db.websiteEntry.update({ where: { id: entry.id }, data: { partnerAccess: true } })] : []),
  ])
  void announceAnswer(lead.id, lead.companyName, input.action, input.action === 'changes' ? input.message : input.action === 'decline' ? input.reason : `${input.contactName}${input.contactRole ? ` (${input.contactRole})` : ''}`).catch(() => undefined)
  // accepting is what claims founding-partner places (first come, first served); a failure here must never undo the firm's answer
  let founder: ClaimResult | undefined
  if (input.action === 'accept') founder = await claimSlots({ id: entry.id, businessLineId: lineId, county: entry.county, data: entry.data }, now).catch((e) => { console.error('[founding] claim failed', e instanceof Error ? e.message : e); return undefined })
  return { state: 'ok' as const, action, founder }
}
