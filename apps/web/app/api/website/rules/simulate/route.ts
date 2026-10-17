import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { simulate } from '@/lib/website/rules/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/website/rules/simulate?lineId= { kind, facts, at? } → { via, rule, action, trace } without changing anything. */
export async function POST(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => simulate(new URL(req.url).searchParams.get('lineId') ?? '', await readJson(req)))
}
