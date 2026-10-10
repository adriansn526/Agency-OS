import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@repo/db'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'

export const runtime = 'nodejs'

const Body = z.object({ ids: z.array(z.string().min(1).max(40)).min(1).max(200), reviewed: z.boolean() })

/** POST /api/commerce/translations — mark many translations as reviewed (text unchanged, so no product update). */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest()
  const r = await db.commerceTranslation.updateMany({ where: { id: { in: parsed.data.ids } }, data: { reviewed: parsed.data.reviewed } })
  return NextResponse.json({ ok: true, updated: r.count })
}
