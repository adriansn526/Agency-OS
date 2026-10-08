import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@repo/db'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'

export const runtime = 'nodejs'

const Body = z.object({ categoryId: z.string().min(1).max(40).nullable() })

/** PATCH /api/commerce/group-maps/:id — remap a supplier group to a category (and its products). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest()
  const map = await db.commerceGroupMap.findUnique({ where: { id } })
  if (!map) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const categoryId = parsed.data.categoryId
  if (categoryId && !(await db.commerceCategory.findUnique({ where: { id: categoryId }, select: { id: true } }))) return badRequest('Unknown category')

  await db.commerceGroupMap.update({ where: { id }, data: { categoryId } })
  const products = categoryId
    ? await db.commerceProduct.updateMany({ where: { feedId: map.feedId, groupCode: map.groupCode }, data: { categoryId } })
    : { count: 0 }
  return NextResponse.json({ ok: true, productsUpdated: products.count })
}
