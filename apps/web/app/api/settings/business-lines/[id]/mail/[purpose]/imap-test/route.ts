import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { testImap } from '@/lib/mail/imap-sync'

export const dynamic = 'force-dynamic'

// POST → connects with the SAVED IMAP settings and reports the folder's message count; stores nothing
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; purpose: string }> }) {
  const { id, purpose } = await params
  const m = await db.businessLineMailbox.findUnique({ where: { businessLineId_purpose: { businessLineId: id, purpose } }, select: { id: true } })
  if (!m) return NextResponse.json({ ok: false, error: 'Salvează mai întâi căsuța' }, { status: 404 })
  const r = await testImap(m.id)
  return NextResponse.json(r, { status: r.ok ? 200 : 422 })
}
