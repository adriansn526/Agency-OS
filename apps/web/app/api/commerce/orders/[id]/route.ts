import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { getOrder, updateOrder } from '@/lib/commerce/orders/admin'
import { respond } from '@/lib/commerce/partners/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const okId = (id: string) => /^[A-Za-z0-9_-]{8,40}$/.test(id)
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  if (!okId(id)) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  return respond(() => getOrder(id))
}

/** PATCH /api/commerce/orders/:id { status?, note?, partnerNotified? } */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!okId(id) || !body) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const session = await auth()
  return respond(() => updateOrder(id, body, session?.user?.id ?? 'unknown'))
}
