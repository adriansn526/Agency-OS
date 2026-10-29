import { partnerHandler } from '@/lib/website/partner/http'
import { createInvite } from '@/lib/website/endorsements/invites'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { name?, servicii?, note?, showName? } → { id, code, expiresAt }: a personal invitation for a colleague without a profile (the code is returned once). */
export const POST = partnerHandler(async (req, { entry }) => createInvite(entry, await req.json().catch(() => null)))
