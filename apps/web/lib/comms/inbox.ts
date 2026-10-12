/**
 * Shared inbox: inbound emails that matched no lead/client (Communication with leadId = clientId = null).
 * Grouped into conversations by threadId. A conversation can be attached to an existing lead/client of the same business line,
 * turned into a new lead, or archived (tag "archived"). Nothing is ever deleted.
 */
import { db, Prisma, businessLineConfigSchema } from '@repo/db'
import { addrOf } from './reply'

export class InboxError extends Error {
  constructor(message: string, readonly status = 400, readonly details?: unknown) { super(message) }
}

const unowned = (extra: Prisma.CommunicationWhereInput = {}): Prisma.CommunicationWhereInput => ({
  leadId: null, clientId: null, channel: 'email', kind: 'message', businessLineId: { not: null }, ...extra,
})

export interface InboxFilter { businessLineId?: string; mailbox?: string; q?: string; archived?: boolean; limit?: number }

export async function listInbox(f: InboxFilter) {
  const where = unowned({
    direction: 'inbound', businessLineId: f.businessLineId ?? { not: null }, ...(f.mailbox ? { mailbox: f.mailbox } : {}),
    ...(f.archived ? { tags: { has: 'archived' } } : { NOT: { tags: { has: 'archived' } } }),
    ...(f.q ? { OR: [{ subject: { contains: f.q, mode: 'insensitive' as const } }, { fromAddr: { contains: f.q, mode: 'insensitive' as const } }, { body: { contains: f.q, mode: 'insensitive' as const } }] } : {}),
  })
  const rows = await db.communication.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(f.limit ?? 300, 1000), include: { businessLine: { select: { id: true, name: true, slug: true } } } })
  const threads = new Map<string, typeof rows>()
  for (const r of rows) threads.set(r.threadId ?? r.id, [...(threads.get(r.threadId ?? r.id) ?? []), r])
  return [...threads.entries()].map(([threadId, msgs]) => {
    const sorted = [...msgs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const last = sorted[sorted.length - 1]!
    const meta = (m: (typeof sorted)[number]) => (m.metadata ?? {}) as { autoReply?: boolean }
    return {
      threadId, count: sorted.length, subject: sorted[0]!.subject, from: last.fromAddr, fromEmail: addrOf(last.fromAddr), lastAt: last.createdAt,
      mailbox: last.mailbox, businessLine: last.businessLine, autoReply: sorted.every((m) => meta(m).autoReply === true),
      messages: sorted.map((m) => ({ id: m.id, subject: m.subject, body: m.body.slice(0, 6000), fromAddr: m.fromAddr, toAddr: m.toAddr, createdAt: m.createdAt, attachments: (m.metadata as { attachments?: string[] } | null)?.attachments ?? [] })),
    }
  }).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
}

export async function inboxCount(): Promise<number> {
  const rows = await db.communication.findMany({ where: unowned({ direction: 'inbound', NOT: { tags: { has: 'archived' } } }), distinct: ['threadId'], select: { id: true } })
  return rows.length
}

async function threadRows(threadId: string) {
  const rows = await db.communication.findMany({ where: unowned({ OR: [{ threadId }, { id: threadId }] }), select: { id: true, businessLineId: true, fromAddr: true, direction: true, subject: true, tags: true } })
  if (!rows.length) throw new InboxError('Conversația nu mai este în inbox (poate a fost deja atribuită)', 404)
  return rows
}

/** Moves a whole conversation to an existing lead or client of the same business line. */
export async function assignThread(threadId: string, owner: { leadId?: string; clientId?: string }) {
  if (Boolean(owner.leadId) === Boolean(owner.clientId)) throw new InboxError('Alege un lead sau un client')
  const rows = await threadRows(threadId)
  const bl = rows[0]!.businessLineId!
  const target = owner.leadId
    ? await db.lead.findUnique({ where: { id: owner.leadId }, select: { businessLineId: true } })
    : await db.client.findUnique({ where: { id: owner.clientId! }, select: { businessLineId: true } })
  if (!target) throw new InboxError('Lead/client inexistent', 404)
  if (target.businessLineId !== bl) throw new InboxError('Conversația și destinația aparțin unor linii de business diferite', 409)
  const r = await db.communication.updateMany({ where: { id: { in: rows.map((x) => x.id) } }, data: { leadId: owner.leadId ?? null, clientId: owner.clientId ?? null } })
  return { moved: r.count }
}

