import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { respond } from '@/lib/website/admin/errors'
import { adminList, adminRemove } from '@/lib/website/endorsements/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sp = (req: Request) => new URL(req.url).searchParams

/** GET ?lineId=&page= → { total, items[] } */
export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => adminList(sp(req).get('lineId') ?? '', Number(sp(req).get('page')) || 1))
}
/** DELETE ?lineId=&id=&reason= → removes an endorsement; its author cannot make it again. */
export async function DELETE(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth().catch(() => null)
  return respond(async () => adminRemove(sp(req).get('lineId') ?? '', sp(req).get('id') ?? '', sp(req).get('reason') ?? '', { id: session?.user?.id, name: session?.user?.name }))
}
