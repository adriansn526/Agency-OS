import { partnerHandler } from '@/lib/website/partner/http'
import { removeProjectImage, setProjectImageAlt } from '@/lib/website/partner/projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type P = { id: string; mediaId: string }
export const PATCH = partnerHandler<P>(async (req, { entry }, { id, mediaId }) => setProjectImageAlt(entry, id, mediaId, await req.json().catch(() => null)))
export const DELETE = partnerHandler<P>(async (_req, { entry }, { id, mediaId }) => removeProjectImage(entry, id, mediaId))
