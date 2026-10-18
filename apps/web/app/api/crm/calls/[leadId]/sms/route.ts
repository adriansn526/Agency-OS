import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { SmsBlocked, sendLeadSms, smsPreview } from '@/lib/crm/calls/sms'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET ?templateId → { text, length, blockers, alreadySent } (text has a placeholder where the private link goes). */
export async function GET(req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const templateId = new URL(req.url).searchParams.get('templateId') ?? ''
  try { return NextResponse.json({ data: await smsPreview((await params).leadId, templateId) }) }
  catch (e) { return e instanceof SmsBlocked ? NextResponse.json({ error: e.message }, { status: 404 }) : NextResponse.json({ error: 'Previzualizarea nu a reușit' }, { status: 500 }) }
}

/** POST { templateId, resend? } → sends the SMS (blocked unless the firm agreed, did not opt out and the time window allows it). */
export async function POST(req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const p = z.object({ templateId: z.string().min(1).max(60), resend: z.boolean().optional() }).strict().safeParse(await req.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'Date invalide' }, { status: 422 })
  const session = await auth().catch(() => null)
  try { return NextResponse.json({ data: await sendLeadSms((await params).leadId, p.data.templateId, { name: session?.user?.name }, { resend: p.data.resend }) }) }
  catch (e) {
    if (e instanceof SmsBlocked) return NextResponse.json({ error: e.message, blockers: e.blockers }, { status: e.blockers[0] === 'already_sent' ? 409 : 403 })
    console.error('[calls] sms failed', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'SMS-ul nu a putut fi trimis' }, { status: 502 })
  }
}
