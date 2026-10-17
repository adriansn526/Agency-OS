import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { deleteRule, updateRule } from '@/lib/website/rules/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''
type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth()
  return respond(async () => updateRule(lineOf(req), (await params).id, session?.user?.id ?? null, await readJson(req)))
}
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth()
  return respond(async () => deleteRule(lineOf(req), (await params).id, session?.user?.id ?? null))
}
