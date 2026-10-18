import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { callbacksBetween } from '@/lib/crm/calls/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET ?line=<slug>&from=ISO&to=ISO (max 62 days) → { items: scheduled callbacks } */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const line = await db.businessLine.findUnique({ where: { slug: sp.get('line') ?? '' }, select: { id: true } })
  if (!line) return NextResponse.json({ error: 'Linia nu există' }, { status: 404 })
  const from = new Date(sp.get('from') ?? ''), to = new Date(sp.get('to') ?? '')
  if (Number.isNaN(+from) || Number.isNaN(+to) || to <= from || +to - +from > 62 * 86_400_000) return NextResponse.json({ error: 'Interval invalid (maxim 62 de zile)' }, { status: 422 })
  return NextResponse.json({ data: { items: await callbacksBetween(line.id, from, to) } })
}
