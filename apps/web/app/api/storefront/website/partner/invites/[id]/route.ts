import { partnerHandler } from '@/lib/website/partner/http'
import { answerInvite } from '@/lib/website/endorsements/invites'
import { AdminError } from '@/lib/website/admin/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { action: 'confirm' | 'reject' | 'revoke' } → confirm = "yes, this is the colleague I invited" (attaches the recommendation). */
export const POST = partnerHandler<{ id: string }>(async (req, { entry }, { id }) => {
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null
  if (body?.action !== 'confirm' && body?.action !== 'reject' && body?.action !== 'revoke') throw new AdminError('Acțiune necunoscută', 422)
  return answerInvite(entry, id, body.action)
})
