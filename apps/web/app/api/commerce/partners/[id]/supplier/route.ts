import { NextResponse } from 'next/server'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { respond } from '@/lib/commerce/partners/http'
import { linkPartnerSupplier, unlinkPartnerSupplier } from '@/lib/commerce/partners/supplier-link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const okId = (id: string) => /^[A-Za-z0-9_-]{8,40}$/.test(id)
type Ctx = { params: Promise<{ id: string }> }

/** POST /api/commerce/partners/:id/supplier { supplierId } | { create: { name?, cui?, iban?, vatRegime? } } — link or create the accounting supplier. */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!okId(id) || !body) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  return respond(() => linkPartnerSupplier(id, body), 201)
}

/** DELETE /api/commerce/partners/:id/supplier — unlink (the supplier itself is kept). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  if (!okId(id)) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  return respond(() => unlinkPartnerSupplier(id))
}
