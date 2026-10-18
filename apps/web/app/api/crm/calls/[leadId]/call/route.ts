import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { OUTCOMES } from '@/lib/crm/calls/outcome'
import { CallInputError, NotFound, recordCall } from '@/lib/crm/calls/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const body = z.object({
  outcome: z.enum(OUTCOMES), notes: z.string().trim().max(2000).optional(),
  consentSms: z.enum(['da', 'nu']).nullish(), consentEmail: z.enum(['da', 'nu']).nullish(),
  callbackAt: z.string().datetime({ offset: true }).nullish(), durationSec: z.number().int().min(0).max(86_400).nullish(),
}).strict()

/** POST { outcome, notes?, consentSms?, consentEmail?, callbackAt? (ISO), durationSec? } → records the call, updates the lead and its stage. */
export async function POST(req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Date invalide', details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }, { status: 422 })
  const session = await auth().catch(() => null)
  try {
    const d = parsed.data
    const r = await recordCall((await params).leadId, { outcome: d.outcome, notes: d.notes, consentSms: d.consentSms ?? null, consentEmail: d.consentEmail ?? null, callbackAt: d.callbackAt ? new Date(d.callbackAt) : null, durationSec: d.durationSec ?? null }, { id: session?.user?.id, name: session?.user?.name })
    return NextResponse.json({ data: r })
  } catch (e) {
    if (e instanceof NotFound) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof CallInputError) return NextResponse.json({ error: e.message }, { status: 422 })
    console.error('[calls] record failed', e)
    return NextResponse.json({ error: 'Apelul nu a putut fi salvat' }, { status: 500 })
  }
}
