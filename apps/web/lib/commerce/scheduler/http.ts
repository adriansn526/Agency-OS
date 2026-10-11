import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { SchedulerError } from './engine'

export async function respondSched<T>(fn: () => Promise<T>, status = 200): Promise<NextResponse> {
  try { return NextResponse.json((await fn()) ?? { ok: true }, { status }) }
  catch (e) {
    if (e instanceof SchedulerError) return NextResponse.json({ error: e.message }, { status: e.status })
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join('; ').slice(0, 300) }, { status: 400 })
    console.error('[commerce/schedules]', e)
    return NextResponse.json({ error: 'Eroare internă' }, { status: 500 })
  }
}
