import { websiteHandler } from '@/lib/website/storefront/auth'
import { optOut } from '@/lib/website/optout'
import { jsonOut } from '@/lib/website/partner/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { identifier: email | phone } → always { ok: true }: nobody can learn whether an address is in the CRM. Server-to-server (ws_ key). */
export const POST = websiteHandler(async (req, ctx) => {
  const body = (await req.json().catch(() => null)) as { identifier?: unknown } | null
  try { await optOut(ctx.businessLineId, body?.identifier) } catch (e) { console.error('[optout]', e instanceof Error ? e.message : e) }
  return jsonOut({ ok: true })
})
