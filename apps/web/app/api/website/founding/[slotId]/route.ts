import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { respond } from '@/lib/website/admin/errors'
import { assertLine } from '@/lib/website/admin/service'
import { removeSlot } from '@/lib/website/founding/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** DELETE frees one place (e.g. a firm that left): the place can be claimed again. */
export async function DELETE(req: Request, { params }: { params: Promise<{ slotId: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => { const lineId = new URL(req.url).searchParams.get('lineId') ?? ''; await assertLine(lineId); return removeSlot(lineId, (await params).slotId) })
}
