import { websiteHandler } from '@/lib/website/storefront/auth'
import { listEntries } from '@/lib/website/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/storefront/website/entries?collection=companii[&q=&county=&city=&verified=1&featured=1&sort=featured|name|rating|new&page=&limit=<=50&f.<field>=<value>]
 * Published entries of one collection. `f.<field>` only works for collection fields flagged `filterable`.
 * → { collection, total, page, limit, pages, items: [...] }
 */
export const GET = websiteHandler(async (req, ctx) => listEntries(ctx, new URL(req.url).searchParams))
