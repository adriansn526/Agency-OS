import { partnerHandler } from '@/lib/website/partner/http'
import { answerArticle } from '@/lib/website/reviews/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { action: 'confirm' } | { action: 'withdraw' } | { action: 'suggest', note } → { status }. Confirming puts the doctor's name on the article as its medical reviewer. */
export const POST = partnerHandler<{ id: string }>(async (req, { entry }, { id }) => answerArticle(entry, id, await req.json().catch(() => null)))
