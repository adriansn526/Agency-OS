import { NextResponse } from 'next/server'
import { archiveThread } from '@/lib/comms/inbox'
import { inboxFail } from '@/lib/comms/inbox-http'

export const dynamic = 'force-dynamic'

// POST { threadId, archived } → hide/restore a conversation (spam, irrelevant); nothing is deleted
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    return NextResponse.json({ data: await archiveThread(String(b.threadId ?? ''), b.archived !== false) })
  } catch (e) { return inboxFail(e) }
}
