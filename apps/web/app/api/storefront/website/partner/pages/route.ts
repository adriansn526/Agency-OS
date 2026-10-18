import { partnerHandler } from '@/lib/website/partner/http'
import { createPage, listPages } from '@/lib/website/pages/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { policy: { canCreate, max, reason }, items: [{ id, title, slug, status, updatedAt }] } */
export const GET = partnerHandler(async (_req, { entry }) => listPages(entry))
/** POST { title } → a new draft page (abonament only, max 5). */
export const POST = partnerHandler(async (req, { entry }) => createPage(entry, await req.json().catch(() => null)))
