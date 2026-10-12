import { NextResponse } from 'next/server'
import { ConfigError, deleteEntityType, updateEntityType } from '@/lib/business-lines/entity-types'
import { ZodError } from 'zod'

export const dynamic = 'force-dynamic'

function fail(e: unknown) {
  if (e instanceof ConfigError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status })
  if (e instanceof ZodError) return NextResponse.json({ error: 'Date invalide', details: e.issues }, { status: 400 })
  console.error('[entity-types]', e)
  return NextResponse.json({ error: 'Eroare internă' }, { status: 500 })
}

// PATCH → name/icon/flow/custom fields and/or pipeline (+ moves for removed stages that still hold leads)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; etId: string }> }) {
  try {
    const { id, etId } = await params
    return NextResponse.json({ data: await updateEntityType(id, etId, await req.json().catch(() => null)) })
  } catch (e) { return fail(e) }
}

// DELETE → only when no lead/client uses the type
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; etId: string }> }) {
  try {
    const { id, etId } = await params
    return NextResponse.json({ data: await deleteEntityType(id, etId) })
  } catch (e) { return fail(e) }
}
