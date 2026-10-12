/**
 * Per-business-line mailboxes (general / orders / partners): each with its own SMTP account, sender name, reply-to, bcc and signature, stored in
 * BusinessLineMailSettings (password AES-256-GCM encrypted). A line without an enabled row returns null and the
 * caller falls back to the built-in env SMTP / sender table, so nothing changes until a line is configured.
 */
import nodemailer, { type Transporter } from 'nodemailer'
import { z } from 'zod'
import { db } from '@repo/db'
import { decrypt, encrypt } from '@/lib/encryption'

export interface LineMail {
  transporter: Transporter
  name: string
  email: string
  replyTo: string
  bcc: string | null
  signatureHtml: string | null
}

/** Mailbox key within a line. "general" is the fallback for every other key; "orders" and "partners" are used by built-in flows. */
export type MailPurpose = string
export const MAILBOX_KEY_RE = /^[a-z0-9][a-z0-9-]{0,29}$/
export const isMailPurpose = (v: string): v is MailPurpose => MAILBOX_KEY_RE.test(v)

export const mailSettingsSchema = z.object({
  enabled: z.boolean(),
  label: z.string().trim().max(80).nullish(),
  fromName: z.string().trim().min(1).max(120),
  fromEmail: z.string().trim().email().max(200),
  replyTo: z.string().trim().email().max(200).nullish().or(z.literal('')),
  bcc: z.string().trim().email().max(200).nullish().or(z.literal('')),
  signatureHtml: z.string().max(10_000).nullish(),
  smtpHost: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9.-]+$/, 'Host invalid'),
  smtpPort: z.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().trim().min(1).max(200),
  /** Omitted/empty = keep the stored password. */
  smtpPass: z.string().max(500).nullish(),
  allowSelfSigned: z.boolean().default(false),
  // IMAP (receiving) — optional; imapPass omitted/empty keeps the stored one, no stored one = the SMTP password is used
  imapEnabled: z.boolean().default(false),
  imapHost: z.string().trim().max(200).regex(/^[A-Za-z0-9.-]*$/, 'Host IMAP invalid').nullish(),
  imapPort: z.number().int().min(1).max(65535).default(993),
  imapSecure: z.boolean().default(true),
  imapUser: z.string().trim().max(200).nullish(),
  imapPass: z.string().max(500).nullish(),
  imapFolder: z.string().trim().min(1).max(100).default('INBOX'),
})
export type MailSettingsInput = z.infer<typeof mailSettingsSchema>

const TTL_MS = 30_000
const settingsCache = new Map<string, { at: number; rows: Awaited<ReturnType<typeof loadRows>> }>()
const transporters = new Map<string, Transporter>()

function loadRows(slug: string) {
  return db.businessLineMailbox.findMany({ where: { enabled: true, businessLine: { slug } } })
}

export function invalidateLineMail(): void {
  settingsCache.clear()
}

export function buildTransporter(c: { host: string; port: number; secure: boolean; user: string; pass: string; allowSelfSigned: boolean }) {
  const key = [c.host, c.port, c.secure, c.user, c.allowSelfSigned, c.pass].join('|')
  let t = transporters.get(key)
  if (!t) {
    t = nodemailer.createTransport({
      host: c.host, port: c.port, secure: c.secure,
      auth: { user: c.user, pass: c.pass },
      tls: { rejectUnauthorized: !c.allowSelfSigned },
      connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 30_000,
    })
    if (transporters.size > 20) transporters.clear()
    transporters.set(key, t)
  }
  return t
}

/**
 * The enabled mailbox of a line (by slug) for a purpose, falling back to the line's "general" mailbox.
 * Null = the line has no own mailbox, so the caller uses the default sender.
 */
export async function getLineMail(slug?: string, purpose: MailPurpose = 'general'): Promise<LineMail | null> {
  if (!slug) return null
  let hit = settingsCache.get(slug)
  if (!hit || Date.now() - hit.at > TTL_MS) {
    hit = { at: Date.now(), rows: await loadRows(slug) }
    settingsCache.set(slug, hit)
  }
  const r = hit.rows.find((x) => x.purpose === purpose && x.smtpPassEnc) ?? hit.rows.find((x) => x.purpose === 'general' && x.smtpPassEnc)
  if (!r || !r.smtpPassEnc) return null
  return {
    transporter: buildTransporter({ host: r.smtpHost, port: r.smtpPort, secure: r.smtpSecure, user: r.smtpUser, pass: decrypt(r.smtpPassEnc), allowSelfSigned: r.allowSelfSigned }),
    name: r.fromName,
    email: r.fromEmail,
    replyTo: r.replyTo || r.fromEmail,
    bcc: r.bcc || null,
    signatureHtml: r.signatureHtml || null,
  }
}

