import { sendRawEmail } from '@/lib/email'
import type { Notifier } from './auth'

export const siteUrlOf = (channelSiteUrl: string | null | undefined) => (channelSiteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://intraconstruct.ro').replace(/\/$/, '')

/** Real delivery: the line's "partners" mailbox for email, SMSO for SMS. */
export const defaultNotifier = (lineSlug: string | undefined): Notifier => ({
  async email(to, subject, html, text) { await sendRawEmail({ to, subject, html, text, businessLine: lineSlug, purpose: 'partners', source: 'partner-login' }) },
  async sms(to, body) { const { sendSMS } = await import('@/lib/integrations/smso'); await sendSMS(to, body) },
})
