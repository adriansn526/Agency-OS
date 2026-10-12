import { NextResponse } from 'next/server'
import { InboxError } from '@/lib/comms/inbox'

export const dynamic = 'force-dynamic'

export function inboxFail(e: unknown) {
  if (e instanceof InboxError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status })
  console.error('[inbox]', e)
  return NextResponse.json({ error: 'Eroare internă' }, { status: 500 })
}
