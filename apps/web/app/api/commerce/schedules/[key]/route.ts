import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { updateJob } from '@/lib/commerce/scheduler/engine'
import { respondSched } from '@/lib/commerce/scheduler/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({ enabled: z.boolean().optional(), schedule: z.unknown().optional() }).refine((b) => b.enabled !== undefined || b.schedule !== undefined, 'Nimic de modificat')

/** PATCH /api/commerce/schedules/:key { enabled?, schedule? } — switch a job on/off or change its schedule. */
export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { key } = await params
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!/^[a-z_]{3,40}$/.test(key) || !body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  return respondSched(async () => { await updateJob(key, body.data) })
}
