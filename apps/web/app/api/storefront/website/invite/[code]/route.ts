import { websiteHandler } from '@/lib/website/storefront/auth'
import { lookupInvite, registerInvitee } from '@/lib/website/endorsements/invites'
import { AdminError } from '@/lib/website/admin/errors'
import { ZodError } from 'zod'
import { brandNameOf } from '@/lib/website/brand'
import { defaultNotifier, siteUrlOf } from '@/lib/website/partner/notify'
import { jsonOut } from '@/lib/website/partner/http'
import { db } from '@repo/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { state: invalid | expired | used } or { state: 'ok', invite: { inviterName?, areas, note?, … } } */
export const GET = websiteHandler<{ code: string }>(async (_req, ctx, { code }) => jsonOut(await lookupInvite(ctx.businessLineId, code)))

/** POST { name, specialty, phone, email, city?, parafa?, consent } → { ok: true }: creates the private profile and sends the login link to the email. */
export const POST = websiteHandler<{ code: string }>(async (req, ctx, { code }) => {
  const channel = await db.websiteChannel.findUnique({ where: { id: ctx.channelId }, select: { siteUrl: true } })
  try {
    return jsonOut(await registerInvitee(ctx.businessLineId, code, await req.json().catch(() => null), { siteUrl: siteUrlOf(ctx.siteUrl ?? channel?.siteUrl), brandName: await brandNameOf(ctx) }))
  } catch (e) {
    if (e instanceof AdminError) return jsonOut({ error: e.message, details: e.details }, e.status)
    if (e instanceof ZodError) return jsonOut({ error: 'invalid', issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, 422)
    throw e
  }
})
