import { partnerHandler } from '@/lib/website/partner/http'
import { restoreVersion } from '@/lib/website/layout/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = partnerHandler<{ id: string }>(async (_req, { entry }, { id }) => restoreVersion(entry, id))
