import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { createEntry, listEntries } from '@/lib/website/admin/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/website/entries?lineId=&collectionId=&status=&q=&page= */
export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const sp = new URL(req.url).searchParams
  return respond(() => listEntries(sp.get('lineId') ?? '', {
    collectionId: sp.get('collectionId') ?? undefined, leadId: sp.get('leadId') ?? undefined, status: sp.get('status') ?? undefined,
    q: sp.get('q')?.slice(0, 100) || undefined, page: Number(sp.get('page')) || 1,
  }))
}
export async function POST(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => createEntry(new URL(req.url).searchParams.get('lineId') ?? '', await readJson(req)), 201)
}
