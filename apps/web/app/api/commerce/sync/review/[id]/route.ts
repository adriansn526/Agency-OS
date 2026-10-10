import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'
import { decideReview } from '@/lib/commerce/sync/review'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({ action: z.enum(['approve', 'reject']) })

/** POST /api/commerce/sync/review/:id { action } — approve or reject a queued price move / new article (admin only). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success || !/^[a-z0-9]{10,40}$/i.test(id)) return badRequest()
  const session = await auth()
  const r = await decideReview(id, parsed.data.action, session?.user?.id ?? 'unknown')
  return NextResponse.json(r, { status: r.ok ? 200 : 409 })
}
