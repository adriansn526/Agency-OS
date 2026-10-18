import { partnerHandler } from '@/lib/website/partner/http'
import { restoreVersion } from '@/lib/website/pages/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = partnerHandler<{ id: string; versionId: string }>(async (_req, { entry }, { id, versionId }) => restoreVersion(entry, id, versionId))
