import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'
import { startBackgroundRun } from '@/lib/commerce/sync/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({ job: z.enum(['feed', 'reprice']), dryRun: z.boolean().default(true) })

/** POST /api/commerce/sync/run { job, dryRun } — "Rulează acum" / "Dry-run" (admin only). Returns 202 and runs in the background. */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest()
  const session = await auth()
  const r = await startBackgroundRun(parsed.data.job, parsed.data.dryRun, session?.user?.id ?? 'unknown')
  if (!r.started) return NextResponse.json({ error: r.reason }, { status: 409 })
  return NextResponse.json({ ok: true, started: true }, { status: 202 })
}
