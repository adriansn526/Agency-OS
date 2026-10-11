import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { updateJob } from '@/lib/commerce/orders/admin'
import { respond } from '@/lib/commerce/partners/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** PATCH /api/commerce/orders/:id/jobs/:jobId { action: schedule|done|cancel|reopen, scheduledAt?, notes? } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; jobId: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id, jobId } = await params
  const body = await req.json().catch(() => null)
  const ok = (v: string) => /^[A-Za-z0-9_-]{8,40}$/.test(v)
  if (!ok(id) || !ok(jobId) || !body) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const session = await auth()
  return respond(() => updateJob(id, jobId, body, session?.user?.id ?? 'unknown'))
}
