import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { createRule, listRules } from '@/lib/website/rules/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sp = (req: Request) => new URL(req.url).searchParams

/** GET /api/website/rules?lineId=&kind= → { limits, items } ordered by kind and priority. Admin only. */
export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(() => listRules(sp(req).get('lineId') ?? '', sp(req).get('kind') ?? undefined))
}
/** POST /api/website/rules?lineId= { kind, name, conditions[], action, priority?, isActive?, validFrom?, validTo? } */
export async function POST(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth()
  return respond(async () => createRule(sp(req).get('lineId') ?? '', session?.user?.id ?? null, await readJson(req)), 201)
}
