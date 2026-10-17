import { websiteHandler } from '@/lib/website/storefront/auth'
import { listEntries } from '@/lib/website/storefront/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/storefront/website/entries?collection=companii[&q=&county=&city=&verified=1&featured=1&sort=featured|name|rating|new&page=&limit=<=50&f.<field>=<value>&facet=county]
 * Published entries of one collection. `f.<field>` only works for collection fields flagged `filterable`.
 * `f.<list field>=<v>` matches entries whose list contains v. `facet=county` adds `facets.county: [{ value, count }]` (counts ignore the county filter).
 * → { collection, total, page, limit, pages, items: [...] }
 */
export const GET = websiteHandler(async (req, ctx) => listEntries(ctx, new URL(req.url).searchParams))
