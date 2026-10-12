import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { syncMailbox } from '@/lib/mail/imap-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST → fetch new mail of this mailbox now (read-only on the server); the same lock as the background sync applies
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; purpose: string }> }) {
  const { id, purpose } = await params
  const m = await db.businessLineMailbox.findUnique({ where: { businessLineId_purpose: { businessLineId: id, purpose } }, select: { id: true } })
  if (!m) return NextResponse.json({ error: 'Căsuța nu există' }, { status: 404 })
  return NextResponse.json(await syncMailbox(m.id, { force: true }))
}
