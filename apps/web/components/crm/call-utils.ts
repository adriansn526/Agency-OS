/** Small pure helpers of the call workspace (tested). */
export const OUTCOMES = [
  { value: 'nu_raspunde', label: 'Nu răspunde', hint: 'Rămâne în coadă; poți programa o nouă încercare' },
  { value: 'interesat', label: 'Interesat', hint: 'Trece în „În discuții”' },
  { value: 'revin', label: 'Revin mai târziu', hint: 'Trece în „Contactat”; alege data' },
  { value: 'refuza', label: 'Refuză', hint: 'Închide contactul: „Refuzat” și nu mai primește mesaje' },
  { value: 'numar_gresit', label: 'Număr greșit', hint: 'Nu schimbă etapa' },
] as const
export type OutcomeValue = (typeof OUTCOMES)[number]['value']

/** Romanian national number → dial string for the phone or Phone Link on a PC (international format). */
export function telHref(phone: string | null | undefined): string | null {
  const d = String(phone ?? '').replace(/\D/g, '')
  const n = d.startsWith('0040') ? d.slice(2) : d.startsWith('40') && d.length === 11 ? d : d.startsWith('0') && d.length === 10 ? '4' + d : ''
  return n ? `tel:+${n}` : null
}

export const fmtTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/** Quick callback choices, in local time: tomorrow 10:00, in 3 days 10:00, next Monday 10:00. Weekends are skipped (calls go out on weekdays). */
export function quickCallbacks(now = new Date()): { label: string; at: Date }[] {
  const at = (days: number) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(10, 0, 0, 0); while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1); return d }
  const monday = new Date(now); monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7)); monday.setHours(10, 0, 0, 0)
  return [{ label: 'Mâine 10:00', at: at(1) }, { label: 'Peste 3 zile', at: at(3) }, { label: 'Luni 10:00', at: monday }]
}

/** `<input type="datetime-local">` value (local time, no zone) ↔ Date. */
export const toLocalInput = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }

/** Month grid for the calendar: weeks start on Monday; cells outside the month are marked. */
export function monthGrid(year: number, month: number): { date: Date; inMonth: boolean }[][] {
  const first = new Date(year, month, 1)
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7))
  const weeks: { date: Date; inMonth: boolean }[][] = []
  for (let w = 0; w < 6; w++) {
    const row = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + w * 7 + i); return { date: d, inMonth: d.getMonth() === month } })
    if (w >= 4 && !row.some((c) => c.inMonth)) break
    weeks.push(row)
  }
  return weeks
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* ── Company details shown while calling ── */
export interface Fact { label: string; value: string; href?: string; warn?: boolean }
export interface CompanyProfile { facts: Fact[]; people: { name: string; role: string }[]; signals: Fact[]; phoneTags: Record<string, string> }

const s = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')
const isNA = (v: unknown) => !s(v) || s(v).toUpperCase() === 'N/A'
const digits = (p: string) => p.replace(/\D/g, '').replace(/^0040/, '0').replace(/^40(?=\d{9}$)/, '0')
const ron = (n: number) => `${Math.round(n).toLocaleString('ro-RO')} lei`
const link = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)

