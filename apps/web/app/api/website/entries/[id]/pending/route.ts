import { z } from 'zod'
import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { approvePending, getPending, rejectPending } from '@/lib/website/partner/pending'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''

/** GET ?lineId= → { proposed, at, live, titles }: what the doctor proposed next to what is live. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => getPending(lineOf(req), (await params).id))
}
/** POST ?lineId= { action: 'approve' | 'reject', reason? } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth().catch(() => null)
  return respond(async () => {
    const b = z.object({ action: z.enum(['approve', 'reject']), reason: z.string().trim().max(300).optional() }).strict().parse(await readJson(req))
    const user = { id: session?.user?.id, name: session?.user?.name }
    return b.action === 'approve' ? approvePending(lineOf(req), (await params).id, user) : rejectPending(lineOf(req), (await params).id, user, b.reason)
  })
}
