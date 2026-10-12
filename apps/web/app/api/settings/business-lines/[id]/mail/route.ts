import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { publicView } from '@/lib/mail/business-line-mail'

export const dynamic = 'force-dynamic'

// GET /api/settings/business-lines/[id]/mail → the line's mailboxes (never passwords)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await db.businessLineMailbox.findMany({ where: { businessLineId: id }, orderBy: { purpose: 'asc' } })
  return NextResponse.json({ data: rows.map(publicView) })
}
