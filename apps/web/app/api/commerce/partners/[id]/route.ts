import { NextResponse } from 'next/server'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { respond } from '@/lib/commerce/partners/http'
import { deletePartner, updatePartner } from '@/lib/commerce/partners/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }
const okId = (id: string) => /^[A-Za-z0-9-]{10,40}$/.test(id)

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!okId(id) || !body) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  return respond(() => updatePartner(id, body))
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  if (!okId(id)) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  return respond(() => deletePartner(id))
}
