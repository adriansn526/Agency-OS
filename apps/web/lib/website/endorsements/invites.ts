/**
 * Invitations to recommend a colleague who has no profile yet.
 *
 * The recommender picks what the colleague is recommended for and gets a personal link (`/i/<code>`) to send by WhatsApp / SMS / email; the
 * platform never sees the colleague's phone. The colleague opens the link, fills a short form and a PRIVATE profile is created (the login
 * link goes to the email given, which proves it). The recommender is told by email and confirms it is the colleague meant; only then the
 * recommendation is attached to that profile. It shows publicly only once the profile is verified and published, under the usual rules.
 */
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { sendRawEmail } from '../../email'
import { AdminError } from '../admin/errors'
import { getTaxonomy } from '../glossary/live'
import { requestLogin, type Notifier } from '../partner/auth'
import { nationalPhone } from '../../prospectare/import-mapping'
import { generatePreviewToken } from '../preview/service'
import { activeCmr, CMR_KEY, decodeCmr } from '../verification/cmr-data'
import { MONTHLY_LIMIT, NOTE_MAX, WINDOW_DAYS } from './rules'

const DAY = 86_400_000
export const INVITE_DAYS = 60
export const INVITE_CODE_RE = /^[1-9A-HJ-NP-Za-km-z]{10}$/
const slugRe = /^[a-z0-9][a-z0-9-]{0,118}$/
const hashCode = (c: string) => createHash('sha256').update(c).digest('hex')
const cmrActive = (data: unknown, now: Date) => activeCmr(decodeCmr((data as Record<string, unknown> | null)?.[CMR_KEY]), now).length > 0

export const inviteInput = z.object({
  name: z.string().trim().max(80).optional(),
  servicii: z.array(z.string().trim().regex(slugRe)).max(6).optional(),
  note: z.string().trim().max(NOTE_MAX).optional(),
  showName: z.boolean().optional(),
}).strict()

export const registerInput = z.object({
  name: z.string().trim().min(3, 'Completează numele').max(120),
  specialty: z.string().trim().min(3, 'Completează specialitatea').max(120),
  phone: z.string().trim().min(9, 'Telefon invalid').max(40),
  email: z.string().trim().email('Email invalid').max(200).transform((e) => e.toLowerCase()),
  city: z.string().trim().max(80).optional(),
  parafa: z.string().trim().regex(/^[A-Za-z0-9]{4,10}$/, 'Codul de parafă are 4–10 litere și cifre').optional(),
  consent: z.literal(true, { message: 'Acceptă să fii contactat' }),
}).strict()

export type Mailer = (to: string, subject: string, html: string, text: string, line: { slug: string }) => Promise<void>
const defaultMailer: Mailer = async (to, subject, html, text, line) => { await sendRawEmail({ to, subject, html, text, businessLine: line.slug, purpose: 'partners', source: 'endorsement-invite' }) }
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const paragraphs = (text: string) => text.split('\n').filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('')

type Doctor = { id: string; businessLineId: string; title: string; leadId?: string | null }
const audit = (lineId: string, entry: { id: string; title: string }, action: string, details: Record<string, unknown>) =>
  db.activity.create({ data: { businessLineId: lineId, userName: 'Invitație de recomandare', action, entityType: 'website_entry', entityId: entry.id, entityName: entry.title, details: details as Prisma.InputJsonValue } })

// ─── the recommender ─────────────────────────────────────────────

