import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'
import { ChannelPatch } from '@/lib/commerce/schemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ businessLineId: string }> }

/** PATCH /api/commerce/channels/:businessLineId — pricing settings of a commerce channel (admin only). Does NOT reprice listings. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { businessLineId } = await params
  if (!businessLineId || businessLineId.length > 40) return badRequest()
  const parsed = ChannelPatch.safeParse(await req.json().catch(() => null))
  if (!parsed.success || Object.keys(parsed.data).length === 0) return badRequest('Valori invalide')
  const exists = await db.commerceChannel.findUnique({ where: { businessLineId }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const channel = await db.commerceChannel.update({ where: { businessLineId }, data: parsed.data })
  return NextResponse.json({ channel })
}
