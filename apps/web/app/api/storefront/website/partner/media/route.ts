import { partnerHandler } from '@/lib/website/partner/http'
import { AdminError } from '@/lib/website/admin/errors'
import { db } from '@repo/db'
import { caseImagesInUse } from '@/lib/website/partner/profile'
import { clearEntryImage, deleteGalleryImage, uploadEntryImage } from '@/lib/website/media/service'
import { LIMITS, type ImageKind } from '@/lib/website/media/process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST multipart: file, kind = logo | cover | image, alt? */
export const POST = partnerHandler(async (req, { entry, businessLineId }) => {
  if (Number(req.headers.get('content-length') ?? 0) > LIMITS.image.maxBytes + 100_000) throw new AdminError('Fișier prea mare', 413)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file'), kind = String(form?.get('kind') ?? '')
  if (!(file instanceof File)) throw new AdminError('Lipsește fișierul', 400)
  if (!['logo', 'cover', 'image'].includes(kind)) throw new AdminError('kind trebuie să fie logo, cover sau image', 400)
  const r = await uploadEntryImage(businessLineId, entry.id, kind as ImageKind, Buffer.from(await file.arrayBuffer()), { alt: form?.get('alt') })
  return r
})

/** DELETE ?kind=logo|cover, or ?id=<media id> for a gallery image (refused while a case still shows it) */
export const DELETE = partnerHandler(async (req, { entry, businessLineId }) => {
  const q = new URL(req.url).searchParams, id = q.get('id')
  if (id) {
    const m = await db.websiteMedia.findFirst({ where: { id, entryId: entry.id, kind: 'image' }, select: { url: true } })
    if (!m) throw new AdminError('Imaginea nu există', 404)
    if (caseImagesInUse(entry.data).includes(m.url)) throw new AdminError('Imaginea este folosită într-un caz; scoate-o întâi din caz', 409)
    return deleteGalleryImage(businessLineId, entry.id, id)
  }
  const kind = q.get('kind')
  if (kind !== 'logo' && kind !== 'cover') throw new AdminError('kind trebuie să fie logo sau cover', 400)
  return clearEntryImage(businessLineId, entry.id, kind)
})
