/**
 * Maps one row of lead_import_constructii_active.csv (produced by docs/prospectare/pregatire) to a CRM Lead (pure, no I/O).
 *
 * Conventions:
 *  - the CRM requires email and contactPerson: when unknown they are the text 'N/A' (as in earlier imports); phone is NULL when
 *    unknown (a text value would be treated as a number to call);
 *  - customFields keeps the criteria used to build segments at the TOP level as plain strings/numbers, because segment filters read
 *    `customFields.<key>` with equals/gte/contains (no nested objects, no booleans); the complete record is kept under `detalii`.
 */
import type { Prisma } from '@repo/db'

export type CsvRow = Record<string, string>

export interface MapContext {
  businessLineId: string
  entityType: string
  status: string
  /** Lead.source */
  source: string
}

export type CrmOverlap = { leadId: string; linie: string; tip: string; potrivire: string }

export type MapResult =
  | { ok: true; lead: Prisma.LeadCreateManyInput; warnings: string[]; keys: { phones: string[]; emails: string[]; cui: string | null } }
  | { ok: false; reason: string }

const NA = 'N/A'
const yn = (b: unknown) => (b ? 'da' : 'nu')
const text = (v: unknown, max = 500): string | null => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim()
  return s ? s.slice(0, max) : null
}

/** Digits of a national Romanian number (0 + 9 digits), or null. */
export function nationalPhone(v: unknown): string | null {
  let d = String(v ?? '').replace(/\D/g, '')
  if (d.startsWith('0040')) d = d.slice(3)
  if (d.startsWith('40') && d.length === 11) d = '0' + d.slice(2)
  return d.length === 10 && d.startsWith('0') ? d : null
}

const num = (v: string | undefined, int = false): number | null => {
  const s = String(v ?? '').trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? (int ? Math.round(n) : n) : null
}

