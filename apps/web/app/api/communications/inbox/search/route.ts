import { NextResponse } from 'next/server'
import { searchOwners } from '@/lib/comms/inbox'
import { inboxFail } from '@/lib/comms/inbox-http'

export const dynamic = 'force-dynamic'

// GET ?businessLineId=&q= → leads and clients of the line matching the text
export async function GET(req: Request) {
  try {
    const u = new URL(req.url)
    const bl = u.searchParams.get('businessLineId')
    if (!bl) return NextResponse.json({ data: [] })
    return NextResponse.json({ data: await searchOwners(bl, u.searchParams.get('q') ?? '') })
  } catch (e) { return inboxFail(e) }
}
