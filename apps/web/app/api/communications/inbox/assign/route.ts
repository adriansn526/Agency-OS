import { NextResponse } from 'next/server'
import { assignThread } from '@/lib/comms/inbox'
import { inboxFail } from '@/lib/comms/inbox-http'

export const dynamic = 'force-dynamic'

// POST { threadId, leadId | clientId } → attach the conversation to an existing lead/client of the same line
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    return NextResponse.json({ data: await assignThread(String(b.threadId ?? ''), { leadId: b.leadId || undefined, clientId: b.clientId || undefined }) })
  } catch (e) { return inboxFail(e) }
}
