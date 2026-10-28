/**
 * Real delivery of email campaigns (the campaign routes used to mark email leads as "sent" without sending anything).
 * Every message goes out through the line's mailbox ("partners"), is logged on the lead's timeline, and carries List-Unsubscribe headers.
 * A lead is marked "sent" only when the mail server accepted the message; otherwise "failed" (so a retry or a report is possible, and nothing is faked).
 */
import { withinWindow, type SendingWindow } from './sending-window'
import { db } from '@repo/db'
import { sendRawEmail } from '@/lib/email'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,24}$/
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Plain campaign text → safe HTML: escaped, URLs linked, blank lines become paragraphs. */
export function textToHtml(text: string): string {
  const linked = (t: string) => esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1">$1</a>')
  return text.trim().split(/\n{2,}/).map((p) => `<p>${linked(p).replace(/\n/g, '<br>')}</p>`).join('\n')
}

export function fillSubject(subject: string | null | undefined, lead: { companyName?: string | null; city?: string | null; county?: string | null }, brandName = 'IntraConstruct'): string {
  return (subject || brandName)
    .replace(/\{\{(?:company_name|companyName)\}\}/g, lead.companyName || '').replace(/\{\{city\}\}/g, lead.city || '').replace(/\{\{county\}\}/g, lead.county || '')
    .replace(/\s+/g, ' ').trim()
}

/** Templates keep unfinished spots as [DE COMPLETAT: …]; such a message must never leave the building. */
export const hasDraftMarker = (body: string) => /\[DE COMPLETAT/i.test(body)

export interface DispatchItem { id: string; leadId: string; messageBody: string | null; lead: { email: string | null; companyName: string | null; city: string | null; county: string | null } }
export interface DispatchCtx { campaignId: string; lineSlug?: string; brandName?: string; subject: string | null; unsubscribeUrl: (email: string) => string }
export interface DispatchDeps { send: typeof sendRawEmail }

export async function dispatchEmails(items: DispatchItem[], ctx: DispatchCtx, deps: DispatchDeps = { send: sendRawEmail }, now = new Date()): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0
  for (const it of items) {
    const email = it.lead.email?.trim() ?? ''
    const body = it.messageBody?.trim() ?? ''
    if (!EMAIL_RE.test(email) || !body || hasDraftMarker(body)) {
      await db.campaignLead.update({ where: { id: it.id }, data: { status: 'failed', notes: !body ? 'mesaj gol' : hasDraftMarker(body) ? 'ciornă nefinalizată ([DE COMPLETAT])' : 'email invalid' } })
      failed++
      continue
    }
    const unsub = ctx.unsubscribeUrl(email)
    const footer = `\n\nNu mai doriți mesaje de la ${ctx.brandName ?? 'IntraConstruct'}? ${unsub}`
    try {
      await deps.send({
        to: email, subject: fillSubject(ctx.subject, it.lead, ctx.brandName), text: body + (body.includes(unsub) ? '' : footer), html: textToHtml(body + (body.includes(unsub) ? '' : footer)),
        businessLine: ctx.lineSlug, purpose: 'partners', link: { leadId: it.leadId }, source: `campaign:${ctx.campaignId}`,
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'X-Campaign-Id': ctx.campaignId },
      })
    } catch (e) {
      console.error('[campaign-email] failed', it.leadId, e instanceof Error ? e.message : e)
      await db.campaignLead.update({ where: { id: it.id }, data: { status: 'failed', notes: String(e instanceof Error ? e.message : e).slice(0, 300) } })
      failed++
      continue
    }
    await db.$transaction([
      db.campaignLead.update({ where: { id: it.id }, data: { status: 'sent', sentAt: now } }),
      db.lead.update({ where: { id: it.leadId }, data: { lastCampaignAt: now, lastCampaignId: ctx.campaignId, campaignCount: { increment: 1 } } as never }),
    ])
    sent++
  }
  return { sent, failed }
}

/** Outreach goes out inside the line's sending window (default: weekdays, 9:00–18:00 Europe/Bucharest; see sending-window.ts). */
export function withinSendingWindow(now = new Date(), window?: SendingWindow): boolean {
  return withinWindow(now, window)
}
