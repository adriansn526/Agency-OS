/**
 * Receives email over IMAP into the omnichannel timeline.
 *
 *  - read-only: messages are fetched, never flagged, moved or deleted on the server
 *  - one sync per mailbox at a time across processes (imapSyncStartedAt is the lock, stale after 10 min)
 *  - resumes from the last UID; the first run only looks back BACKFILL_DAYS; a changed UIDVALIDITY restarts from the window
 *  - a message becomes a Communication (inbound email) of the lead/client whose address it came from (same business line), or of the
 *    lead/client of the outbound message it replies to; unmatched mail is stored without owner for the shared inbox
 *  - Message-ID is the idempotency key (Communication.externalId is unique), so re-reading a message never duplicates it
 */
import { ImapFlow } from 'imapflow'
import { simpleParser, type ParsedMail } from 'mailparser'
import { db } from '@repo/db'
import { decrypt } from '@/lib/encryption'

const BACKFILL_DAYS = 14
const BATCH = 100
const MAX_MESSAGE_BYTES = 8 * 1024 * 1024
const LOCK_STALE_MS = 10 * 60_000
const MIN_INTERVAL_MS = 2 * 60_000

type Mailbox = NonNullable<Awaited<ReturnType<typeof db.businessLineMailbox.findUnique>>>

export function imapConfig(m: Mailbox) {
  const pass = m.imapPassEnc ?? m.smtpPassEnc
  if (!m.imapHost || !pass) return null
  return { host: m.imapHost, port: m.imapPort, secure: m.imapSecure, auth: { user: m.imapUser || m.smtpUser, pass: decrypt(pass) }, tls: { rejectUnauthorized: !m.allowSelfSigned } }
}

function client(m: Mailbox) {
  const c = imapConfig(m)
  if (!c) throw new Error('IMAP neconfigurat (server sau parolă lipsă)')
  return new ImapFlow({ ...c, logger: false, socketTimeout: 60_000, greetingTimeout: 20_000, connectionTimeout: 20_000 })
}

const scrub = (e: unknown, m: Mailbox) => {
  let msg = e instanceof Error ? e.message : String(e)
  for (const enc of [m.imapPassEnc, m.smtpPassEnc]) if (enc) { try { const p = decrypt(enc); if (p) msg = msg.split(p).join('***') } catch { /* ignore */ } }
  return msg.slice(0, 500)
}

// ─── pure helpers ───

export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

const BOUNCE_FROM = /(mailer-daemon|postmaster|mail delivery)/i
const AUTO_SUBJECT = /^(auto(matic)?[ -]?reply|răspuns automat|raspuns automat|out of office|undeliverable|delivery status)/i
export const isBounce = (from: string | undefined) => BOUNCE_FROM.test(from ?? '')
export const isAutoReply = (subject: string, headers?: Map<string, unknown>) =>
  AUTO_SUBJECT.test(subject.trim()) || String(headers?.get('auto-submitted') ?? '').toLowerCase().startsWith('auto-') || headers?.has('x-autoreply') === true

const ids = (v: unknown): string[] => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\s+/) : []).filter((x) => typeof x === 'string' && x.startsWith('<'))

// ─── matching ───

/** The lead/client a sender address belongs to, within one business line. A lead that became a client keeps its own timeline (shared). */
export async function matchSender(businessLineId: string, email: string): Promise<{ leadId?: string; clientId?: string } | null> {
  const addr = email.trim().toLowerCase()
  if (!addr) return null
  const lead = await db.lead.findFirst({
    where: { businessLineId, OR: [{ email: { equals: addr, mode: 'insensitive' } }, { email2: { equals: addr, mode: 'insensitive' } }] },
    orderBy: { updatedAt: 'desc' }, select: { id: true },
  })
  if (lead) return { leadId: lead.id }
  const client = await db.client.findFirst({ where: { businessLineId, email: { equals: addr, mode: 'insensitive' } }, orderBy: { updatedAt: 'desc' }, select: { id: true } })
  return client ? { clientId: client.id } : null
}

export interface IngestResult { status: 'stored' | 'duplicate' | 'bounce' | 'skipped' }

