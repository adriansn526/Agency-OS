import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { CustomFieldError, setPilot } from '@/lib/crm/custom-fields'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { leadIds: string[] (max 1000), pilot: boolean } → { data: { updated, requested } }: adds the leads to the pilot or takes them out. */
export async function POST(req: Request) {
  const p = z.object({ leadIds: z.array(z.string().min(1).max(60)).min(1).max(1000), pilot: z.boolean() }).strict().safeParse(await req.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'Date invalide' }, { status: 422 })
  const session = await auth().catch(() => null)
  try { return NextResponse.json({ data: await setPilot(p.data.leadIds, p.data.pilot, { id: session?.user?.id, name: session?.user?.name }) }) }
  catch (e) {
    if (e instanceof CustomFieldError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[leads] pilot', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Nu am putut actualiza pilotul' }, { status: 500 })
  }
}
