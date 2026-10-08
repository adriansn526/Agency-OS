import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'
import { RulePatch } from '@/lib/commerce/schemas'

export const runtime = 'nodejs'

/** PATCH /api/commerce/pricing-rules/:id */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const parsed = RulePatch.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest()
  const exists = await db.commercePricingRule.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const rule = await db.commercePricingRule.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ rule })
}

/** DELETE /api/commerce/pricing-rules/:id */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const r = await db.commercePricingRule.deleteMany({ where: { id } })
  if (!r.count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
