import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { confirmCmr, getCmr, removeCmr } from '@/lib/website/verification/cmr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''

/** GET ?lineId= → { registerUrl, current } (the register has no public API: the team searches it in the browser) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => getCmr(lineOf(req), (await params).id))
}
/** POST ?lineId= { name, county?, specialities[], practiceUntil, parafa?, hasPracticeRight: true, hasRestrictions: false } → records the verification the team did in the register. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth().catch(() => null)
  return respond(async () => confirmCmr(lineOf(req), (await params).id, await readJson(req), { id: session?.user?.id, name: session?.user?.name }))
}
/** DELETE ?lineId= → removes the verification. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth().catch(() => null)
  return respond(async () => removeCmr(lineOf(req), (await params).id, { id: session?.user?.id, name: session?.user?.name }))
}
