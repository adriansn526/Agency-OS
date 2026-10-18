import { partnerHandler } from '@/lib/website/partner/http'
import { listVersions } from '@/lib/website/layout/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = partnerHandler(async (_req, { entry }) => ({ items: await listVersions(entry.id) }))
