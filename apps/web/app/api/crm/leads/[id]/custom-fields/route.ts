import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { CustomFieldError, setLeadCustomFields } from '@/lib/crm/custom-fields'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** PATCH { set: { <key>: value | null } } → { data: { changed } }. Only fields defined on the lead's type (and "pilot"); null or "" removes a value. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = z.object({ set: z.record(z.string().regex(/^[a-z0-9_]{1,40}$/), z.union([z.string().max(400), z.number(), z.null()])) }).strict().safeParse(await req.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'Date invalide' }, { status: 422 })
  const session = await auth().catch(() => null)
  try { return NextResponse.json({ data: await setLeadCustomFields((await params).id, p.data.set, { id: session?.user?.id, name: session?.user?.name }) }) }
  catch (e) {
    if (e instanceof CustomFieldError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[leads] custom fields', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Nu am putut salva' }, { status: 500 })
  }
}
