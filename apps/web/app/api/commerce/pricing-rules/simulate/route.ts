import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@repo/db'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'
import { computePrice, type PricingRuleInput, type PricingChannel } from '@/lib/commerce/pricing'
import { getFxRates } from '@/lib/commerce/bnr'

export const runtime = 'nodejs'

const Body = z.object({
  businessLineId: z.string().min(1).max(40),
  costPrice: z.number().min(0),
  costCurrency: z.string().max(3),
  categoryId: z.string().nullable().default(null),
  brand: z.string().nullable().default(null),
  quality: z.string().nullable().default(null),
  bulkyClass: z.string().nullable().default(null),
  competitorMinRon: z.number().nullable().default(null),
})

/** POST /api/commerce/pricing-rules/simulate */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest()

  const { businessLineId, ...product } = parsed.data
  const channel = await db.commerceChannel.findUnique({ where: { businessLineId } })
  if (!channel) return badRequest('Channel not found')

  const fx = await getFxRates()
  const cats = await db.commerceCategory.findMany({ select: { id: true, parentId: true } })
  const desc = new Map<string, string[]>() // naive descendants
  for (const c of cats) {
    const list = [c.id]
    for (let i = 0; i < list.length; i++) {
      for (const child of cats) if (child.parentId === list[i]) list.push(child.id)
    }
    desc.set(c.id, list)
  }

  const rulesRaw = await db.commercePricingRule.findMany({
    where: { businessLineId, isActive: true },
    orderBy: { priority: 'desc' },
  })
  const rules: PricingRuleInput[] = rulesRaw.map((r) => ({
    id: r.id, priority: r.priority, brand: r.brand, quality: r.quality, markupPct: Number(r.markupPct),
    categoryIds: r.categoryId ? desc.get(r.categoryId) ?? [r.categoryId] : null,
    costMin: r.costMin != null ? Number(r.costMin) : null,
    costMax: r.costMax != null ? Number(r.costMax) : null,
    minMarginRon: r.minMarginRon != null ? Number(r.minMarginRon) : null,
    bulkySurchargeRon: Number(r.bulkySurchargeRon),
    competitorUndercutRon: r.competitorUndercutRon != null ? Number(r.competitorUndercutRon) : null,
  }))

  const ch: PricingChannel = {
    vatRate: Number(channel.vatRate), transportPct: Number(channel.transportPct),
    defaultMarkupPct: Number(channel.defaultMarkupPct), minMarginRon: Number(channel.minMarginRon),
    roundingMode: channel.roundingMode,
  }

  const res = computePrice({ ...product, manualPriceRon: null }, ch, rules, fx)
  return NextResponse.json({ result: res, eurRate: fx.EUR })
}
