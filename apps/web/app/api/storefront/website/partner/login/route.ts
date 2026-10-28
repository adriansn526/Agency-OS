import { websiteHandler } from '@/lib/website/storefront/auth'
import { requestLogin } from '@/lib/website/partner/auth'
import { brandNameOf } from '@/lib/website/brand'
import { defaultNotifier, siteUrlOf } from '@/lib/website/partner/notify'
import { jsonOut } from '@/lib/website/partner/http'
import { db } from '@repo/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { identifier: email | phone } → always { ok: true }; a link (email) or a code (SMS) is sent when a profile with partner access matches. */
export const POST = websiteHandler(async (req, ctx) => {
  const body = (await req.json().catch(() => null)) as { identifier?: unknown } | null
  const line = await db.businessLine.findUnique({ where: { id: ctx.businessLineId }, select: { slug: true } })
  const channel = await db.websiteChannel.findUnique({ where: { id: ctx.channelId }, select: { siteUrl: true } })
  try {
    await requestLogin(ctx.businessLineId, body?.identifier, { notifier: defaultNotifier(line?.slug), siteUrl: siteUrlOf(ctx.siteUrl ?? channel?.siteUrl), brandName: await brandNameOf(ctx) })
  } catch (e) {
    console.error('[partner-login]', e instanceof Error ? e.message : e) // never tell the caller whether anything matched or failed
  }
  return jsonOut({ ok: true })
})