/** Creates an invitation and returns its personal code (shown once; only its hash is stored). Counts toward the same monthly limit as endorsements. */
export async function createInvite(inviter: Doctor, raw: unknown, now = new Date()) {
  const input = inviteInput.parse(raw)
  const me = await db.websiteEntry.findUnique({ where: { id: inviter.id }, select: { id: true, businessLineId: true, title: true, status: true, data: true } })
  if (!me || me.status !== 'published') throw new AdminError('Profilul tău trebuie să fie publicat ca să poți recomanda', 403)
  if (!cmrActive(me.data, now)) throw new AdminError('Poți recomanda doar după ce echipa a verificat dreptul tău de practică în Registrul CMR', 403)

  const since = new Date(now.getTime() - WINDOW_DAYS * DAY)
  const [e, i] = await Promise.all([
    db.websiteEndorsement.count({ where: { endorserId: me.id, endorsedAt: { gt: since } } }),
    db.websiteEndorsementInvite.count({ where: { inviterId: me.id, createdAt: { gt: since }, status: { not: 'revoked' } } }),
  ])
  if (e + i >= MONTHLY_LIMIT) throw new AdminError(`Poți face cel mult ${MONTHLY_LIMIT} recomandări noi la 30 de zile`, 429)

  const servicii = [...new Set(input.servicii ?? [])]
  if (servicii.length) {
    const tax = await getTaxonomy(me.businessLineId)
    const bad = servicii.filter((s) => !tax.categories.some((c) => c.slug === s))
    if (bad.length) throw new AdminError('Specialitate sau procedură necunoscută', 422, bad)
  }

  for (let attempt = 0; ; attempt++) {
    const code = generatePreviewToken()
    try {
      const row = await db.websiteEndorsementInvite.create({ data: { businessLineId: me.businessLineId, inviterId: me.id, codeHash: hashCode(code), inviteeName: input.name || null, forServicii: servicii, note: input.note || null, showName: input.showName ?? true, expiresAt: new Date(now.getTime() + INVITE_DAYS * DAY) } })
      await audit(me.businessLineId, me, 'endorsement_invite_created', { inviteId: row.id, servicii })
      return { id: row.id, code, expiresAt: row.expiresAt.toISOString() }
    } catch (err) {
      if (attempt < 3 && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue
      throw err
    }
  }
}

export async function listInvites(inviter: Doctor, now = new Date()) {
  const rows = await db.websiteEndorsementInvite.findMany({ where: { inviterId: inviter.id, status: { not: 'revoked' } }, orderBy: { createdAt: 'desc' }, take: 30, include: { invitee: { select: { title: true, city: true, county: true, data: true } } } })
  return rows.map((r) => ({
    id: r.id, name: r.inviteeName, servicii: (r.forServicii as string[] | null) ?? [], note: r.note, showName: r.showName, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt.toISOString(),
    status: r.status === 'sent' && r.expiresAt <= now ? 'expired' : r.status,
    invitee: r.invitee ? { title: r.invitee.title, city: r.invitee.city, specialty: String((r.invitee.data as { specializare?: unknown } | null)?.specializare ?? '') || null } : null,
  }))
}

/** The recommender answers "is this the colleague you invited?" (confirm attaches the recommendation) or withdraws an invitation that is still open. */
export async function answerInvite(inviter: Doctor, id: string, action: 'confirm' | 'reject' | 'revoke', now = new Date()) {
  const inv = await db.websiteEndorsementInvite.findFirst({ where: { id, inviterId: inviter.id } })
  if (!inv) throw new AdminError('Invitația nu există', 404)
  if (action === 'revoke') {
    if (inv.status !== 'sent') throw new AdminError('Invitația nu mai poate fi retrasă', 409)
    await db.websiteEndorsementInvite.update({ where: { id }, data: { status: 'revoked' } })
    return { status: 'revoked' }
  }
  if (inv.status !== 'registered' || !inv.inviteeEntryId) throw new AdminError('Invitația nu așteaptă confirmare', 409)
  if (action === 'reject') {
    await db.websiteEndorsementInvite.update({ where: { id }, data: { status: 'rejected' } })
    return { status: 'rejected' }
  }
  const me = await db.websiteEntry.findUnique({ where: { id: inviter.id }, select: { id: true, businessLineId: true, title: true, status: true, data: true } })
  if (!me || me.status !== 'published') throw new AdminError('Profilul tău trebuie să fie publicat ca să poți recomanda', 403)
  if (!cmrActive(me.data, now)) throw new AdminError('Poți recomanda doar după ce echipa a verificat dreptul tău de practică în Registrul CMR', 403)
  if (inv.inviteeEntryId === me.id) throw new AdminError('Nu te poți recomanda singur', 422)
  const existing = await db.websiteEndorsement.findUnique({ where: { endorserId_endorseeId: { endorserId: me.id, endorseeId: inv.inviteeEntryId } } })
  if (existing?.status === 'removed') throw new AdminError('Această recomandare a fost scoasă de echipă', 403)
  const data = { note: inv.note, showName: inv.showName, forServicii: inv.forServicii as Prisma.InputJsonValue, sameClinic: false, status: 'active', endorsedAt: now }
  const row = await db.websiteEndorsement.upsert({ where: { endorserId_endorseeId: { endorserId: me.id, endorseeId: inv.inviteeEntryId } }, create: { businessLineId: me.businessLineId, endorserId: me.id, endorseeId: inv.inviteeEntryId, ...data }, update: data })
  await db.websiteEndorsementInvite.update({ where: { id }, data: { status: 'confirmed', confirmedAt: now, endorsementId: row.id } })
  await audit(me.businessLineId, me, 'endorsement_invite_confirmed', { inviteId: id, endorsee: inv.inviteeEntryId })
  return { status: 'confirmed' }
}

// ─── the colleague ───────────────────────────────────────────────

export type InviteLookup = { state: 'invalid' | 'expired' | 'used' } | { state: 'ok'; invite: { id: string; inviterName: string | null; inviterSpecialty: string | null; areas: { slug: string; title: string }[]; note: string | null; inviteeName: string | null } }

/** What the colleague sees when opening the link. The recommender is named only when they agreed to be. */
export async function lookupInvite(lineId: string, code: string, now = new Date()): Promise<InviteLookup> {
  if (!INVITE_CODE_RE.test(code)) return { state: 'invalid' }
  const inv = await db.websiteEndorsementInvite.findUnique({ where: { codeHash: hashCode(code) }, include: { inviter: { select: { title: true, data: true } } } })
  if (!inv || inv.businessLineId !== lineId || inv.status === 'revoked') return { state: 'invalid' }
  if (inv.status !== 'sent') return { state: 'used' }
  if (inv.expiresAt <= now) return { state: 'expired' }
  if (!inv.openedAt) await db.websiteEndorsementInvite.update({ where: { id: inv.id }, data: { openedAt: now } })
  const tax = await getTaxonomy(lineId)
  const areas = ((inv.forServicii as string[] | null) ?? []).map((s) => ({ slug: s, title: tax.categories.find((c) => c.slug === s)?.title ?? s }))
  return { state: 'ok', invite: { id: inv.id, inviterName: inv.showName ? inv.inviter.title : null, inviterSpecialty: inv.showName ? String((inv.inviter.data as { specializare?: unknown } | null)?.specializare ?? '') || null : null, areas, note: inv.note, inviteeName: inv.inviteeName } }
}

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100)
const withDoctorTitle = (n: string) => (/^dr\.?\s/i.test(n) ? n : `Dr. ${n}`)

