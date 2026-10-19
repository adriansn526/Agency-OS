import { websiteHandler } from '@/lib/website/storefront/auth'
import { getPublicPage } from '@/lib/website/pages/public'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/website/pages/<firm>/<page> → { firm, page, layout (v2), media } · 404 when missing, a draft, or the firm is not published. */
export const GET = websiteHandler<{ firm: string; page: string }>(async (_req, ctx, p) => getPublicPage(ctx, p.firm, p.page))
