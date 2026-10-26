/**
 * Where a quote request came from. The portal stores it in `WebsiteRequest.sourcePage` as the page address with the visitor's attribution
 * appended as a query string (`/preturi/zugravit?utm_source=hidropro&utm_medium=referral&utm_campaign=pas-urmator&ref=hidropro.ro`).
 * This module reads that string back for the admin (pure).
 */
export interface RequestSource { page: string; source: string | null; medium: string | null; campaign: string | null; content: string | null; ref: string | null; /** what to show: the UTM source, else the referring site, else null (direct or unknown) */ label: string | null }

export function describeSource(sourcePage: string | null | undefined): RequestSource | null {
  const raw = (sourcePage ?? '').trim()
  if (!raw) return null
  const q = raw.indexOf('?')
  const page = (q === -1 ? raw : raw.slice(0, q)) || '/'
  const sp = new URLSearchParams(q === -1 ? '' : raw.slice(q + 1))
  const get = (k: string) => sp.get(k)?.trim() || null
  const source = get('utm_source'), ref = get('ref')
  return { page, source, medium: get('utm_medium'), campaign: get('utm_campaign'), content: get('utm_content'), ref, label: source ?? ref }
}
