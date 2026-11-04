import { partnerHandler } from '@/lib/website/partner/http'
import { AdminError } from '@/lib/website/admin/errors'
import { isExpoToken, registerDevice, removeDevice } from '@/lib/website/partner/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function tokenOf(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null
  if (!isExpoToken(body?.token)) throw new AdminError('Token invalid', 422)
  return body.token
}

/** POST { token } → registers (or moves to this firm) the Expo push token of the mobile app. */
export const POST = partnerHandler(async (req, { entry }) => { await registerDevice(entry.id, await tokenOf(req)); return { ok: true } })

/** DELETE { token } → stops pushes to that device (logout). */
export const DELETE = partnerHandler(async (req, { entry }) => { await removeDevice(entry.id, await tokenOf(req)); return { ok: true } })
