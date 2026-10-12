/**
 * Writes a message/note/event to the omnichannel timeline of a lead or client. Never throws: a logging failure must not
 * break the action being logged (an order, an offer, a report).
 */
import { db } from '@repo/db'

export interface CommLink { leadId?: string | null; clientId?: string | null }

export interface LogInput extends CommLink {
  businessLineSlug?: string | null
  businessLineId?: string | null
  channel: 'email' | 'call' | 'whatsapp' | 'sms' | 'video' | 'note' | 'system'
  direction?: 'inbound' | 'outbound'
  kind?: 'message' | 'note' | 'event'
  subject: string
  body?: string
  fromAddr?: string | null
  toAddr?: string | null
  emailStatus?: 'sent' | 'failed' | 'delivered' | 'read' | 'bounced' | null
  mailbox?: string | null
  phone?: string | null
  callResult?: string | null
  duration?: number | null
  userName?: string | null
  threadId?: string | null
  externalId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function logCommunication(i: LogInput): Promise<string | null> {
  try {
    if (!i.leadId && !i.clientId) return null
    let businessLineId = i.businessLineId ?? null
    if (!businessLineId && i.businessLineSlug) {
      businessLineId = (await db.businessLine.findUnique({ where: { slug: i.businessLineSlug }, select: { id: true } }))?.id ?? null
    }
    const row = await db.communication.create({
      data: {
        businessLineId, leadId: i.leadId ?? null, clientId: i.clientId ?? null,
        channel: i.channel, direction: i.direction ?? 'outbound', kind: i.kind ?? (i.channel === 'system' ? 'event' : i.channel === 'note' ? 'note' : 'message'),
        subject: i.subject.slice(0, 500), body: i.body ?? '',
        fromAddr: i.fromAddr ?? null, toAddr: i.toAddr ?? null, emailStatus: i.emailStatus ?? null, mailbox: i.mailbox ?? null,
        phone: i.phone ?? null, callResult: i.callResult ?? null, duration: i.duration ?? null,
        userName: i.userName ?? 'System', threadId: i.threadId ?? null, externalId: i.externalId ?? null,
        metadata: (i.metadata ?? undefined) as any,
      },
      select: { id: true },
    })
    return row.id
  } catch (e) {
    console.error('[comms] log failed', e instanceof Error ? e.message : e)
    return null
  }
}

/** Where-clause for an entity's timeline. A lead converted to a client shares one history, in both directions. */
export async function timelineWhere(entity: { leadId?: string; clientId?: string }) {
  const or: any[] = []
  if (entity.leadId) {
    or.push({ leadId: entity.leadId })
    const lead = await db.lead.findUnique({ where: { id: entity.leadId }, select: { convertedToId: true } })
    if (lead?.convertedToId) or.push({ clientId: lead.convertedToId })
  }
  if (entity.clientId) {
    or.push({ clientId: entity.clientId })
    const leads = await db.lead.findMany({ where: { convertedToId: entity.clientId }, select: { id: true } })
    if (leads.length) or.push({ leadId: { in: leads.map((l) => l.id) } })
  }
  return or.length ? { OR: or } : { id: '__none__' }
}
