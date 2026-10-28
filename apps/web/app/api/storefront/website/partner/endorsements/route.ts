import { partnerHandler } from '@/lib/website/partner/http'
import { endorse, listMine } from '@/lib/website/endorsements/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { given[], received: { total, counted }, limit: { used, max, windowDays } } */
export const GET = partnerHandler(async (_req, { entry }) => listMine(entry))
/** POST { slug, note?, showName? } → recommends a colleague (needs a valid CMR verification); 403 without one, 429 over the monthly limit. */
export const POST = partnerHandler(async (req, { entry }) => endorse(entry, await req.json().catch(() => null)))
