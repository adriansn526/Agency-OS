import { websiteHandler } from '@/lib/website/storefront/auth'
import { verifyLogin } from '@/lib/website/partner/auth'
import { jsonOut } from '@/lib/website/partner/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { token } (emailed link) or { identifier, code } (SMS) → { sessionToken, expiresAt } or 401. */
export const POST = websiteHandler(async (req, ctx) => {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const s = await verifyLogin(ctx.businessLineId, body ?? {}, { userAgent: typeof body?.userAgent === 'string' ? body.userAgent : undefined, ip: typeof body?.ip === 'string' ? body.ip : undefined })
  return s ? jsonOut({ sessionToken: s.sessionToken, expiresAt: s.expiresAt.toISOString() }) : jsonOut({ error: 'invalid_or_expired' }, 401)
})
