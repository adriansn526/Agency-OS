import { z } from 'zod'
import { auth } from '@/lib/auth'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { AdminError, readJson, respond } from '@/lib/website/admin/errors'
import { confirmAnre, removeVerified, searchAnre } from '@/lib/website/authorizations/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sp = (req: Request) => new URL(req.url).searchParams
const failed = (e: unknown): never => { if (e instanceof AdminError) throw e; throw new AdminError('Registrul ANRE nu răspunde acum. Încearcă din nou în câteva minute.', 502) }

/** GET ?lineId=&q= → { query, operators: [{ id, name, address, representative, authorizations[] }], current } (read-only search in ANRE's public register) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => { try { return await searchAnre(sp(req).get('lineId') ?? '', (await params).id, sp(req).get('q') ?? undefined) } catch (e) { return failed(e) } })
}
/** POST ?lineId= { operatorId } → stores the operator's valid authorizations as verified (the team compared the register entry with the firm). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth().catch(() => null)
  return respond(async () => {
    const { operatorId } = z.object({ operatorId: z.number().int().positive() }).strict().parse(await readJson(req))
    try { return await confirmAnre(sp(req).get('lineId') ?? '', (await params).id, operatorId, { id: session?.user?.id, name: session?.user?.name }) } catch (e) { return failed(e) }
  })
}
/** DELETE ?lineId=&number= → removes one verified authorization. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const session = await auth().catch(() => null)
  return respond(async () => removeVerified(sp(req).get('lineId') ?? '', (await params).id, sp(req).get('number') ?? '', { id: session?.user?.id, name: session?.user?.name }))
}
