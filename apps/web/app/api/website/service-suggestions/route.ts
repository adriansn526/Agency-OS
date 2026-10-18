import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { respond } from '@/lib/website/admin/errors'
import { assertLine } from '@/lib/website/admin/service'
import { pendingSuggestions } from '@/lib/website/partner/suggestions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => { const lineId = new URL(req.url).searchParams.get('lineId') ?? ''; await assertLine(lineId); return { items: await pendingSuggestions(lineId) } })
}
