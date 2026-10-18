/** Variables a campaign template can use to send each firm its private website preview. Issuing a link starts that preview's expiry clock. */
import { db } from '@repo/db'
import { issuePreview } from './service'

export const PREVIEW_VARIABLES = ['preview_link', 'preview_expires', 'unsubscribe_link'] as const

export const templateNeedsPreview = (body: string) => /\{\{preview_link\}\}|\{\{preview_expires\}\}/.test(body)

const dmy = (d: Date) => new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)

export interface PreviewVars { preview_link: string; preview_expires: string }

/** For each lead that has a preview profile: a fresh short link and its expiry date. Leads without a preview are simply absent from the result. */
export async function previewVarsFor(lineId: string, leadIds: string[], o: { siteUrl: string; now?: Date }): Promise<Map<string, PreviewVars>> {
  const out = new Map<string, PreviewVars>()
  if (!leadIds.length) return out
  const entries = await db.websiteEntry.findMany({ where: { businessLineId: lineId, leadId: { in: leadIds }, status: 'preview' }, select: { id: true, leadId: true }, orderBy: { createdAt: 'asc' } })
  for (const e of entries) {
    if (!e.leadId || out.has(e.leadId)) continue
    const r = await issuePreview(lineId, e.id, { now: o.now })
    out.set(e.leadId, { preview_link: `${o.siteUrl.replace(/\/$/, '')}/p/${r.token}`, preview_expires: dmy(r.expiresAt) })
  }
  return out
}

export const unsubscribeUrl = (siteUrl: string, email?: string) => `${siteUrl.replace(/\/$/, '')}/stop${email ? `?e=${encodeURIComponent(email)}` : ''}`
