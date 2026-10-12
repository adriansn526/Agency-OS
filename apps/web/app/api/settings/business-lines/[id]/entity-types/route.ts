import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ConfigError, createEntityType } from '@/lib/business-lines/entity-types'

export const dynamic = 'force-dynamic'

// POST /api/settings/business-lines/[id]/entity-types → new entity type with its pipeline
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    return NextResponse.json({ data: await createEntityType(id, await req.json().catch(() => null)) }, { status: 201 })
  } catch (e) {
    if (e instanceof ConfigError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status })
    if (e instanceof ZodError) return NextResponse.json({ error: 'Date invalide', details: e.issues }, { status: 400 })
    console.error('[entity-types]', e)
    return NextResponse.json({ error: 'Eroare internă' }, { status: 500 })
  }
}
