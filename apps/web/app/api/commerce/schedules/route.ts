import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { setSchedulerEnabled } from '@/lib/commerce/scheduler/engine'
import { loadSchedulesView } from '@/lib/commerce/scheduler/view'
import { respondSched } from '@/lib/commerce/scheduler/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/commerce/schedules — scheduler state, jobs, history, which secrets are configured (admin only). */
export async function GET() {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  return respondSched(loadSchedulesView)
}

/** PUT /api/commerce/schedules { enabled } — master switch of the scheduler. */
export async function PUT(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const body = z.object({ enabled: z.boolean() }).safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  return respondSched(async () => { await setSchedulerEnabled(body.data.enabled) })
}
