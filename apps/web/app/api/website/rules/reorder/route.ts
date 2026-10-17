import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { reorderRules } from '@/lib/website/rules/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/website/rules/reorder?lineId= { kind, ids[] } → ids must be exactly the rules of that kind, in the new order. */
export async function POST(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth()
  return respond(async () => reorderRules(new URL(req.url).searchParams.get('lineId') ?? '', session?.user?.id ?? null, await readJson(req)))
}
