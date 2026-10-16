import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { deleteCollection, updateCollection } from '@/lib/website/admin/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''
type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => updateCollection(lineOf(req), (await params).id, await readJson(req)))
}
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => deleteCollection(lineOf(req), (await params).id))
}