/** Stores one parsed message. Exported for tests. */
export async function ingestMessage(m: { id: string; businessLineId: string; purpose: string; fromName: string; fromEmail: string }, mail: ParsedMail, uid: number): Promise<IngestResult> {
  const fromAddr = mail.from?.value?.[0]?.address?.toLowerCase() ?? ''
  const messageId = mail.messageId ?? `imap:${m.id}:${uid}`
  if (fromAddr && fromAddr === m.fromEmail.toLowerCase()) return { status: 'skipped' } // copy of our own outgoing mail
  if (await db.communication.findUnique({ where: { externalId: messageId }, select: { id: true } })) return { status: 'duplicate' }

  // 1) the outbound message this one answers (In-Reply-To / References)
  const refs = [...ids(mail.inReplyTo), ...ids(mail.references)].reverse()
  const parent = refs.length ? await db.communication.findFirst({ where: { externalId: { in: refs } }, select: { id: true, leadId: true, clientId: true, threadId: true, externalId: true } }) : null

  const subject = (mail.subject ?? '(fără subiect)').trim()
  const body = (mail.text?.trim() || (mail.html ? htmlToText(mail.html) : '')).slice(0, 20_000)
  const attachments = (mail.attachments ?? []).map((a) => a.filename || a.contentType).filter(Boolean) as string[]

  if (isBounce(fromAddr) && parent) {
    await db.communication.update({ where: { id: parent.id }, data: { emailStatus: 'bounced' } })
    await db.communication.create({
      data: { businessLineId: m.businessLineId, leadId: parent.leadId, clientId: parent.clientId, channel: 'system', kind: 'event', direction: 'inbound', subject: `Email nelivrat: ${subject}`.slice(0, 500), body: body.slice(0, 2000), fromAddr, mailbox: m.purpose, externalId: messageId, threadId: parent.threadId ?? parent.externalId, userName: 'System' },
    })
    return { status: 'bounce' }
  }

  // 2) the sender's address
  const owner = parent && (parent.leadId || parent.clientId) ? { leadId: parent.leadId ?? undefined, clientId: parent.clientId ?? undefined } : fromAddr ? await matchSender(m.businessLineId, fromAddr) : null
  const toAddr = (Array.isArray(mail.to) ? mail.to : mail.to ? [mail.to] : []).flatMap((t) => t.value.map((v) => v.address)).filter(Boolean).join(', ')

  await db.communication.create({
    data: {
      businessLineId: m.businessLineId, leadId: owner?.leadId ?? null, clientId: owner?.clientId ?? null,
      channel: 'email', kind: 'message', direction: 'inbound', subject: subject.slice(0, 500), body,
      fromAddr: mail.from?.text ?? fromAddr, toAddr, emailStatus: 'received', mailbox: m.purpose,
      externalId: messageId, threadId: parent ? parent.threadId ?? parent.externalId : messageId,
      attachments: [], userName: mail.from?.value?.[0]?.name || fromAddr || null,
      createdAt: mail.date && mail.date.getTime() <= Date.now() + 3600_000 ? mail.date : new Date(),
      metadata: { source: 'imap', ...(attachments.length ? { attachments } : {}), ...(isAutoReply(subject, mail.headers) ? { autoReply: true } : {}), ...(owner ? {} : { unmatched: true }) } as object,
    },
  })
  return { status: 'stored' }
}

// ─── sync ───

export interface SyncSummary { ok: boolean; fetched: number; stored: number; duplicates: number; bounces: number; unmatched: number; skippedLarge: number; error?: string; skipped?: string }

async function lock(id: string, force: boolean): Promise<boolean> {
  const now = Date.now()
  const rows = await db.$executeRaw`
    UPDATE "BusinessLineMailbox" SET "imapSyncStartedAt" = NOW()
    WHERE id = ${id} AND "imapEnabled" = true
      AND ("imapSyncStartedAt" IS NULL OR "imapSyncStartedAt" < ${new Date(now - LOCK_STALE_MS)})
      AND (${force} OR "imapLastSyncAt" IS NULL OR "imapLastSyncAt" < ${new Date(now - MIN_INTERVAL_MS)})`
  return rows === 1
}

