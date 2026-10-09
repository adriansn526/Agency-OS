/**
 * Shared conversion math for client reports.
 *
 * Both the admin dashboard (aggregator) and the public report route must use
 * these helpers so the headline numbers stay identical across the two views.
 */

/** Prisma `where` fragment matching leads that came from a report domain. */
export function leadDomainWhere(domain: string) {
  return { sourceDomain: { contains: domain, mode: 'insensitive' as const } }
}

export interface ConversionSummary {
  formSubmissions: number
  phoneCalls: number
  whatsappContacts: number
  otherConversions: number
  totalConversions: number
}

interface ConversionInput {
  /** Google Ads conversion actions (from getConversionBreakdown) */
  adsBreakdown?: Array<{ actionName?: string; allConversions?: number }>
  /** CRM leads for the domain and period */
  leads?: Array<{ source?: string | null }>
  /** Calls tracked by Telnyx for the domain and period */
  telnyxCalls?: number
}

export function computeConversionSummary({ adsBreakdown = [], leads = [], telnyxCalls = 0 }: ConversionInput): ConversionSummary {
  let forms = 0
  let phone = 0
  let whatsapp = 0
  let other = 0

  for (const conv of adsBreakdown) {
    const name = (conv.actionName || '').toLowerCase()
    const n = conv.allConversions || 0
    if (/form|formular|submit|contact|lead|cerere/i.test(name)) forms += n
    else if (/phone|apel|call|tel/i.test(name)) phone += n
    else if (/whatsapp|\bwa\b/i.test(name)) whatsapp += n
    else other += n
  }

  // CRM is the system of record for forms/WhatsApp; Telnyx for calls.
  // Never report less than the ad platform already counted.
  let crmForms = 0
  let crmWhatsapp = 0
  for (const lead of leads) {
    if (/whatsapp/i.test(lead.source || '')) crmWhatsapp++
    else crmForms++
  }

  const formSubmissions = Math.round(Math.max(forms, crmForms))
  const phoneCalls = Math.round(Math.max(phone, telnyxCalls))
  const whatsappContacts = Math.round(Math.max(whatsapp, crmWhatsapp))
  const otherConversions = Math.round(other)

  return {
    formSubmissions,
    phoneCalls,
    whatsappContacts,
    otherConversions,
    totalConversions: formSubmissions + phoneCalls + whatsappContacts + otherConversions,
  }
}
