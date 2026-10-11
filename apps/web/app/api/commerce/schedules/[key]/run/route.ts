import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { runNow } from '@/lib/commerce/scheduler/engine'
import { respondSched } from '@/lib/commerce/scheduler/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/commerce/schedules/:key/run { dryRun } — "Rulează acum" / "Dry-run"; starts in the background (202). */
export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { key } = await params
  const body = z.object({ dryRun: z.boolean().default(true) }).safeParse(await req.json().catch(() => ({})))
  if (!/^[a-z_]{3,40}$/.test(key) || !body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const session = await auth()
  return respondSched(() => runNow(key, { dryRun: body.data.dryRun, by: session?.user?.id ?? 'unknown' }), 202)
}
