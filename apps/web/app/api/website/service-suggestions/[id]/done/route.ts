import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { respond } from '@/lib/website/admin/errors'
import { assertLine } from '@/lib/website/admin/service'
import { markDone } from '@/lib/website/partner/suggestions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => { const lineId = new URL(req.url).searchParams.get('lineId') ?? ''; await assertLine(lineId); return markDone(lineId, (await params).id) })
}
