import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@repo/db'
import { sendRawEmail } from '@/lib/email'
import { MAILBOX_KEY_RE } from '@/lib/mail/business-line-mail'
import { timelineWhere } from '@/lib/comms/log'
import { buildReply } from '@/lib/comms/reply'

export const dynamic = 'force-dynamic'

const schema = z.object({
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  purpose: z.string().regex(MAILBOX_KEY_RE).optional(),
  to: z.string().trim().email().optional(),
  subject: z.string().trim().max(300).optional(),
  body: z.string().trim().min(1).max(50_000),
  /** Communication id this email answers: keeps the conversation thread (In-Reply-To / References) */
  replyToId: z.string().optional(),
  userName: z.string().max(120).optional(),
}).refine((v) => v.leadId || v.clientId, { message: 'leadId sau clientId obligatoriu' })
  .refine((v) => v.replyToId || (v.subject && v.subject.length > 0), { message: 'Subiectul este obligatoriu', path: ['subject'] })

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// POST /api/communications/send → sends a plain email from one of the line's mailboxes and records it on the timeline.
// With replyToId it continues that conversation: Re: subject, same mailbox, threading headers, quoted original.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Date invalide', details: parsed.error.issues }, { status: 400 })
  const v = parsed.data

  const entity = v.leadId
    ? await db.lead.findUnique({ where: { id: v.leadId }, select: { email: true, optOut: true, businessLine: { select: { slug: true } } } })
    : await db.client.findUnique({ where: { id: v.clientId! }, select: { email: true, businessLine: { select: { slug: true } } } })
  if (!entity) return NextResponse.json({ error: 'Lead/client inexistent' }, { status: 404 })
  if ('optOut' in entity && entity.optOut) return NextResponse.json({ error: 'Lead-ul s-a dezabonat de la comunicări' }, { status: 409 })

  let to = v.to || entity.email
  let subject = v.subject || ''
  let purpose = v.purpose
  let text = v.body
  let html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(v.body)}</div>`
  let thread: { inReplyTo?: string; references?: string[]; threadId?: string | null } = {}

  if (v.replyToId) {
    const parent = await db.communication.findFirst({ where: { AND: [{ id: v.replyToId }, await timelineWhere({ leadId: v.leadId, clientId: v.clientId })] } })
    if (!parent || parent.channel !== 'email') return NextResponse.json({ error: 'Mesajul la care răspunzi nu există pe acest lead/client' }, { status: 404 })
    const key = parent.threadId ?? parent.externalId
    const members = key ? await db.communication.findMany({ where: { channel: 'email', OR: [{ threadId: key }, { externalId: key }] } }) : [parent]
    const r = buildReply(parent, members)
    to = v.to || r.to || entity.email
    subject = v.subject || r.subject
    purpose = purpose ?? (r.mailbox ?? undefined)
    text = v.body + r.quotedText
    html = html + r.quotedHtml
    thread = { inReplyTo: r.inReplyTo, references: r.references, threadId: r.threadId }
  }
  if (!to) return NextResponse.json({ error: 'Nu există o adresă de email' }, { status: 400 })

  try {
    await sendRawEmail({
      to, subject, text, html,
      businessLine: entity.businessLine.slug, purpose: purpose ?? 'general',
      link: { leadId: v.leadId, clientId: v.clientId }, source: v.replyToId ? 'reply' : 'manual', ...thread,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Trimiterea a eșuat: ' + (e instanceof Error ? e.message.slice(0, 200) : 'eroare necunoscută') }, { status: 502 })
  }
}