/** Everything useful before dialling, from the lead and the prospecting details kept in customFields.detalii (pure; missing data is skipped). */
export function companyProfile(lead: any): CompanyProfile {
  const d = (lead?.customFields?.detalii ?? {}) as Record<string, any>
  const facts: Fact[] = []
  const add = (label: string, value: unknown, extra: Partial<Fact> = {}) => { const v = s(value); if (v) facts.push({ label, value: v, ...extra }) }

  add('Activitate', lead.caenDescription || d.caen?.specializare)
  add('CAEN', [lead.caenCode, d.caen?.sectiune].filter((x) => !isNA(x)).join(' · '))
  add('Formă juridică', d.forma_juridica)
  const year = Number(lead.foundedYear) || null
  add('Înființată', year ? `${year}${d.benzi?.vechime ? ` (${d.benzi.vechime})` : ''}` : d.benzi?.vechime)
  add('Angajați', lead.employees != null ? `${lead.employees}${d.benzi?.angajati ? ` · ${d.benzi.angajati}` : ''}` : d.benzi?.angajati)
  const rev = Number(lead.revenue)
  add('Cifra de afaceri', Number.isFinite(rev) && lead.revenue != null ? `${ron(rev)}${d.an_financiar ? ` (${d.an_financiar})` : ''}` : d.benzi?.cifra_afaceri)
  if (typeof d.profit_net === 'number') add('Profit net', ron(d.profit_net))
  add('CUI', lead.cui, {}); add('Reg. Com.', d.reg_com)
  add('Adresă', lead.address)
  add('Regiune', d.adresa?.regiune)
  if (!isNA(lead.website)) add('Website', s(lead.website).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''), { href: link(s(lead.website)) })
  const emails = [...new Set([lead.email, lead.email2, ...(Array.isArray(d.emailuri) ? d.emailuri.map((e: any) => e?.email) : [])].filter((e) => !isNA(e) && String(e).includes('@')).map(s))]
  if (emails.length) add('Email', emails.join(', '))
  if (d.platitor_tva === true) add('TVA', 'plătitor')
  if (d.inactiv_fiscal === true) facts.push({ label: 'Atenție', value: 'inactiv fiscal', warn: true })
  if (lead.companyStatus && lead.companyStatus !== 'Funcțiune') facts.push({ label: 'Stare firmă', value: s(lead.companyStatus), warn: true })

  const people: CompanyProfile['people'] = []
  const seen = new Set<string>()
  for (const p of Array.isArray(d.persoane) ? d.persoane : []) {
    const name = s(p?.nume); if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase()); people.push({ name, role: Array.isArray(p?.roluri) ? p.roluri.map(s).filter(Boolean).join(', ') : s(p?.rol) })
  }
  if (!isNA(lead.contactPerson) && !seen.has(s(lead.contactPerson).toLowerCase())) people.unshift({ name: s(lead.contactPerson), role: isNA(lead.contactRole) ? '' : s(lead.contactRole) })

  const signals: Fact[] = []
  const pa = d.etichete?.pagini_aurii
  if (Array.isArray(pa) && pa[0]?.url) signals.push({ label: 'Pagini Aurii', value: 'listare găsită', href: s(pa[0].url) })
  const fd = d.etichete?.fonduri_digitalizare
  if (Array.isArray(fd) && fd.length) signals.push({ label: 'Fonduri digitalizare', value: fd.map((x: any) => `${s(x?.program) || 'program'}${Number(x?.ajutor_ron) ? ` (${ron(Number(x.ajutor_ron))})` : ''}`).join('; ') })
  if (lead.customFields?.suprapunere_crm === 'da') signals.push({ label: 'Există și în CRM', value: s(lead.customFields.suprapunere_crm_linii) || 'altă linie', warn: true })
  if (lead.customFields?.preview_raspuns) signals.push({ label: 'Răspuns la previzualizare', value: s(lead.customFields.preview_raspuns) })
  else if (lead.customFields?.previzualizare_vazuta_la) signals.push({ label: 'Previzualizare', value: 'a deschis pagina' })
  if (!isNA(lead.notes)) signals.push({ label: 'Note', value: s(lead.notes) })

  // phone type and whether other firms share the number (a shared number is usually an accountant or an office)
  const phoneTags: Record<string, string> = {}
  for (const t of Array.isArray(d.telefoane) ? d.telefoane : []) {
    const key = digits(s(t?.numar)); if (!key) continue
    phoneTags[key] = [t?.tip === 'mobil' ? 'mobil' : t?.tip === 'fix' ? 'fix' : '', Number(t?.partajat_cu) > 0 ? `partajat cu ${t.partajat_cu} ${Number(t.partajat_cu) === 1 ? 'firmă' : 'firme'}` : ''].filter(Boolean).join(' · ')
  }
  return { facts, people, signals, phoneTags }
}

export const phoneTag = (tags: Record<string, string>, phone: string) => tags[digits(phone)] ?? ''
