import { NextResponse } from 'next/server'
import { listInbox, inboxCount } from '@/lib/comms/inbox'
import { inboxFail } from '@/lib/comms/inbox-http'

export const dynamic = 'force-dynamic'

// GET /api/communications/inbox?businessLineId=&mailbox=&q=&archived=1 → unassigned inbound conversations; ?count=1 → number of open ones
export async function GET(req: Request) {
  try {
    const u = new URL(req.url)
    if (u.searchParams.get('count')) return NextResponse.json({ count: await inboxCount() })
    return NextResponse.json({
      data: await listInbox({ businessLineId: u.searchParams.get('businessLineId') || undefined, mailbox: u.searchParams.get('mailbox') || undefined, q: u.searchParams.get('q') || undefined, archived: u.searchParams.get('archived') === '1' }),
    })
  } catch (e) { return inboxFail(e) }
}
