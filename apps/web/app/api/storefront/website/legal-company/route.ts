import { websiteHandler } from '@/lib/website/storefront/auth'
import { legalCompanyFor } from '@/lib/website/legal/company'
import { readSettings } from '@/app/api/settings/_store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { name, cui, reg, address, email } of the company that runs this line's website (public business data, for the legal pages). */
export const GET = websiteHandler(async (_req, ctx) => legalCompanyFor(ctx.businessLineId, readSettings().company))