export function mapRow(row: CsvRow, ctx: MapContext): MapResult {
  const warnings: string[] = []
  const companyName = text(row.companyName, 200)
  if (!companyName) return { ok: false, reason: 'fără denumire' }
  const externalId = text(row.externalId, 80)
  const externalSource = text(row.externalSource, 80)
  if (!externalId || !externalSource) return { ok: false, reason: 'fără externalId / externalSource' }

  let detail: Record<string, any> = {}
  if (row.customFields && row.customFields.trim()) {
    try {
      const parsed = JSON.parse(row.customFields)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
      detail = parsed
    } catch {
      return { ok: false, reason: 'customFields nu e JSON valid' }
    }
  }

  const phones = [row.phone, row.phone2, row.phone3].map(nationalPhone)
  if ([row.phone, row.phone2, row.phone3].some((p, i) => p && !phones[i])) warnings.push('telefon invalid ignorat')
  const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,24}$/.test(e)
  const email = text(row.email, 200)
  const email2 = text(row.email2, 200)
  if (email && !emailOk(email)) warnings.push('email invalid înlocuit cu N/A')
  const realEmails = [email, email2].filter((e): e is string => !!e && emailOk(e))
  const hasContact = phones.some(Boolean) || realEmails.length > 0

  const revenue = num(row.revenue), employees = num(row.employees, true), foundedYear = num(row.foundedYear, true)
  for (const [name, raw, parsed] of [['revenue', row.revenue, revenue], ['employees', row.employees, employees], ['foundedYear', row.foundedYear, foundedYear]] as const) {
    if (raw && raw.trim() && parsed === null) warnings.push(`${name} nu e număr: ignorat`)
  }

  const d = detail
  const ct = d.contactabilitate ?? {}
  const flat: Record<string, string | number> = {
    // segmentation criteria (top level, strings/numbers only)
    regiune: d.adresa?.regiune ?? '', sectiune_caen: d.caen?.sectiune ?? '', segment_caen: d.caen?.segment ?? '', specializare: d.caen?.specializare ?? '',
    diviziune_caen: d.caen?.diviziune ?? '', caen_status: d.caen?.status ?? '', forma_juridica: d.forma_juridica ?? '',
    banda_angajati: d.benzi?.angajati ?? '', banda_cifra_afaceri: d.benzi?.cifra_afaceri ?? '', banda_vechime: d.benzi?.vechime ?? '',
    activa: yn(d.activa === true), inactiv_fiscal: yn(d.inactiv_fiscal === true), platitor_tva: yn(d.platitor_tva === true), persoana_fizica: yn(d.persoana_fizica === true),
    are_mobil: yn(ct.are_mobil), are_email: yn(realEmails.length > 0), are_email_domeniu_propriu: yn(ct.are_email_propriu_domeniu), are_website: yn(!!row.website), fara_contact: yn(!hasContact),
    canal_recomandat: ct.canal_recomandat ?? '', nr_telefoane: Array.isArray(d.telefoane) ? d.telefoane.length : phones.filter(Boolean).length,
    nr_persoane_contact: ct.nr_persoane ?? (Array.isArray(d.persoane) ? d.persoane.length : 0),
    contact_partajat: yn((d.probleme ?? []).includes('contact_partajat')),
    pagini_aurii: yn(Array.isArray(d.etichete?.pagini_aurii) && d.etichete.pagini_aurii.length > 0),
    fonduri_digitalizare: yn(Array.isArray(d.etichete?.fonduri_digitalizare) && d.etichete.fonduri_digitalizare.length > 0),
    fonduri_digitalizare_ron: Array.isArray(d.etichete?.fonduri_digitalizare) ? d.etichete.fonduri_digitalizare.reduce((s: number, x: any) => s + (Number(x?.ajutor_ron) || 0), 0) : 0,
    profit_net: d.profit_net ?? '', an_financiar: d.an_financiar ?? '', sector_bucuresti: d.adresa?.sector ?? '', cod_postal: d.adresa?.cod_postal ?? '',
    judet_sursa: d.adresa?.judet_sursa ?? '', adresa_trunchiata: yn((d.probleme ?? []).includes('adresa_trunchiata')),
    probleme: (d.probleme ?? []).join(','), suprapunere_crm: 'nu', suprapunere_crm_linii: '',
  }
  // remove empty strings so a filter "is empty / exists" stays meaningful
  for (const k of Object.keys(flat)) if (flat[k] === '') delete flat[k]

  const lead: Prisma.LeadCreateManyInput = {
    businessLineId: ctx.businessLineId, entityType: ctx.entityType, status: ctx.status, source: ctx.source,
    externalSource, externalId, companyName,
    contactPerson: text(row.contactPerson, 200) ?? NA, contactRole: text(row.contactRole, 120),
    email: email && emailOk(email) ? email : NA, email2: email2 && emailOk(email2) ? email2 : null,
    phone: phones[0], phone2: phones[1], phone3: phones[2],
    website: text(row.website, 300), cui: text(row.cui, 20), city: text(row.city, 120), county: text(row.county, 80), address: text(row.address, 500),
    industry: text(row.industry, 120), activityDomain: text(row.activityDomain, 160), caenCode: text(row.caenCode, 10), caenDescription: text(row.caenDescription, 300),
    revenue, employees, companyStatus: text(row.companyStatus, 60), foundedYear, optOut: false,
    customFields: { ...flat, detalii: d } as Prisma.InputJsonValue,
  }
  return { ok: true, lead, warnings, keys: { phones: phones.filter((p): p is string => !!p), emails: realEmails.map((e) => e.toLowerCase()), cui: lead.cui ?? null } }
}

/** Marks a mapped lead as already present in the CRM (keeps at most 5 matches in detail). */
export function applyOverlap(lead: Prisma.LeadCreateManyInput, overlaps: CrmOverlap[]): void {
  const cf = { ...(lead.customFields as Record<string, any>) }
  if (overlaps.length === 0) return
  cf.suprapunere_crm = 'da'
  cf.suprapunere_crm_linii = [...new Set(overlaps.map((o) => o.linie))].sort().join(',')
  cf.detalii = { ...cf.detalii, suprapunere_crm: overlaps.slice(0, 5) }
  lead.customFields = cf as Prisma.InputJsonValue
}
