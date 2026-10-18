import { partnerHandler } from '@/lib/website/partner/http'
import { AdminError } from '@/lib/website/admin/errors'
import { addProjectImage } from '@/lib/website/partner/projects'
import { LIMITS } from '@/lib/website/media/process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST multipart: file, alt? (max 12 per project) */
export const POST = partnerHandler<{ id: string }>(async (req, { entry }, { id }) => {
  if (Number(req.headers.get('content-length') ?? 0) > LIMITS.image.maxBytes + 100_000) throw new AdminError('Fișier prea mare', 413)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) throw new AdminError('Lipsește fișierul', 400)
  return addProjectImage(entry, id, Buffer.from(await file.arrayBuffer()), form?.get('alt'))
})
