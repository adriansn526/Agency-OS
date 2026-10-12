import { NextResponse } from 'next/server'
import { createLeadFromThread } from '@/lib/comms/inbox'
import { inboxFail } from '@/lib/comms/inbox-http'

export const dynamic = 'force-dynamic'

// POST { threadId, entityType?, companyName?, contactPerson?, phone?, notes? } → new lead from the sender, conversation attached
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    return NextResponse.json({ data: await createLeadFromThread(String(b.threadId ?? ''), b) }, { status: 201 })
  } catch (e) { return inboxFail(e) }
}
