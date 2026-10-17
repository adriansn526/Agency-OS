import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { createEntryFromLead } from '@/lib/website/admin/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/website/entries/from-lead?lineId= { leadId, collectionId } → draft entry prefilled from the CRM lead, linked by leadId. */
export async function POST(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => createEntryFromLead(new URL(req.url).searchParams.get('lineId') ?? '', await readJson(req)), 201)
}
