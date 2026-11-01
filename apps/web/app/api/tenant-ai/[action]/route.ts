import { NextRequest, NextResponse } from 'next/server'
import { ACTIONS, TenantAiError, runAction } from '@/lib/tenant-ai/service'
import type { Action } from '@/lib/tenant-ai/prompts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** POST /api/tenant-ai/{generate|analyze|review|snippet}: billed AI action. Auth: X-License-Key. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params
  if (!(ACTIONS as readonly string[]).includes(action)) return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
  try {
    const body = await req.json().catch(() => ({}))
    const out = await runAction(req.headers.get('x-license-key'), action as Action, body)
    return NextResponse.json(out)
  } catch (e) {
    if (e instanceof TenantAiError) return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status })
    console.error('[tenant-ai] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
