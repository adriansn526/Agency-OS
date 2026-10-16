/** https://… from whatever was typed in the CRM ("exemplu.ro", "http://x.ro"); null when it is not a usable address. */
export function normalizeWebsite(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.toString().replace(/\/$/, '') : null
  } catch { return null }
}
