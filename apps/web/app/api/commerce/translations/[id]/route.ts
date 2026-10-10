import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@repo/db'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'

export const runtime = 'nodejs'

const Body = z.object({ text: z.string().trim().min(2).max(300).optional(), reviewed: z.boolean().optional() })

/** PATCH /api/commerce/translations/:id — edit/approve a translation and propagate it to products. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest()
  const t = await db.commerceTranslation.findUnique({ where: { id } })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const text = parsed.data.text ?? t.text
  const updated = await db.commerceTranslation.update({
    where: { id },
    data: {
      text,
      reviewed: parsed.data.reviewed ?? true,
      ...(parsed.data.text && parsed.data.text !== t.text ? { source: 'manual' } : {}),
    },
  })
  // Propagate to all products sharing this source name (listing slugs stay stable for SEO).
  if (text === t.text) return NextResponse.json({ ok: true, translation: updated, productsUpdated: 0 })
  const products = await db.$executeRaw`
    UPDATE "CommerceProduct" SET "nameRo" = ${text}, "nameRoSource" = ${updated.source}, "updatedAt" = now()
    WHERE md5(lower("nameEn")) = ${t.hash} AND ("nameRo" IS DISTINCT FROM ${text})`
  return NextResponse.json({ ok: true, translation: updated, productsUpdated: products })
}
