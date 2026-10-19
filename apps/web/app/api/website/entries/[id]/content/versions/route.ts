import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { AdminError, readJson, respond } from '@/lib/website/admin/errors'
import { listContentVersions, restoreContentVersion } from '@/lib/website/content/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''
type Ctx = { params: Promise<{ id: string }> }

/** GET ?lineId= → the last saved versions of the layout. */
export async function GET(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => listContentVersions(lineOf(req), (await params).id))
}
/** POST ?lineId= { versionId } → restores that version (saved as a new one). */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth().catch(() => null)
  return respond(async () => {
    const body = (await readJson(req)) as { versionId?: unknown }
    if (typeof body?.versionId !== 'string') throw new AdminError('Lipsește versiunea', 422)
    return restoreContentVersion(lineOf(req), (await params).id, body.versionId, { id: session?.user?.id, name: session?.user?.name })
  })
}