type RegisterInput = z.infer<typeof registerInput>

/**
 * Creates the private profile (status preview, partner access) and its CRM lead for a doctor who asked for one, or finds the profile that already has this
 * email/phone. Used by the personal invitation link and by the public sign-up form, so both behave the same.
 */
async function provisionProfile(lineId: string, input: RegisterInput, o: { source: 'invitatie' | 'formular'; externalId: string; invitedBy?: string; forbidEntryId?: string }) {
  const phone = nationalPhone(input.phone) ?? input.phone
  const digits = phone.replace(/\D/g, '')
  const existing = await db.websiteEntry.findFirst({ where: { businessLineId: lineId, collection: { key: 'companii' }, OR: [{ email: { equals: input.email, mode: 'insensitive' } }, ...(digits.length >= 9 ? [{ phone: { contains: digits.slice(-9) } }] : [])] }, select: { id: true, title: true, partnerAccess: true, email: true } })
  if (existing && existing.id === o.forbidEntryId) throw new AdminError('Nu te poți invita singur', 422)
  if (existing) return { entry: existing, existing: true }
  const col = await db.websiteCollection.findUniqueOrThrow({ where: { businessLineId_key: { businessLineId: lineId, key: 'companii' } }, select: { id: true } })
  const title = withDoctorTitle(input.name)
  const base = slugify(title) || 'medic'
  let slug = base
  for (let n = 2; await db.websiteEntry.findFirst({ where: { businessLineId: lineId, collectionId: col.id, slug }, select: { id: true } }); n++) slug = `${base}-${n}`
  const lead = await db.lead.create({ data: { businessLineId: lineId, entityType: 'medici', status: 'prospect', companyName: title, contactPerson: title, email: input.email, phone, city: input.city, source: o.source, externalSource: o.source, externalId: o.externalId, customFields: { ...(o.invitedBy ? { invitedBy: o.invitedBy } : {}), ...(input.parafa ? { cod_parafa: input.parafa } : {}) } } })
  const entry = await db.websiteEntry.create({ data: { businessLineId: lineId, collectionId: col.id, slug, title, status: 'preview', partnerAccess: true, city: input.city, email: input.email, phone, leadId: lead.id, externalSource: o.source, externalId: o.externalId, data: { specializare: input.specialty, ...(input.parafa ? { cod_parafa: input.parafa } : {}) } as Prisma.InputJsonValue } })
  return { entry, existing: false }
}

