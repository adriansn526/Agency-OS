/**
 * Passwordless login for partners ("Profilul meu").
 *
 * - Identity is the contact on the profile: an email gets a one-time link (30 min), a phone gets a 6-digit SMS code (10 min, 5 attempts).
 * - Only entries with partnerAccess (set when the firm accepts its preview, or by the team) can log in.
 * - Requests never reveal whether an account exists; they are limited per profile (3 / 15 min).
 * - Only hashes of links, codes and session tokens are stored. Sessions last 14 days and are deleted on logout.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto'
import { db, Prisma } from '@repo/db'
import { nationalPhone } from '../../prospectare/import-mapping'

export const LINK_TTL_MS = 30 * 60_000
export const CODE_TTL_MS = 10 * 60_000
export const SESSION_TTL_MS = 14 * 86_400_000
export const MAX_CODE_ATTEMPTS = 5
export const MAX_LOGIN_REQUESTS = 3 // per profile in RATE_WINDOW_MS
export const RATE_WINDOW_MS = 15 * 60_000
const MAX_SESSIONS = 10
const MAX_LINKS_PER_EMAIL = 5

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
export const hashLoginLink = (token: string) => sha(token)
export const hashSmsCode = (entryId: string, code: string) => sha(`${entryId}:${code}`)
export const hashSessionToken = (token: string) => sha(token)

export const LINK_TOKEN_RE = /^pl_[A-Za-z0-9_-]{43}$/
export const SESSION_TOKEN_RE = /^ps_[A-Za-z0-9_-]{43}$/
const CODE_RE = /^\d{6}$/

export interface Notifier {
  email(to: string, subject: string, html: string, text: string): Promise<void>
  sms(to: string, body: string): Promise<void>
}

export type Identifier = { kind: 'email'; value: string } | { kind: 'phone'; value: string } | null

export function parseIdentifier(raw: unknown): Identifier {
  const s = String(raw ?? '').trim()
  if (!s || s.length > 200) return null
  if (s.includes('@')) return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,24}$/.test(s) ? { kind: 'email', value: s.toLowerCase() } : null
  const p = nationalPhone(s)
  return p ? { kind: 'phone', value: p } : null
}

const ELIGIBLE = { partnerAccess: true, status: { in: ['preview', 'published'] } } satisfies Prisma.WebsiteEntryWhereInput

async function entriesFor(lineId: string, id: NonNullable<Identifier>) {
  if (id.kind === 'email') {
    return db.websiteEntry.findMany({ where: { businessLineId: lineId, ...ELIGIBLE, email: { equals: id.value, mode: 'insensitive' } }, select: { id: true, title: true }, take: MAX_LINKS_PER_EMAIL })
  }
  const intl = `40${id.value.slice(1)}`
  const rows = await db.$queryRaw<{ id: string; title: string }[]>`
    SELECT "id", "title" FROM "WebsiteEntry"
    WHERE "businessLineId" = ${lineId} AND "partnerAccess" = true AND "status" IN ('preview', 'published')
      AND regexp_replace(coalesce("phone", ''), '[^0-9]', '', 'g') IN (${id.value}, ${intl}) LIMIT 2`
  return rows
}

async function recentRequests(entryIds: string[], now: Date) {
  return db.websitePartnerLogin.count({ where: { entryId: { in: entryIds }, createdAt: { gt: new Date(now.getTime() - RATE_WINDOW_MS) } } })
}

/** Always resolves the same way, whether or not a profile matches. */
export async function requestLogin(lineId: string, rawIdentifier: unknown, o: { notifier: Notifier; siteUrl: string; brandName?: string; now?: Date }): Promise<void> {
  const now = o.now ?? new Date()
  const brand = o.brandName ?? 'IntraConstruct'
  const id = parseIdentifier(rawIdentifier)
  if (!id) return
  const entries = await entriesFor(lineId, id)
  if (!entries.length) return
  if ((await recentRequests(entries.map((e) => e.id), now)) >= MAX_LOGIN_REQUESTS) return

  if (id.kind === 'email') {
    const links: { title: string; url: string }[] = []
    for (const e of entries) {
      const token = `pl_${randomBytes(32).toString('base64url')}`
      await db.websitePartnerLogin.create({ data: { entryId: e.id, channel: 'email', codeHash: hashLoginLink(token), createdAt: now, expiresAt: new Date(now.getTime() + LINK_TTL_MS) } })
      links.push({ title: e.title, url: `${o.siteUrl.replace(/\/$/, '')}/cont/verifica?token=${token}` })
    }
    const list = links.map((l) => `<li><a href="${l.url}">${escapeHtml(l.title)}</a></li>`).join('')
    await o.notifier.email(
      id.value, `Intră în profilul tău ${brand}`,
      `<p>Bună ziua,</p><p>Apăsați pe link pentru a intra în profilul firmei (valabil 30 de minute, o singură dată):</p><ul>${list}</ul><p>Dacă nu ați cerut dumneavoastră acest mesaj, îl puteți ignora.</p>`,
      `Bună ziua,\n\nIntrați în profilul firmei (link valabil 30 de minute, o singură dată):\n${links.map((l) => `${l.title}: ${l.url}`).join('\n')}\n\nDacă nu ați cerut dumneavoastră acest mesaj, îl puteți ignora.`,
    )
    return
  }
  // an SMS code is tied to one profile, so a phone shared by several profiles must use the email login instead
  if (entries.length !== 1) return
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await db.websitePartnerLogin.create({ data: { entryId: entries[0]!.id, channel: 'sms', codeHash: hashSmsCode(entries[0]!.id, code), createdAt: now, expiresAt: new Date(now.getTime() + CODE_TTL_MS) } })
  await o.notifier.sms(id.value, `Codul ${brand}: ${code}. Valabil 10 minute. Nu îl da nimănui.`)
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export interface SessionInfo { sessionToken: string; expiresAt: Date; entryId: string }

async function createSession(entryId: string, meta: { userAgent?: string; ip?: string }, now: Date): Promise<SessionInfo> {
  const sessionToken = `ps_${randomBytes(32).toString('base64url')}`
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
  await db.websitePartnerSession.create({ data: { entryId, tokenHash: hashSessionToken(sessionToken), expiresAt, createdAt: now, lastUsedAt: now, userAgent: meta.userAgent?.slice(0, 300), ip: meta.ip?.slice(0, 64) } })
  const old = await db.websitePartnerSession.findMany({ where: { entryId }, orderBy: { createdAt: 'desc' }, skip: MAX_SESSIONS, select: { id: true } })
  if (old.length) await db.websitePartnerSession.deleteMany({ where: { id: { in: old.map((s) => s.id) } } })
  return { sessionToken, expiresAt, entryId }
}

/** Exchanges an emailed link token, or a phone + SMS code, for a session. Returns null for anything that does not check out. */
export async function verifyLogin(lineId: string, input: { token?: unknown; identifier?: unknown; code?: unknown }, meta: { userAgent?: string; ip?: string } = {}, now = new Date()): Promise<SessionInfo | null> {
  if (typeof input.token === 'string') {
    if (!LINK_TOKEN_RE.test(input.token)) return null
    const row = await db.websitePartnerLogin.findUnique({ where: { codeHash: hashLoginLink(input.token) }, include: { entry: { select: { businessLineId: true, partnerAccess: true, status: true } } } })
    if (!row || row.channel !== 'email' || row.usedAt || row.expiresAt <= now || row.entry.businessLineId !== lineId || !row.entry.partnerAccess || !['preview', 'published'].includes(row.entry.status)) return null
    // single use: only the request that flips usedAt wins
    const claimed = await db.websitePartnerLogin.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } })
    return claimed.count === 1 ? createSession(row.entryId, meta, now) : null
  }

  const id = parseIdentifier(input.identifier)
  const code = String(input.code ?? '').trim()
  if (!id || id.kind !== 'phone' || !CODE_RE.test(code)) return null
  const entries = await entriesFor(lineId, id)
  if (entries.length !== 1) return null
  const entryId = entries[0]!.id
  const pending = await db.websitePartnerLogin.findFirst({ where: { entryId, channel: 'sms', usedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' } })
  if (!pending || pending.attempts >= MAX_CODE_ATTEMPTS) return null
  if (pending.codeHash !== hashSmsCode(entryId, code)) {
    await db.websitePartnerLogin.update({ where: { id: pending.id }, data: { attempts: { increment: 1 } } })
    return null
  }
  const claimed = await db.websitePartnerLogin.updateMany({ where: { id: pending.id, usedAt: null }, data: { usedAt: now } })
  return claimed.count === 1 ? createSession(entryId, meta, now) : null
}

/** The entry of a valid session, or null. Touches lastUsedAt at most every 5 minutes. */
export async function sessionEntry(lineId: string, sessionToken: unknown, now = new Date()) {
  if (typeof sessionToken !== 'string' || !SESSION_TOKEN_RE.test(sessionToken)) return null
  const s = await db.websitePartnerSession.findUnique({ where: { tokenHash: hashSessionToken(sessionToken) }, include: { entry: { include: { media: { orderBy: { sortOrder: 'asc' } } } } } })
  if (!s || s.expiresAt <= now || s.entry.businessLineId !== lineId || !s.entry.partnerAccess || !['preview', 'published'].includes(s.entry.status)) return null
  if (now.getTime() - s.lastUsedAt.getTime() > 5 * 60_000) await db.websitePartnerSession.update({ where: { id: s.id }, data: { lastUsedAt: now } })
  return s.entry
}

export async function logout(sessionToken: unknown): Promise<void> {
  if (typeof sessionToken !== 'string' || !SESSION_TOKEN_RE.test(sessionToken)) return
  await db.websitePartnerSession.deleteMany({ where: { tokenHash: hashSessionToken(sessionToken) } })
}

/** Housekeeping: expired logins and sessions. Safe to call from a cron. */
export async function purgeExpired(now = new Date()) {
  const [l, s] = await Promise.all([
    db.websitePartnerLogin.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date(now.getTime() - 86_400_000) } }, { usedAt: { lt: new Date(now.getTime() - 86_400_000) } }] } }),
    db.websitePartnerSession.deleteMany({ where: { expiresAt: { lt: now } } }),
  ])
  return { logins: l.count, sessions: s.count }
}
