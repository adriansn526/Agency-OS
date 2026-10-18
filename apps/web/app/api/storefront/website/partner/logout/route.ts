import { websiteHandler } from '@/lib/website/storefront/auth'
import { logout } from '@/lib/website/partner/auth'
import { jsonOut, SESSION_HEADER } from '@/lib/website/partner/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = websiteHandler(async (req) => { await logout(req.headers.get(SESSION_HEADER)); return jsonOut({ ok: true }) })