/** The login link goes to the email given: that is the proof of who owns the profile. */
async function sendLoginLink(lineId: string, line: { slug: string }, entry: { partnerAccess: boolean }, email: string, o: { siteUrl: string; brandName: string; mailer: Mailer; now: Date }) {
  if (!entry.partnerAccess) return
  const notifier: Notifier = { email: (to, subject, html, text) => o.mailer(to, subject, html, text, line), sms: async () => undefined }
  await requestLogin(lineId, email, { notifier, siteUrl: o.siteUrl, brandName: o.brandName, now: o.now }).catch((e) => console.error('[signup] login link', e instanceof Error ? e.message : e))
}

const SIGNUPS_PER_HOUR = 30

/**
 * A doctor asks for a profile through the public form (no invitation): a private profile and a CRM lead are created, the login link goes to the email given
 * and the team is alerted. The answer is the same whether or not a profile with that email/phone already existed. A line-wide cap keeps a bot from flooding it.
 */
export async function signupDoctor(lineId: string, raw: unknown, o: { siteUrl: string; brandName: string; invitedBy?: string; mailer?: Mailer; alert?: (text: string) => Promise<unknown>; now?: Date }) {
  const now = o.now ?? new Date()
  const mailer = o.mailer ?? defaultMailer
  const input = registerInput.parse(raw)
  const recent = await db.websiteEntry.count({ where: { businessLineId: lineId, externalSource: 'formular', createdAt: { gt: new Date(now.getTime() - 3_600_000) } } })
  if (recent >= SIGNUPS_PER_HOUR) throw new AdminError('Prea multe cereri în ultima oră. Încearcă din nou mai târziu.', 429)
  const line = await db.businessLine.findUniqueOrThrow({ where: { id: lineId }, select: { slug: true } })
  let invitedBy: string | undefined
  if (o.invitedBy && /^[a-z0-9][a-z0-9-]{0,118}$/.test(o.invitedBy)) {
    const who = await db.websiteEntry.findFirst({ where: { businessLineId: lineId, collection: { key: 'companii' }, slug: o.invitedBy, status: 'published' }, select: { slug: true } })
    invitedBy = who?.slug
  }
  const { entry, existing } = await provisionProfile(lineId, input, { source: 'formular', externalId: randomUUID(), invitedBy })
  await audit(lineId, entry, 'doctor_signup', { existingProfile: existing, invitedBy: invitedBy ?? null })
  await sendLoginLink(lineId, line, entry, input.email, { siteUrl: o.siteUrl, brandName: o.brandName, mailer, now })
  if (!existing) {
    const alert = o.alert ?? (async (text: string) => { const { sendTelegramAlert } = await import('../../notifications/telegram'); await sendTelegramAlert(text) })
    await alert(`🩺 *Medic nou pe ${o.brandName}*\n👤 ${entry.title}\n📋 ${input.specialty}${input.city ? ` · ${input.city}` : ''}\n📧 ${input.email}\n📱 ${input.phone}${invitedBy ? `\n🤝 Invitat de ${invitedBy}` : ''}\nProfil privat creat; verifică CMR și publică.`).catch(() => undefined)
  }
  return { ok: true }
}

/**
 * The colleague asks for a profile through the link. Always answers the same way (no hint whether a profile with that email already existed).
 * A new private profile (status preview) and a CRM lead are created, or the invitation is attached to the profile that already has this email/phone.
 */
