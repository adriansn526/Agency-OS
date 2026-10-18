/** Variables a campaign template can use to send each firm its private website preview. Issuing a link starts that preview's expiry clock. */
import { db } from '@repo/db'
import { issuePreview } from './service'
import { founderOffer, foundingConfig } from '../founding/service'

export const PREVIEW_VARIABLES = ['preview_link', 'preview_expires', 'unsubscribe_link', 'founder_offer'] as const

/** Outreach with a preview link may only start once the legal documents are published (explicit switch: OUTREACH_LEGAL_READY=1). */
export class OutreachBlocked extends Error {}
export function assertOutreachAllowed(env: Record<string, string | undefined> = process.env) {
  if (env.OUTREACH_LEGAL_READY !== '1') throw new OutreachBlocked('Campaniile cu link de previzualizare sunt blocate până când documentele juridice sunt publicate (setează OUTREACH_LEGAL_READY=1 după publicare).')
}

export const templateNeedsPreview = (body: string) => /\{\{preview_link\}\}|\{\{preview_expires\}\}/.test(body)

const dmy = (d: Date) => new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)

export interface PreviewVars { preview_link: string; preview_expires: string; founder_offer: string }

/** For each lead that has a preview profile: a fresh short link and its expiry date. Leads without a preview are simply absent from the result. */
export async function previewVarsFor(lineId: string, leadIds: string[], o: { siteUrl: string; now?: Date }): Promise<Map<string, PreviewVars>> {
  const out = new Map<string, PreviewVars>()
  if (!leadIds.length) return out
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { config: true } })
  const cfg = foundingConfig(channel?.config)
  const entries = await db.websiteEntry.findMany({ where: { businessLineId: lineId, leadId: { in: leadIds }, status: 'preview' }, select: { id: true, leadId: true, county: true, data: true }, orderBy: { createdAt: 'asc' } })
  for (const e of entries) {
    if (!e.leadId || out.has(e.leadId)) continue
    const r = await issuePreview(lineId, e.id, { now: o.now })
    out.set(e.leadId, { preview_link: `${o.siteUrl.replace(/\/$/, '')}/p/${r.token}`, preview_expires: dmy(r.expiresAt), founder_offer: await founderOffer(lineId, e, cfg) })
  }
  return out
}

export const unsubscribeUrl = (siteUrl: string, email?: string) => `${siteUrl.replace(/\/$/, '')}/stop${email ? `?e=${encodeURIComponent(email)}` : ''}`
