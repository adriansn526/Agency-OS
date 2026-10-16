import { websiteHandler } from '@/lib/website/storefront/auth'
import { listCollections } from '@/lib/website/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/storefront/website/collections → { items: [{ key, name, namePlural, kind, fields, total }] } */
export const GET = websiteHandler(async (_req, ctx) => listCollections(ctx))