export async function registerInvitee(lineId: string, code: string, raw: unknown, o: { siteUrl: string; brandName: string; mailer?: Mailer; now?: Date } = { siteUrl: '', brandName: '' }) {
  const now = o.now ?? new Date()
  const mailer = o.mailer ?? defaultMailer
  const input = registerInput.parse(raw)
  const found = await lookupInvite(lineId, code, now)
  if (found.state === 'expired') throw new AdminError('Invitația a expirat', 410)
  if (found.state !== 'ok') throw new AdminError('Invitația nu mai este valabilă', 404)
  const inv = await db.websiteEndorsementInvite.findUniqueOrThrow({ where: { codeHash: hashCode(code) }, include: { inviter: { select: { id: true, title: true, email: true, slug: true } } } })
  const line = await db.businessLine.findUniqueOrThrow({ where: { id: lineId }, select: { slug: true } })

  // one registration per invitation: only the request that flips the status wins
  const claimed = await db.websiteEndorsementInvite.updateMany({ where: { id: inv.id, status: 'sent' }, data: { status: 'registered', registeredAt: now } })
  if (claimed.count !== 1) throw new AdminError('Invitația nu mai este valabilă', 409)

  try {
    const { entry, existing } = await provisionProfile(lineId, input, { source: 'invitatie', externalId: inv.id, invitedBy: inv.inviter.slug, forbidEntryId: inv.inviter.id })
    await db.websiteEndorsementInvite.update({ where: { id: inv.id }, data: { inviteeEntryId: entry.id } })
    await audit(lineId, entry, 'endorsement_invite_registered', { inviteId: inv.id, invitedBy: inv.inviter.slug, existingProfile: !!existing })

    // the login link goes to the email given (that is the proof of who owns the profile); then the recommender is told
    await sendLoginLink(lineId, line, entry, input.email, { siteUrl: o.siteUrl, brandName: o.brandName, mailer, now })
    if (inv.inviter.email) {
      const body = `Bună ziua,\n\n${entry.title} (${input.specialty}${input.city ? `, ${input.city}` : ''}) și-a creat un cont pe ${o.brandName} după invitația ta.\n\nIntră în contul tău ca să confirmi că este colegul pe care l-ai invitat; abia după aceea recomandarea se atașează profilului lui:\n${o.siteUrl.replace(/\/$/, '')}/cont`
      await mailer(inv.inviter.email, `${entry.title} și-a creat contul pe ${o.brandName}`, paragraphs(body), body, line).catch((e) => console.error('[invite] notify inviter', e instanceof Error ? e.message : e))
    }
  } catch (e) {
    await db.websiteEndorsementInvite.updateMany({ where: { id: inv.id, status: 'registered' }, data: { status: 'sent', registeredAt: null, inviteeEntryId: null } })
    throw e
  }
  return { ok: true }
}

/** Called when a profile becomes public: the recommenders who invited this doctor are told once. Never throws. */
export async function notifyPublished(entryId: string, o: { siteUrl: string; brandName: string; mailer?: Mailer; now?: Date }): Promise<void> {
  try {
    const mailer = o.mailer ?? defaultMailer
    const invites = await db.websiteEndorsementInvite.findMany({ where: { inviteeEntryId: entryId, status: 'confirmed', publishedNotifiedAt: null }, include: { inviter: { select: { email: true, title: true } }, invitee: { select: { title: true, slug: true } } } })
    for (const inv of invites) {
      const line = await db.businessLine.findUniqueOrThrow({ where: { id: inv.businessLineId }, select: { slug: true } })
      if (inv.inviter.email && inv.invitee) {
        const url = `${o.siteUrl.replace(/\/$/, '')}/medici/${inv.invitee.slug}`
        const body = `Bună ziua,\n\nProfilul ${inv.invitee.title} este acum public pe ${o.brandName}, iar recomandarea ta apare pe el:\n${url}`
        await mailer(inv.inviter.email, `Profilul ${inv.invitee.title} este public pe ${o.brandName}`, paragraphs(body), body, line)
      }
      await db.websiteEndorsementInvite.update({ where: { id: inv.id }, data: { publishedNotifiedAt: o.now ?? new Date() } })
    }
  } catch (e) {
    console.error('[invite] notify published', e instanceof Error ? e.message : e)
  }
}
