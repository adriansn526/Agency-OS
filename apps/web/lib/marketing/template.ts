/** Fills a campaign / SMS template with a lead's data. `extra` carries the per-lead preview link, its expiry, the founding-offer sentence and the unsubscribe link. */
import type { PreviewVars } from '@/lib/website/preview/campaign'

export function populateTemplate(
  template: string,
  lead: any,
  businessLine: any,
  uniqueCode: string,
  lpLink?: string,
  extra?: { preview?: PreviewVars; unsubscribe?: string }
): string {
  return template
    .replace(/\{\{company_name\}\}/g, lead.companyName || '')
    .replace(/\{\{companyName\}\}/g, lead.companyName || '')
    .replace(/\{\{contact_name\}\}/g, lead.contactPerson || '')
    .replace(/\{\{contactPerson\}\}/g, lead.contactPerson || '')
    .replace(/\{\{city\}\}/g, lead.city || '')
    .replace(/\{\{county\}\}/g, lead.county || '')
    .replace(/\{\{phone\}\}/g, lead.phone || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{unique_code\}\}/g, uniqueCode)
    .replace(/\{\{bl_name\}\}/g, businessLine.name || '')
    .replace(/\{\{link\}\}/g, lpLink || '')
    .replace(/\{\{preview_link\}\}/g, extra?.preview?.preview_link || '')
    .replace(/\{\{preview_expires\}\}/g, extra?.preview?.preview_expires || '')
    .replace(/\{\{unsubscribe_link\}\}/g, extra?.unsubscribe || '')
    .replace(/\{\{founder_offer\}\}/g, extra?.preview?.founder_offer || '')
}
