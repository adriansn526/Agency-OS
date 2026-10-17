import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { respond } from '@/lib/website/admin/errors'
import { listAudit } from '@/lib/website/rules/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/website/rules/audit?lineId=&ruleId=&page= → change history, newest first. */
export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const sp = new URL(req.url).searchParams
  return respond(() => listAudit(sp.get('lineId') ?? '', { ruleId: sp.get('ruleId') ?? undefined, page: Number(sp.get('page')) || 1 }))
}
