import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { auth } from '@/lib/auth'
import { deleteReview, moderateReview } from '@/lib/website/admin/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''
type Ctx = { params: Promise<{ id: string }> }

/** PATCH { status: approved|rejected|pending } — recomputes the entry's rating from approved reviews. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth()
  return respond(async () => moderateReview(lineOf(req), (await params).id, session?.user?.id ?? null, await readJson(req)))
}
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => deleteReview(lineOf(req), (await params).id))
}
