import { partnerHandler } from '@/lib/website/partner/http'
import { suggestService } from '@/lib/website/partner/suggestions'
import { sendRawEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { title, note? } → the team sees it in Marketing → Website (and by email when PARTNER_NOTIFY_EMAIL is set). */
export const POST = partnerHandler(async (req, { entry }) => {
  const to = process.env.PARTNER_NOTIFY_EMAIL
  const notify = to ? async (subject: string, text: string) => { await sendRawEmail({ to, subject, text, html: `<pre>${text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</pre>`, purpose: 'partners', source: 'service-suggestion' }) } : undefined
  return suggestService(entry, await req.json().catch(() => null), notify)
})
