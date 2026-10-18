/**
 * Pipeline automations for partner leads, triggered by website events (best effort: a failure here never breaks the triggering request).
 *  - profile published  → lead moves to "activ" (forward-only; never reopens a refused lead)
 *  - preview opened     → one Activity note "a văzut pagina" (first time only)
 */
import { db, Prisma } from '@repo/db'

const BEFORE_ACTIVE = ['prospect', 'contactat', 'in_discutii', 'onboarding']

export async function onProfilePublished(leadId: string | null | undefined): Promise<boolean> {
  if (!leadId) return false
  try {
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, status: true, companyName: true, businessLineId: true, entityType: true } })
    if (!lead || lead.entityType !== 'parteneri' || !BEFORE_ACTIVE.includes(lead.status)) return false
    await db.$transaction([
      db.lead.update({ where: { id: leadId }, data: { status: 'activ' } }),
      db.activity.create({ data: { businessLineId: lead.businessLineId, userId: 'system', userName: 'System', action: 'status_changed', entityType: 'lead', entityId: leadId, entityName: lead.companyName, leadId, details: { oldStatus: lead.status, newStatus: 'activ', via: 'publicare profil' } as Prisma.InputJsonValue } }),
    ])
    return true
  } catch (e) {
    console.error('[pipeline] onProfilePublished', e)
    return false
  }
}

export async function onPreviewViewed(leadId: string | null | undefined, now = new Date()): Promise<boolean> {
  if (!leadId) return false
  try {
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, companyName: true, businessLineId: true, customFields: true } })
    if (!lead) return false
    const cf = (lead.customFields ?? {}) as Record<string, unknown>
    if (cf.previzualizare_vazuta_la) return false
    // conditional update makes concurrent first views write one note only
    const claimed = await db.$executeRaw`UPDATE "Lead" SET "customFields" = COALESCE("customFields",'{}'::jsonb) || jsonb_build_object('previzualizare_vazuta_la', ${now.toISOString()}::text) WHERE id = ${leadId} AND COALESCE("customFields"->>'previzualizare_vazuta_la','') = ''`
    if (!claimed) return false
    await db.activity.create({ data: { businessLineId: lead.businessLineId, userId: 'system', userName: 'System', action: 'note', entityType: 'lead', entityId: leadId, entityName: lead.companyName, leadId, details: { note: 'A văzut pagina de previzualizare' } as Prisma.InputJsonValue } })
    return true
  } catch (e) {
    console.error('[pipeline] onPreviewViewed', e)
    return false
  }
}
