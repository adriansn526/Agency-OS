import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'
import { RuleBody } from '@/lib/commerce/schemas'

export const runtime = 'nodejs'

/** GET /api/commerce/pricing-rules?bl=<id> */
export async function GET(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const bl = new URL(req.url).searchParams.get('bl')
  if (!bl || bl.length > 40) return badRequest()
  const rules = await db.commercePricingRule.findMany({
    where: { businessLineId: bl },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: { category: { select: { nameRo: true } }, _count: { select: { listings: true } } },
  })
  return NextResponse.json({ rules })
}

/** POST /api/commerce/pricing-rules */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const parsed = RuleBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest()
  const rule = await db.commercePricingRule.create({ data: parsed.data })
  return NextResponse.json({ rule }, { status: 201 })
}
