import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { getContentPage, saveContentLayout } from '@/lib/website/content/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''
type Ctx = { params: Promise<{ id: string }> }

/** GET ?lineId= → { entry, layout, catalog, media } for the block editor of a service or price page. */
export async function GET(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => getContentPage(lineOf(req), (await params).id))
}
/** PUT ?lineId= { layout } → validates against the catalog and saves (with a history entry). */
export async function PUT(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth().catch(() => null)
  return respond(async () => saveContentLayout(lineOf(req), (await params).id, await readJson(req), { id: session?.user?.id, name: session?.user?.name }))
}
