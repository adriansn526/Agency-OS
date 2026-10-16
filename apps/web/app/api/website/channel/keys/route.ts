import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { AdminError, readJson, respond } from '@/lib/website/admin/errors'
import { createApiKey, revokeApiKey } from '@/lib/website/admin/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''

/** POST /api/website/channel/keys?lineId= { label } → { key } (plain key, shown once). */
export async function POST(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => createApiKey(lineOf(req), await readJson(req)), 201)
}
/** DELETE /api/website/channel/keys?lineId=&keyId= */
export async function DELETE(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => {
    const keyId = new URL(req.url).searchParams.get('keyId')
    if (!keyId) throw new AdminError('keyId lipsește')
    return revokeApiKey(lineOf(req), keyId)
  })
}
