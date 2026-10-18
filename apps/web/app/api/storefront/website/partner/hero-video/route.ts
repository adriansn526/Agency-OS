import { partnerHandler } from '@/lib/website/partner/http'
import { AdminError } from '@/lib/website/admin/errors'
import { clearHeroVideo, uploadHeroVideo } from '@/lib/website/media/service'
import { VIDEO_LIMITS } from '@/lib/website/media/video'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** POST multipart: file (mp4 or webm, max 20 MB). Converted to a short, silent, 1280 px H.264 video with a poster frame; replaces the previous one. */
export const POST = partnerHandler(async (req, { entry, businessLineId }) => {
  if (Number(req.headers.get('content-length') ?? 0) > VIDEO_LIMITS.maxUploadBytes + 200_000) throw new AdminError('Fișier prea mare', 413)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) throw new AdminError('Lipsește fișierul', 400)
  return uploadHeroVideo(businessLineId, entry.id, Buffer.from(await file.arrayBuffer()))
})

/** DELETE removes the hero video (the banner falls back to the cover image). */
export const DELETE = partnerHandler(async (_req, { entry, businessLineId }) => clearHeroVideo(businessLineId, entry.id))
