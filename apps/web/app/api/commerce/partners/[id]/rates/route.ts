import { NextResponse } from 'next/server'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { respond } from '@/lib/commerce/partners/http'
import { setRates } from '@/lib/commerce/partners/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** PUT /api/commerce/partners/:id/rates { rates: [...] } — replaces the partner's settlement rates. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!/^[A-Za-z0-9-]{10,40}$/.test(id) || !body) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  return respond(() => setRates(id, body))
}
