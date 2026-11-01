import { NextRequest, NextResponse } from 'next/server'
import { TenantAiError, balanceInfo } from '@/lib/tenant-ai/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/tenant-ai/balance: remaining credits and the price list of the AI actions. Auth: X-License-Key. */
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await balanceInfo(req.headers.get('x-license-key')))
  } catch (e) {
    if (e instanceof TenantAiError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
