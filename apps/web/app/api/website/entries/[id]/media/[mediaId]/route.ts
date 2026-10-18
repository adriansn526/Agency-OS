import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { deleteGalleryImage, updateGalleryAlt } from '@/lib/website/media/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''
type Ctx = { params: Promise<{ id: string; mediaId: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => { const p = await params; return updateGalleryAlt(lineOf(req), p.id, p.mediaId, await readJson(req)) })
}
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => { const p = await params; return deleteGalleryImage(lineOf(req), p.id, p.mediaId) })
}
