import { partnerHandler } from '@/lib/website/partner/http'
import { setVisibility, withdraw } from '@/lib/website/endorsements/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** PATCH { showName } → agree (or not) to be named on the colleague's profile. */
export const PATCH = partnerHandler<{ id: string }>(async (req, { entry }, { id }) => setVisibility(entry, id, await req.json().catch(() => null)))
/** DELETE → withdraws the recommendation. */
export const DELETE = partnerHandler<{ id: string }>(async (_req, { entry }, { id }) => withdraw(entry, id))
