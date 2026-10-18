import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { dueCallbacks, queueCounts, uncalled } from '@/lib/crm/calls/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET ?line=<slug>&limit=&offset= → { due: [callbacks due now], uncalled: { items, total }, counts } */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const line = await db.businessLine.findUnique({ where: { slug: sp.get('line') ?? '' }, select: { id: true } })
  if (!line) return NextResponse.json({ error: 'Linia nu există' }, { status: 404 })
  const limit = Math.min(200, Math.max(1, Number(sp.get('limit')) || 50)), offset = Math.max(0, Number(sp.get('offset')) || 0)
  const [due, fresh, counts] = await Promise.all([dueCallbacks(line.id), uncalled(line.id, limit, offset), queueCounts(line.id)])
  return NextResponse.json({ data: { due, uncalled: fresh, counts } })
}
