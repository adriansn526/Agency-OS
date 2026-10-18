import { partnerHandler } from '@/lib/website/partner/http'
import { deleteGalleryImage, updateGalleryAlt } from '@/lib/website/media/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type P = { mediaId: string }
export const PATCH = partnerHandler<P>(async (req, { entry, businessLineId }, { mediaId }) => {
  const m = await updateGalleryAlt(businessLineId, entry.id, mediaId, await req.json().catch(() => null))
  return { id: m.id, alt: m.alt }
})
export const DELETE = partnerHandler<P>(async (_req, { entry, businessLineId }, { mediaId }) => deleteGalleryImage(businessLineId, entry.id, mediaId))
