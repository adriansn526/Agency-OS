import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@repo/db'
import { sendRawEmail } from '@/lib/email'
import { MAILBOX_KEY_RE } from '@/lib/mail/business-line-mail'

export const dynamic = 'force-dynamic'

const schema = z.object({
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  purpose: z.string().regex(MAILBOX_KEY_RE).default('general'),
  to: z.string().trim().email().optional(),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(50_000),
  userName: z.string().max(120).optional(),
}).refine((v) => v.leadId || v.clientId, { message: 'leadId sau clientId obligatoriu' })

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// POST /api/communications/send → sends a plain email from the line's mailbox and records it on the timeline
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Date invalide', details: parsed.error.issues }, { status: 400 })
  const v = parsed.data

  const entity = v.leadId
    ? await db.lead.findUnique({ where: { id: v.leadId }, select: { email: true, optOut: true, businessLine: { select: { slug: true } } } })
    : await db.client.findUnique({ where: { id: v.clientId! }, select: { email: true, businessLine: { select: { slug: true } } } })
  if (!entity) return NextResponse.json({ error: 'Lead/client inexistent' }, { status: 404 })
  if ('optOut' in entity && entity.optOut) return NextResponse.json({ error: 'Lead-ul s-a dezabonat de la comunicări' }, { status: 409 })
  const to = v.to || entity.email
  if (!to) return NextResponse.json({ error: 'Nu există o adresă de email' }, { status: 400 })

  try {
    await sendRawEmail({
      to, subject: v.subject, text: v.body,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(v.body)}</div>`,
      businessLine: entity.businessLine.slug, purpose: v.purpose,
      link: { leadId: v.leadId, clientId: v.clientId }, source: 'manual',
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Trimiterea a eșuat: ' + (e instanceof Error ? e.message.slice(0, 200) : 'eroare necunoscută') }, { status: 502 })
  }
}