export async function syncMailbox(id: string, opts: { force?: boolean } = {}): Promise<SyncSummary> {
  const sum: SyncSummary = { ok: true, fetched: 0, stored: 0, duplicates: 0, bounces: 0, unmatched: 0, skippedLarge: 0 }
  if (!(await lock(id, Boolean(opts.force)))) return { ...sum, skipped: 'ocupat sau dezactivat' }
  const m = await db.businessLineMailbox.findUniqueOrThrow({ where: { id } })
  let lastUid = Number(m.imapLastUid)
  let uidValidity = m.imapUidValidity
  const imap = client(m)
  try {
    await imap.connect()
    const mbLock = await imap.getMailboxLock(m.imapFolder)
    try {
      const box = imap.mailbox
      const validity = box && typeof box === 'object' ? (box as { uidValidity?: bigint }).uidValidity : undefined
      if (validity !== undefined && uidValidity !== null && uidValidity !== validity) lastUid = 0
      if (validity !== undefined) uidValidity = validity

      const uids = lastUid > 0
        ? ((await imap.search({ uid: `${lastUid + 1}:*` }, { uid: true })) || []).filter((u) => u > lastUid)
        : (await imap.search({ since: new Date(Date.now() - BACKFILL_DAYS * 86_400_000) }, { uid: true })) || []
      uids.sort((a, b) => a - b)
      const batch = uids.slice(0, BATCH)

      for (const uid of batch) {
        const msg = await imap.fetchOne(String(uid), { source: true, size: true }, { uid: true })
        if (msg && msg.size && msg.size > MAX_MESSAGE_BYTES) { sum.skippedLarge++; lastUid = Math.max(lastUid, uid); continue }
        if (msg && msg.source) {
          sum.fetched++
          const r = await ingestMessage({ id: m.id, businessLineId: m.businessLineId, purpose: m.purpose, fromName: m.fromName, fromEmail: m.fromEmail }, await simpleParser(msg.source), uid)
          if (r.status === 'stored') sum.stored++
          else if (r.status === 'duplicate') sum.duplicates++
          else if (r.status === 'bounce') sum.bounces++
        }
        lastUid = Math.max(lastUid, uid)
        // persist progress so a crash never re-reads the whole batch
        await db.businessLineMailbox.update({ where: { id }, data: { imapLastUid: BigInt(lastUid) } })
      }
      if (uids.length > BATCH) sum.skipped = `încă ${uids.length - BATCH} mesaje la următoarea rulare`
    } finally { mbLock.release() }
    await db.businessLineMailbox.update({ where: { id }, data: { imapLastUid: BigInt(lastUid), imapUidValidity: uidValidity, imapLastSyncAt: new Date(), imapLastOk: true, imapLastError: null, imapLastCount: sum.stored, imapSyncStartedAt: null } })
  } catch (e) {
    sum.ok = false; sum.error = scrub(e, m)
    await db.businessLineMailbox.update({ where: { id }, data: { imapLastSyncAt: new Date(), imapLastOk: false, imapLastError: sum.error, imapSyncStartedAt: null } })
  } finally {
    await imap.logout().catch(() => imap.close())
  }
  return sum
}

/** Connects, opens the folder and reports the message count — nothing is stored. */
export async function testImap(id: string): Promise<{ ok: boolean; messages?: number; error?: string }> {
  const m = await db.businessLineMailbox.findUnique({ where: { id } })
  if (!m) return { ok: false, error: 'Căsuța nu există' }
  const imap = client(m)
  try {
    await imap.connect()
    const mbLock = await imap.getMailboxLock(m.imapFolder)
    try {
      const n = imap.mailbox && typeof imap.mailbox === 'object' ? (imap.mailbox as { exists?: number }).exists ?? 0 : 0
      return { ok: true, messages: n }
    } finally { mbLock.release() }
  } catch (e) {
    return { ok: false, error: scrub(e, m) }
  } finally {
    await imap.logout().catch(() => imap.close())
  }
}

export async function syncDueMailboxes(): Promise<void> {
  const rows = await db.businessLineMailbox.findMany({ where: { imapEnabled: true, imapHost: { not: null } }, select: { id: true } })
  for (const r of rows) {
    try { await syncMailbox(r.id) } catch (e) { console.error('[mail-sync]', r.id, e instanceof Error ? e.message : e) }
  }
}

let timer: NodeJS.Timeout | null = null
/** Production only; every 60 s looks for mailboxes whose last sync is older than the minimum interval. */
export function startMailSync(): void {
  if (timer || process.env.NODE_ENV !== 'production' || process.env.MAIL_SYNC_DISABLED === '1') return
  timer = setInterval(() => { syncDueMailboxes().catch((e) => console.error('[mail-sync] tick', e)) }, 60_000)
  timer.unref?.()
}
