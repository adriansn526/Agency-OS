import { ZodError } from 'zod'
import { db } from '@repo/db'
import { websiteHandler } from '@/lib/website/storefront/auth'
import { signupDoctor } from '@/lib/website/endorsements/invites'
import { AdminError } from '@/lib/website/admin/errors'
import { brandNameOf } from '@/lib/website/brand'
import { siteUrlOf } from '@/lib/website/partner/notify'
import { jsonOut } from '@/lib/website/partner/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { name, specialty, phone, email, city?, parafa?, consent, invitedBy? } → { ok: true }: a doctor asks for a profile. Creates a private profile, a CRM lead and sends the login link to the email. */
export const POST = websiteHandler(async (req, ctx) => {
  const body = (await req.json().catch(() => null)) as (Record<string, unknown> & { invitedBy?: unknown }) | null
  const channel = await db.websiteChannel.findUnique({ where: { id: ctx.channelId }, select: { siteUrl: true } })
  try {
    const { invitedBy, ...form } = body ?? {}
    return jsonOut(await signupDoctor(ctx.businessLineId, form, { siteUrl: siteUrlOf(ctx.siteUrl ?? channel?.siteUrl), brandName: await brandNameOf(ctx), invitedBy: typeof invitedBy === 'string' ? invitedBy : undefined }), 201)
  } catch (e) {
    if (e instanceof AdminError) return jsonOut({ error: e.message, details: e.details }, e.status)
    if (e instanceof ZodError) return jsonOut({ error: 'invalid', issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, 422)
    throw e
  }
})
