import { NextResponse } from 'next/server'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { promoteLead } from '@/lib/commerce/partners/leads'
import { respond } from '@/lib/commerce/partners/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/commerce/partners/leads/:id/promote { …confirmed values } — creates the partner in the registry from confirmed data. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(id) || !body) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  return respond(() => promoteLead(id, body), 201)
}
