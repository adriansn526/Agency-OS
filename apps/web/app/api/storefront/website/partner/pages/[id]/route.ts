import { partnerHandler } from '@/lib/website/partner/http'
import { deletePage, getPage, updatePage } from '@/lib/website/pages/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → the page with its layout (v2), the block catalog and the firm's images to pick from. */
export const GET = partnerHandler<{ id: string }>(async (_req, { entry }, { id }) => getPage(entry, id))
/** PATCH { title?, seoTitle?, seoDescription?, layout?, status?: 'draft' | 'published' } → validated against the catalog; a changed layout becomes a version. */
export const PATCH = partnerHandler<{ id: string }>(async (req, { entry }, { id }) => updatePage(entry, id, await req.json().catch(() => null)))
export const DELETE = partnerHandler<{ id: string }>(async (_req, { entry }, { id }) => deletePage(entry, id))
