import { partnerHandler } from '@/lib/website/partner/http'
import { AdminError } from '@/lib/website/admin/errors'
import { articleAccess } from '@/lib/website/reviews/service'
import { CASE_VIDEO_LIMITS, caseVideoJob, startCaseVideo } from '@/lib/website/media/case-video'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST multipart: file (mp4 or mov, max 90 MB) → { jobId }: a video for this article's body, converted in the background (no sound, poster frame). */
export const POST = partnerHandler<{ id: string }>(async (req, { entry }, { id }) => {
  const { article } = await articleAccess(entry, id)
  if (Number(req.headers.get('content-length') ?? 0) > CASE_VIDEO_LIMITS.maxUploadBytes + 300_000) throw new AdminError('Fișier prea mare', 413)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) throw new AdminError('Lipsește fișierul', 400)
  return { jobId: await startCaseVideo(entry.businessLineId, article.id, Buffer.from(await file.arrayBuffer())) }
})

/** GET ?job=<id> → { status, error?, result? }; 404 when the job is unknown (e.g. after a restart). */
export const GET = partnerHandler<{ id: string }>(async (req, { entry }, { id }) => {
  const { article } = await articleAccess(entry, id)
  const job = new URL(req.url).searchParams.get('job') ?? ''
  const s = /^[a-f0-9]{20}$/.test(job) ? caseVideoJob(article.id, job) : null
  if (!s) throw new AdminError('Procesarea nu mai există. Încarcă videoul din nou.', 404)
  return s
})
