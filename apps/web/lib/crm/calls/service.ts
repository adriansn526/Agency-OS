/** Recording a phone call on a lead: one transaction for the lead update and the stage change, then the timeline entry. */
import { db, Prisma } from '@repo/db'
import { logCommunication } from '@/lib/comms/log'
import { CallInputError, planCall, type CallInput } from './outcome'

export class NotFound extends Error {}

export async function recordCall(leadId: string, input: CallInput, user: { id?: string | null; name?: string | null }, now = new Date()) {
  const lead = await db.lead.findUnique({ where: { id: leadId }, include: { businessLine: { select: { id: true, config: true } } } })
  if (!lead) throw new NotFound('Lead-ul nu există')
  const types = ((lead.businessLine.config as { entityTypes?: { id: string; pipeline?: { key: string }[] }[] } | null)?.entityTypes) ?? []
  const pipeline = (types.find((t) => t.id === lead.entityType)?.pipeline ?? []).map((s) => s.key)
  const plan = planCall({ status: lead.status, optOut: lead.optOut, customFields: lead.customFields, nextAction: lead.nextAction, nextActionDate: lead.nextActionDate }, input, pipeline, now)

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        ...(plan.status ? { status: plan.status } : {}), ...(plan.optOut !== undefined ? { optOut: plan.optOut } : {}),
        nextAction: plan.nextAction, nextActionDate: plan.nextActionDate,
        customFields: { ...((lead.customFields ?? {}) as Record<string, unknown>), ...plan.customFields } as Prisma.InputJsonValue,
      },
    })
    if (plan.statusChange) {
      await tx.activity.create({ data: { businessLineId: lead.businessLineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action: 'status_changed', entityType: 'lead', entityId: leadId, entityName: lead.companyName, leadId, details: { oldStatus: plan.statusChange.from, newStatus: plan.statusChange.to, via: 'apel' } as Prisma.InputJsonValue } })
    }
  })
  await logCommunication({
    leadId, businessLineId: lead.businessLineId, channel: 'call', direction: 'outbound', subject: plan.call.subject, body: plan.call.body, phone: lead.phone, callResult: plan.call.callResult,
    duration: plan.call.durationMin, userName: user.name ?? 'System',
    metadata: { outcome: input.outcome, callbackAt: input.callbackAt?.toISOString() ?? null, consentSms: input.consentSms ?? null, consentEmail: input.consentEmail ?? null },
  })
  return { status: plan.status ?? lead.status, statusChanged: !!plan.statusChange, optOut: plan.optOut ?? lead.optOut, nextAction: plan.nextAction, nextActionDate: plan.nextActionDate?.toISOString() ?? null }
}

export { CallInputError }
