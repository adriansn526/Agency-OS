import { partnerHandler } from '@/lib/website/partner/http'
import { listForPartner } from '@/lib/website/requests/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { plan, items: [{ id, status, category, county, city, description (teaser until accepted), offerRon, customer (only when accepted) … }] } */
export const GET = partnerHandler(async (_req, { entry, businessLineId }) => listForPartner(businessLineId, entry))
