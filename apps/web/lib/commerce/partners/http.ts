import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { PartnerError } from './service'

/** Maps domain/validation errors to JSON responses; anything else is a generic 500 (details only in the log). */
export async function respond<T>(fn: () => Promise<T>, okStatus = 200): Promise<NextResponse> {
  try {
    const data = await fn()
    return NextResponse.json(data ?? { ok: true }, { status: okStatus })
  } catch (e) {
    if (e instanceof PartnerError) return NextResponse.json({ error: e.message }, { status: e.status })
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues.map((i) => `${i.path.join('.') || 'valoare'}: ${i.message}`).join('; ').slice(0, 300) }, { status: 400 })
    console.error('[commerce/partners]', e)
    return NextResponse.json({ error: 'Eroare internă' }, { status: 500 })
  }
}
