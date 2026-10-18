/**
 * Read-only client of ANRE's public register of authorized natural-gas operators (https://portal.anre.ro/PublicLists/AtestatGN),
 * the same queries the public page makes. Used by the team to VERIFY a firm's authorizations; nothing here is writable by firms.
 */
export const ANRE_BASE = 'https://portal.anre.ro'
export const ANRE_PUBLIC_LIST = `${ANRE_BASE}/PublicLists/AtestatGN`

export interface AnreAuth { number: string; type: string; issued: string; expires: string; state: string }
export interface AnreOperator { id: number; name: string; address: string; locality: string; county: string; phone: string; representative: string; authorizations: AnreAuth[] }
type Fetch = typeof fetch

/** What each authorization type allows (the portal's own descriptions are long; these are the common ones). */
export const ANRE_TYPE_LABEL: Record<string, string> = {
  PDIB: 'Proiectare instalații de utilizare a gazelor naturale (presiune medie, redusă și joasă)',
  EDIB: 'Execuție instalații de utilizare a gazelor naturale (presiune medie, redusă și joasă)',
  PDSB: 'Proiectare sisteme de distribuție a gazelor naturale și instalații aferente',
  EDSB: 'Execuție sisteme de distribuție a gazelor naturale și instalații aferente',
  RPFA: 'Racordare aparate consumatoare de combustibili gazoși',
}

const UA = { 'User-Agent': 'Mozilla/5.0 (IntraConstruct verification)' }
const iso = (d: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim()); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }
const text = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

/** Parses the nested table of an operator row ("Detaliu"): number, type, issue date, expiry date, state. */
export function parseAuthorizations(detaliu: string): AnreAuth[] {
  const out: AnreAuth[] = []
  for (const row of detaliu.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
    if (/<th/i.test(row)) continue
    const c = (row.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? []).map(text)
    if (c.length >= 5 && /^\d+$/.test(c[0]!) && iso(c[2]!) && iso(c[3]!)) out.push({ number: c[0]!, type: c[1]!, issued: iso(c[2]!), expires: iso(c[3]!), state: c[4]! })
  }
  return out
}

/** Candidate operators by (part of) the name, e.g. "MELIORSTAL" → [{ id: 4747, name: "MELIORSTAL" }]. */
export async function searchOperators(name: string, f: Fetch = fetch): Promise<{ id: number; name: string }[]> {
  const q = name.trim()
  if (q.length < 3) return []
  const res = await f(`${ANRE_BASE}/PublicLists/LicenteAutorizatii/GetAgenti`, { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ 'filter[filters][0][value]': q, 'filter[filters][0][field]': 'Nume', 'filter[filters][0][operator]': 'contains', 'filter[logic]': 'and', text: q }), signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`ANRE ${res.status}`)
  const j = (await res.json()) as { IdAgentEconomic: number; Nume: string }[]
  return (Array.isArray(j) ? j : []).slice(0, 10).map((x) => ({ id: x.IdAgentEconomic, name: x.Nume }))
}

/** One operator with all its authorizations. null when the id is unknown to the register. */
export async function fetchOperator(id: number, f: Fetch = fetch): Promise<AnreOperator | null> {
  if (!Number.isInteger(id) || id <= 0) return null
  const res = await f(`${ANRE_BASE}/PublicLists/AtestatGN/GetAtestatGN`, { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ 'Agents[0].IdAgentEconomic': String(id), page: '1', pageSize: '10', skip: '0', take: '10' }), signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`ANRE ${res.status}`)
  const j = (await res.json()) as { Data?: { Societate: string; Sediu: string; Localitate: string; Judet: string; TelefonFax: string; ReprezentantLegal: string; Detaliu: string }[] }
  const r = j.Data?.[0]
  return r ? { id, name: r.Societate, address: r.Sediu.replace(/;\s*$/, ''), locality: r.Localitate, county: r.Judet, phone: r.TelefonFax, representative: r.ReprezentantLegal.replace(/^Administrator:\s*:?\s*/i, '').trim(), authorizations: parseAuthorizations(r.Detaliu) } : null
}

/** "MELIORSTAL SRL" → "MELIORSTAL" (the register lists names without the legal form). */
export const registerName = (title: string) => title.replace(/\b(S\.?\s?R\.?\s?L\.?(-D)?|S\.?\s?A\.?|P\.?F\.?A\.?|I\.?I\.?|S\.?C\.?)\b\.?/gi, ' ').replace(/[^\p{L}\p{N}& -]/gu, ' ').replace(/\s+/g, ' ').trim()
