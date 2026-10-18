import { partnerHandler } from '@/lib/website/partner/http'
import { getLayout, resetLayout, saveLayout } from '@/lib/website/layout/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { layout, customized, catalog }; PUT { blocks } saves (live at once); DELETE goes back to the default layout. */
export const GET = partnerHandler(async (_req, { entry }) => getLayout(entry))
export const PUT = partnerHandler(async (req, { entry }) => saveLayout(entry, await req.json().catch(() => null)))
export const DELETE = partnerHandler(async (_req, { entry }) => resetLayout(entry))
