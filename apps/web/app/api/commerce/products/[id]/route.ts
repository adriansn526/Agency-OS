import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@repo/db'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({ isActive: z.boolean() }).strict()

/** PATCH { isActive } — activates/deactivates a product and all its listings (admin). Deactivated products disappear from the storefront immediately. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!id || id.length > 40 || !parsed.success) return badRequest()
  const { isActive } = parsed.data
  const found = await db.commerceProduct.findUnique({ where: { id }, select: { id: true } })
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.$transaction([
    db.commerceProduct.update({ where: { id }, data: { isActive } }),
    db.commerceListing.updateMany({ where: { productId: id }, data: { isActive } }),
  ])
  return NextResponse.json({ ok: true, isActive })
}
