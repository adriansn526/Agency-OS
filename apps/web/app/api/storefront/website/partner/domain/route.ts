import { partnerHandler } from '@/lib/website/partner/http'
import { lastDomainRequest, requestDomain } from '@/lib/website/partner/domain'
import { sendRawEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = partnerHandler(async (_req, { entry }) => ({ request: await lastDomainRequest(entry.id) }))

/** POST { domain, note? } → records the request for the team (and emails PARTNER_NOTIFY_EMAIL when set). */
export const POST = partnerHandler(async (req, { entry }) => {
  const to = process.env.PARTNER_NOTIFY_EMAIL
  const notify = to ? async (subject: string, text: string) => { await sendRawEmail({ to, subject, text, html: `<pre>${text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</pre>`, purpose: 'partners', source: 'partner-domain-request' }) } : undefined
  return requestDomain(entry, await req.json().catch(() => null), notify)
})
