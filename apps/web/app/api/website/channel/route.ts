import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { enableChannel, getOverview, updateChannel } from '@/lib/website/admin/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''

/** GET /api/website/channel?lineId= → module status, keys (no hashes) and counts. Admin only. */
export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(() => getOverview(lineOf(req)))
}
/** POST /api/website/channel?lineId= { siteUrl? } → enables the module for the line (idempotent). */
export async function POST(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => enableChannel(lineOf(req), await readJson(req).catch(() => ({}))), 201)
}
/** PATCH /api/website/channel?lineId= { siteUrl?, isEnabled? } */
export async function PATCH(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => updateChannel(lineOf(req), await readJson(req)))
}
