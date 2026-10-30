import { partnerHandler } from '@/lib/website/partner/http'
import { listArticles } from '@/lib/website/reviews/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → articles (afecțiuni) of the doctor's specialty with their text, who reviewed them and the doctor's own review date; 403 until published with a valid CMR verification. */
export const GET = partnerHandler(async (_req, { entry }) => ({ items: await listArticles(entry) }))
