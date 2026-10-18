/**
 * Sending an SMS from the call modal. Hard rules (there is no override): the firm must have agreed to an SMS (acord_sms = da), must not have opted out, and the
 * message goes out only on weekdays 9:00-18:00 (Bucharest). Templates with a preview link need the legal documents to be published and a private preview to exist;
 * the link is created at the moment of sending (a previous link would stop working, so re-sending asks for explicit confirmation).
 */
import { db, Prisma } from '@repo/db'
import { logCommunication } from '@/lib/comms/log'
import { withinSendingWindow } from '@/lib/marketing/dispatch'
import { populateTemplate } from '@/lib/marketing/template'
import { assertOutreachAllowed, OutreachBlocked, previewVarsFor, templateNeedsPreview, unsubscribeUrl, type PreviewVars } from '@/lib/website/preview/campaign'
import { nationalPhone } from '@/lib/prospectare/import-mapping'

export class SmsBlocked extends Error { constructor(message: string, readonly blockers: string[] = [message]) { super(message) } }

type LeadRow = { id: string; businessLineId: string; companyName: string; phone: string | null; optOut: boolean; customFields: unknown; county: string | null; city: string | null; contactPerson: string; email: string }
type TemplateRow = { id: string; businessLineId: string; name: string; channel: string; body: string }

export const smsLength = (s: string) => s.length

/** Reasons the SMS cannot be sent right now (empty = ready). Pure apart from the clock and the environment passed in. */
export function smsBlockers(lead: LeadRow, template: TemplateRow, o: { now: Date; legalReady: boolean; hasPreview: boolean }): string[] {
  const out: string[] = []
  const cf = (lead.customFields ?? {}) as Record<string, unknown>
  if (!nationalPhone(lead.phone)) out.push('Firma nu are un număr de telefon valid')
  if (lead.optOut) out.push('Firma a cerut să nu mai fie contactată')
  if (cf.acord_sms !== 'da') out.push('Lipsește acordul pentru SMS (bifează „Acord SMS” după ce l-ai primit la telefon)')
  if (template.channel !== 'sms') out.push('Șablonul nu este pentru SMS')
  if (template.businessLineId !== lead.businessLineId) out.push('Șablonul aparține altei linii de business')
  if (!withinSendingWindow(o.now)) out.push('SMS-urile se trimit doar luni–vineri, între 9:00 și 18:00')
  if (templateNeedsPreview(template.body)) {
    if (!o.legalReady) out.push('Documentele juridice nu sunt marcate ca publicate (OUTREACH_LEGAL_READY)')
    if (!o.hasPreview) out.push('Firma nu are o previzualizare privată pentru link')
  }
  return out
}

async function context(lead: LeadRow, template: TemplateRow) {
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: lead.businessLineId }, select: { siteUrl: true } })
  const siteUrl = channel?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://intraconstruct.ro'
  const entry = templateNeedsPreview(template.body) ? await db.websiteEntry.findFirst({ where: { businessLineId: lead.businessLineId, leadId: lead.id, status: 'preview' }, select: { id: true, previewSentAt: true, previewExpiresAt: true } }) : null
  return { siteUrl, entry }
}

const load = async (leadId: string, templateId: string) => {
  const lead = await db.lead.findUnique({ where: { id: leadId }, include: { businessLine: true } })
  const template = await db.marketingTemplate.findUnique({ where: { id: templateId } })
  if (!lead || !template) throw new SmsBlocked('Lead-ul sau șablonul nu există')
  return { lead, template }
}

/** What the modal shows before sending: the text with a placeholder where the private link will go, and the blockers. */
export async function smsPreview(leadId: string, templateId: string, now = new Date()) {
  const { lead, template } = await load(leadId, templateId)
  const { siteUrl, entry } = await context(lead, template)
  const fake: PreviewVars = { preview_link: `${siteUrl.replace(/\/$/, '')}/p/••••••••••`, preview_expires: '(14 zile de la trimitere)', founder_offer: '' }
  const text = populateTemplate(template.body, lead, lead.businessLine, '', undefined, { preview: fake, unsubscribe: unsubscribeUrl(siteUrl) })
  const hasActiveLink = !!entry?.previewSentAt && !!entry.previewExpiresAt && entry.previewExpiresAt > now
  return { text, length: smsLength(text), blockers: smsBlockers(lead, template, { now, legalReady: process.env.OUTREACH_LEGAL_READY === '1', hasPreview: !!entry }), alreadySent: hasActiveLink }
}

export interface SmsDeps { send: (to: string, body: string) => Promise<{ messageId: string }> }

export async function sendLeadSms(leadId: string, templateId: string, user: { name?: string | null }, o: { resend?: boolean; deps?: SmsDeps; now?: Date } = {}) {
  const now = o.now ?? new Date()
  const { lead, template } = await load(leadId, templateId)
  const { siteUrl, entry } = await context(lead, template)
  const blockers = smsBlockers(lead, template, { now, legalReady: process.env.OUTREACH_LEGAL_READY === '1', hasPreview: !!entry })
  if (blockers.length) throw new SmsBlocked(blockers[0]!, blockers)
  if (entry?.previewSentAt && entry.previewExpiresAt && entry.previewExpiresAt > now && !o.resend) {
    throw new SmsBlocked('Linkul de previzualizare a fost deja trimis. Dacă retrimiți, linkul vechi nu va mai funcționa; confirmă retrimiterea.', ['already_sent'])
  }
  try { if (templateNeedsPreview(template.body)) assertOutreachAllowed() } catch (e) { if (e instanceof OutreachBlocked) throw new SmsBlocked(e.message); throw e }
  const vars = templateNeedsPreview(template.body) ? (await previewVarsFor(lead.businessLineId, [lead.id], { siteUrl, now })).get(lead.id) : undefined
  const text = populateTemplate(template.body, lead, lead.businessLine, '', undefined, { preview: vars, unsubscribe: unsubscribeUrl(siteUrl) })
  const send = o.deps?.send ?? (async (to: string, body: string) => { const { sendSMS } = await import('@/lib/integrations/smso'); return sendSMS(to, body) })
  const r = await send(lead.phone!, text)
  await db.lead.update({ where: { id: lead.id }, data: { customFields: { ...((lead.customFields ?? {}) as Record<string, unknown>), sms_trimis_la: now.toISOString().slice(0, 10) } as Prisma.InputJsonValue } })
  await logCommunication({ leadId: lead.id, businessLineId: lead.businessLineId, channel: 'sms', direction: 'outbound', subject: `SMS: ${template.name}`, body: text, phone: lead.phone, toAddr: lead.phone, userName: user.name ?? 'System', externalId: r.messageId || null, metadata: { templateId: template.id, resend: !!o.resend } })
  return { sent: true, length: smsLength(text), text }
}
