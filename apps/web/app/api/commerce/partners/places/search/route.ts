import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'
import { runSearch } from '@/lib/commerce/partners/leads'
import { respondPlaces } from '@/lib/commerce/partners/places-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({ query: z.string().min(3).max(150), pages: z.number().int().min(1).max(3).default(1) })

/** POST /api/commerce/partners/places/search { query, pages } — Google Places text search (billable; capped per day). */
export async function POST(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Căutare invalidă' }, { status: 400 })
  const session = await auth()
  return respondPlaces(() => runSearch(parsed.data.query, parsed.data.pages, session?.user?.id ?? null))
}
