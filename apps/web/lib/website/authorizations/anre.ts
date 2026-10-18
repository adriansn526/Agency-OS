/**
 * Read-only client of ANRE's public register of authorized natural-gas operators (https://portal.anre.ro/PublicLists/AtestatGN),
 * the same queries the public page makes. Used by the team to VERIFY a firm's authorizations; nothing here is writable by firms.
 */
export const ANRE_BASE = 'https://portal.anre.ro'
export const ANRE_PUBLIC_LIST = `${ANRE_BASE}/PublicLists/AtestatGN`

export interface AnreAuth { number: string; type: string; issued: string; expires: string; state: string }
/** `ref` identifies a register row (county + exact name and address); the register offers no public id on its list rows. */
export interface AnreOperator { ref: string; name: string; address: string; locality: string; county: string; phone: string; representative: string; authorizations: AnreAuth[] }
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

const post = async (path: string, body: URLSearchParams, f: Fetch, timeoutMs = 25_000) => {
  const res = await f(`${ANRE_BASE}${path}`, { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`ANRE ${res.status}`)
  return res.json()
}

export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim()
export const encodeRef = (countyId: number, name: string, address: string) => Buffer.from(JSON.stringify([countyId, name, address])).toString('base64url')
export function decodeRef(ref: string): { countyId: number; name: string; address: string } | null {
  try { const [c, n, a] = JSON.parse(Buffer.from(ref, 'base64url').toString()); return Number.isInteger(c) && typeof n === 'string' && typeof a === 'string' ? { countyId: c, name: n, address: a } : null } catch { return null }
}

export async function listCounties(f: Fetch = fetch): Promise<{ id: number; name: string }[]> {
  const res = await f(`${ANRE_BASE}/Dictionary/GetJudete`, { headers: UA, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`ANRE ${res.status}`)
  return ((await res.json()) as { IdJudet: number; Nume: string }[]).map((x) => ({ id: x.IdJudet, name: x.Nume }))
}

/** Every authorized operator of one county, with its authorizations (the register's own list, same query as the public page). */
export async function listOperators(countyId: number, f: Fetch = fetch): Promise<AnreOperator[]> {
  const j = (await post('/PublicLists/AtestatGN/GetAtestatGN', new URLSearchParams({ 'Judet[0].IdJudet': String(countyId), page: '1', pageSize: '2000', skip: '0', take: '2000' }), f, 30_000)) as { Data?: { Societate: string; Sediu: string; Localitate: string; Judet: string; TelefonFax: string; ReprezentantLegal: string; Detaliu: string }[] }
  // the register leaves some fields empty (null) on some rows
  return (j.Data ?? []).map((r) => { const name = r.Societate ?? '', address = (r.Sediu ?? '').replace(/;\s*$/, ''); return { ref: encodeRef(countyId, name, address), name, address, locality: r.Localitate ?? '', county: r.Judet ?? '', phone: r.TelefonFax ?? '', representative: (r.ReprezentantLegal ?? '').replace(/^Administrator:\s*:?\s*/i, '').trim(), authorizations: parseAuthorizations(r.Detaliu ?? '') } })
}

/** Operators whose name contains the query, in one county (by name) or in all of them. At most 10, for the team to compare. */
export async function searchOperators(name: string, county?: string, f: Fetch = fetch): Promise<AnreOperator[]> {
  const q = norm(name)
  if (q.length < 3) return []
  const all = await listCounties(f)
  const wanted = county?.trim() ? all.filter((c) => norm(c.name) === norm(county)) : all
  const found: AnreOperator[] = []
  for (let i = 0; i < wanted.length; i += 6) {
    const parts = await Promise.all(wanted.slice(i, i + 6).map((c) => listOperators(c.id, f)))
    for (const ops of parts) found.push(...ops.filter((o) => norm(o.name).includes(q)))
  }
  return found.slice(0, 10)
}

/** The register row a ref points to (re-read from the register; nothing the client sent is trusted). */
export async function resolveOperator(ref: string, f: Fetch = fetch): Promise<AnreOperator | null> {
  const r = decodeRef(ref)
  if (!r) return null
  return (await listOperators(r.countyId, f)).find((o) => o.name === r.name && o.address === r.address) ?? null
}

/** "MELIORSTAL SRL" → "MELIORSTAL" (the register lists names without the legal form). */
export const registerName = (title: string) => title.replace(/\b(S\.?\s?R\.?\s?L\.?(-D)?|S\.?\s?A\.?|P\.?F\.?A\.?|I\.?I\.?|S\.?C\.?)\b\.?/gi, ' ').replace(/[^\p{L}\p{N}& -]/gu, ' ').replace(/\s+/g, ' ').trim()