/** Saves (upserts) a line's settings. The password is only replaced when a new one is sent. */
export async function saveMailSettings(businessLineId: string, purpose: MailPurpose, input: MailSettingsInput) {
  const existing = await db.businessLineMailbox.findUnique({ where: { businessLineId_purpose: { businessLineId, purpose } } })
  const passEnc = input.smtpPass ? encrypt(input.smtpPass) : existing?.smtpPassEnc ?? null
  if (input.enabled && !passEnc) throw new Error('Parola SMTP este obligatorie pentru a activa')
  const data = {
    enabled: input.enabled,
    fromName: input.fromName, fromEmail: input.fromEmail,
    replyTo: input.replyTo || null, bcc: input.bcc || null, signatureHtml: input.signatureHtml || null,
    smtpHost: input.smtpHost, smtpPort: input.smtpPort, smtpSecure: input.smtpSecure, smtpUser: input.smtpUser,
    smtpPassEnc: passEnc, allowSelfSigned: input.allowSelfSigned,
    label: input.label || null,
    imapEnabled: input.imapEnabled, imapHost: input.imapHost || null, imapPort: input.imapPort, imapSecure: input.imapSecure,
    imapUser: input.imapUser || null, imapFolder: input.imapFolder,
    imapPassEnc: input.imapPass ? encrypt(input.imapPass) : existing?.imapPassEnc ?? null,
  }
  if (input.imapEnabled && !input.imapHost) throw new Error('Serverul IMAP este obligatoriu pentru a activa primirea')
  // a different server/folder/user means a different mailbox: forget the sync position
  const imapChanged = existing && (existing.imapHost !== data.imapHost || existing.imapFolder !== data.imapFolder || (existing.imapUser ?? existing.smtpUser) !== (data.imapUser ?? data.smtpUser))
  const reset = imapChanged ? { imapLastUid: BigInt(0), imapUidValidity: null } : {}
  const row = await db.businessLineMailbox.upsert({ where: { businessLineId_purpose: { businessLineId, purpose } }, create: { businessLineId, purpose, ...data }, update: { ...data, ...reset } })
  invalidateLineMail()
  return publicView(row)
}

type Row = Awaited<ReturnType<typeof loadRows>>[number]
/** Safe view for the UI: never includes the password, only whether one is stored. */
export function publicView(r: Row) {
  const { smtpPassEnc, imapPassEnc, imapUidValidity, imapLastUid, ...rest } = r
  return { ...rest, imapLastUid: String(imapLastUid), hasPassword: Boolean(smtpPassEnc), hasImapPassword: Boolean(imapPassEnc) }
}

/** Opens a connection (and optionally sends a test message) with the SAVED settings of the line. */
export async function testMailSettings(businessLineId: string, purpose: MailPurpose, sendTo?: string): Promise<{ ok: boolean; error?: string }> {
  const r = await db.businessLineMailbox.findUnique({ where: { businessLineId_purpose: { businessLineId, purpose } } })
  if (!r || !r.smtpPassEnc) return { ok: false, error: 'Setările nu sunt salvate' }
  let result: { ok: boolean; error?: string } = { ok: true }
  try {
    const t = buildTransporter({ host: r.smtpHost, port: r.smtpPort, secure: r.smtpSecure, user: r.smtpUser, pass: decrypt(r.smtpPassEnc), allowSelfSigned: r.allowSelfSigned })
    await t.verify()
    if (sendTo) {
      await t.sendMail({
        from: `${r.fromName} <${r.fromEmail}>`, replyTo: r.replyTo || r.fromEmail, to: sendTo,
        subject: `Test email — ${r.fromName}`,
        text: `Acesta este un email de test trimis din Agency OS prin contul SMTP configurat pentru ${r.fromName}.`,
        html: `<p>Acesta este un email de test trimis din Agency OS prin contul SMTP configurat pentru <b>${r.fromName.replace(/[<>&]/g, '')}</b>.</p>${r.signatureHtml ?? ''}`,
      })
    }
  } catch (e) {
    const pass = r.smtpPassEnc ? decrypt(r.smtpPassEnc) : ''
    const msg = e instanceof Error ? e.message : String(e)
    result = { ok: false, error: (pass ? msg.split(pass).join('***') : msg).slice(0, 500) }
  }
  await db.businessLineMailbox.update({ where: { id: r.id }, data: { lastTestAt: new Date(), lastTestOk: result.ok, lastTestError: result.error ?? null } })
  invalidateLineMail()
  return result
}
