import { db } from '@repo/db'
import { partnerHandler } from '@/lib/website/partner/http'
import { respond } from '@/lib/website/requests/service'
import { brandNameOf } from '@/lib/website/brand'
import { defaultNotifier } from '@/lib/website/partner/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { action: 'accept' | 'decline' } → { state: accepted | declined | full | expired …, request } (accepting reveals the customer's contact data and records the fee). */
export const POST = partnerHandler<{ id: string }>(async (req, ctx, { id }) => {
  const { entry, businessLineId } = ctx
  const line = await db.businessLine.findUnique({ where: { id: businessLineId }, select: { slug: true } })
  return respond(businessLineId, entry, id, await req.json().catch(() => null), { notifier: defaultNotifier(line?.slug), brandName: await brandNameOf(ctx) })
})
