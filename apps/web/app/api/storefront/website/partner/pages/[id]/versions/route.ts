import { partnerHandler } from '@/lib/website/partner/http'
import { listVersions } from '@/lib/website/pages/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = partnerHandler<{ id: string }>(async (_req, { entry }, { id }) => ({ items: await listVersions(entry, id) }))
