import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { respond } from '@/lib/website/admin/errors'
import { contentPreviewLink } from '@/lib/website/content/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST ?lineId= → { kind: 'public' | 'private', link, expiresAt }. A draft becomes a private preview; each call issues a new link. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => contentPreviewLink(new URL(req.url).searchParams.get('lineId') ?? '', (await params).id))
}
