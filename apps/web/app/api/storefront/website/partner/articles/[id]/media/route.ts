import { db } from '@repo/db'
import { partnerHandler } from '@/lib/website/partner/http'
import { AdminError } from '@/lib/website/admin/errors'
import { articleAccess, articleFilesInUse } from '@/lib/website/reviews/service'
import { deleteGalleryImage, uploadEntryImage } from '@/lib/website/media/service'
import { LIMITS } from '@/lib/website/media/process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST multipart: file → the media row ({ id, url, … }) of an image for this article's body. Only verified doctors of the article's specialty. */
export const POST = partnerHandler<{ id: string }>(async (req, { entry }, { id }) => {
  const { article } = await articleAccess(entry, id)
  if (Number(req.headers.get('content-length') ?? 0) > LIMITS.image.maxBytes + 100_000) throw new AdminError('Fișier prea mare', 413)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) throw new AdminError('Lipsește fișierul', 400)
  return uploadEntryImage(entry.businessLineId, article.id, 'image', Buffer.from(await file.arrayBuffer()), { alt: 'cazuistica' })
})

/** DELETE ?id=<media id>: removes an image or video of this article that the body no longer shows (409 while it does). */
export const DELETE = partnerHandler<{ id: string }>(async (req, { entry }, { id }) => {
  const { article } = await articleAccess(entry, id)
  const mid = new URL(req.url).searchParams.get('id') ?? ''
  const m = await db.websiteMedia.findFirst({ where: { id: mid, entryId: article.id, OR: [{ kind: 'image' }, { kind: 'file', alt: { in: ['cazuistica-video', 'cazuistica-poster'] } }] }, select: { url: true } })
  if (!m) throw new AdminError('Fișierul nu există', 404)
  if (articleFilesInUse(article.data).includes(m.url)) throw new AdminError('Fișierul este folosit în articol; scoate-l întâi din text', 409)
  return deleteGalleryImage(entry.businessLineId, article.id, mid)
})
