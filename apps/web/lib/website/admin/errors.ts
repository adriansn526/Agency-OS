import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { DataValidationError } from './entry-data'

export class AdminError extends Error {
  constructor(message: string, readonly status = 400, readonly details?: unknown) { super(message) }
}

/** Runs a service call and maps its errors to JSON responses (no internals leak to the client). */
export async function respond<T>(fn: () => Promise<T>, okStatus = 200): Promise<NextResponse> {
  try {
    const data = await fn()
    return NextResponse.json({ data }, { status: okStatus })
  } catch (e) {
    if (e instanceof AdminError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status })
    if (e instanceof DataValidationError) return NextResponse.json({ error: 'Date invalide', details: e.issues }, { status: 422 })
    if (e instanceof ZodError) return NextResponse.json({ error: 'Date invalide', details: e.issues.map((i) => `${i.path.join('.') || 'cerere'}: ${i.message}`) }, { status: 422 })
    console.error('[website-admin]', e)
    return NextResponse.json({ error: 'Eroare internă' }, { status: 500 })
  }
}

export async function readJson(req: Request): Promise<unknown> {
  const body = await req.json().catch(() => null)
  if (body === null || typeof body !== 'object') throw new AdminError('Corp JSON invalid', 400)
  return body
}
