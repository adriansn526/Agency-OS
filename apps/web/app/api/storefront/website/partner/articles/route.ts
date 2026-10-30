import { partnerHandler } from '@/lib/website/partner/http'
import { listArticles } from '@/lib/website/reviews/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { items, canReview, reason }: the articles (afecțiuni) of the doctor's specialty with their text, who reviewed them and the doctor's own review date. Reading is open to every logged-in doctor; confirming needs a published profile with a valid CMR verification (`reason` says what is missing). */
export const GET = partnerHandler(async (_req, { entry }) => listArticles(entry))
