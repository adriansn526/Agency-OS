import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { respond } from '@/lib/website/admin/errors'
import { generatePreviewLink, previewStatus } from '@/lib/website/preview/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''

/** GET ?lineId= → { status, publicUrl, link: { active, issuedAt, expiresAt }, views, firstViewAt, lastViewAt, answer, answerAt } (the link itself is not recoverable). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => previewStatus(lineOf(req), (await params).id))
}
/** POST ?lineId= → issues a NEW private link (the previous one stops working): { link, answerLink, expiresAt, days }. Only for entries in the "preview" state. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth().catch(() => null)
  return respond(async () => generatePreviewLink(lineOf(req), (await params).id, { id: session?.user?.id, name: session?.user?.name }))
}