export const createLeadSchema = {
  parse(v: unknown) {
    const o = (v ?? {}) as Record<string, unknown>
    const s = (x: unknown, max: number) => (typeof x === 'string' && x.trim() ? x.trim().slice(0, max) : undefined)
    return { entityType: s(o.entityType, 40), companyName: s(o.companyName, 200), contactPerson: s(o.contactPerson, 200), phone: s(o.phone, 40), notes: s(o.notes, 2000) }
  },
}

/** Creates a lead from the conversation's sender and attaches every unassigned message from that address in the line. */
export async function createLeadFromThread(threadId: string, raw: unknown) {
  const input = createLeadSchema.parse(raw)
  const rows = await threadRows(threadId)
  const first = rows.find((r) => r.direction === 'inbound') ?? rows[0]!
  const email = addrOf(first.fromAddr)
  if (!email) throw new InboxError('Mesajul nu are o adresă de expeditor validă')
  const businessLineId = first.businessLineId!

  const existing = await db.lead.findFirst({ where: { businessLineId, OR: [{ email: { equals: email, mode: 'insensitive' } }, { email2: { equals: email, mode: 'insensitive' } }] }, select: { id: true, companyName: true } })
  if (existing) throw new InboxError(`Există deja un lead cu adresa ${email}: ${existing.companyName}`, 409, { leadId: existing.id })
  const client = await db.client.findFirst({ where: { businessLineId, email: { equals: email, mode: 'insensitive' } }, select: { id: true, companyName: true } })
  if (client) throw new InboxError(`Există deja un client cu adresa ${email}: ${client.companyName}`, 409, { clientId: client.id })

  const line = await db.businessLine.findUniqueOrThrow({ where: { id: businessLineId }, select: { config: true } })
  const cfg = businessLineConfigSchema.safeParse(line.config)
  const types = cfg.success ? cfg.data.entityTypes : []
  const et = types.find((t) => t.id === input.entityType) ?? types.find((t) => t.financialFlow === 'income') ?? types[0]
  if (input.entityType && !types.some((t) => t.id === input.entityType)) throw new InboxError('Tip de entitate necunoscut pentru această linie')
  if (!et) throw new InboxError('Linia nu are niciun tip de entitate', 422)

  const display = (first.fromAddr ?? '').replace(/<[^>]*>/, '').replace(/"/g, '').trim()
  const person = input.contactPerson ?? (display && !display.includes('@') ? display : email.split('@')[0]!)
  const domain = email.split('@')[1] ?? ''
  const free = /^(gmail|yahoo|outlook|hotmail|icloud|live|mail|protonmail)\./i.test(domain)

  return db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: { businessLineId, entityType: et.id, companyName: input.companyName ?? (free ? person : domain || person), contactPerson: person, email, phone: input.phone ?? null, status: et.pipeline[0]?.key ?? 'nou', source: 'email_inbox', notes: input.notes ?? `Creat din emailul „${first.subject}”` },
      select: { id: true },
    })
    // this conversation plus any other unassigned message of the same sender in this line
    const all = await tx.communication.findMany({
      where: unowned({ businessLineId, OR: [{ id: { in: rows.map((r) => r.id) } }, { fromAddr: { contains: email, mode: 'insensitive' } }] }), select: { id: true },
    })
    const r = await tx.communication.updateMany({ where: { id: { in: all.map((x) => x.id) } }, data: { leadId: lead.id } })
    return { leadId: lead.id, attached: r.count }
  })
}

export async function archiveThread(threadId: string, archived: boolean) {
  const rows = await threadRows(threadId)
  for (const r of rows) {
    const tags = new Set(r.tags)
    archived ? tags.add('archived') : tags.delete('archived')
    await db.communication.update({ where: { id: r.id }, data: { tags: [...tags] } })
  }
  return { updated: rows.length }
}

/** Candidate leads/clients of a line for the "attach to" picker. */
export async function searchOwners(businessLineId: string, q: string) {
  const term = q.trim()
  if (term.length < 2) return []
  const like = { contains: term, mode: 'insensitive' as const }
  const [leads, clients] = await Promise.all([
    db.lead.findMany({ where: { businessLineId, OR: [{ companyName: like }, { contactPerson: like }, { email: like }] }, take: 8, orderBy: { updatedAt: 'desc' }, select: { id: true, companyName: true, contactPerson: true, email: true } }),
    db.client.findMany({ where: { businessLineId, OR: [{ companyName: like }, { contactPerson: like }, { email: like }] }, take: 8, orderBy: { updatedAt: 'desc' }, select: { id: true, companyName: true, contactPerson: true, email: true } }),
  ])
  return [...leads.map((l) => ({ type: 'lead' as const, ...l })), ...clients.map((c) => ({ type: 'client' as const, ...c }))]
}
