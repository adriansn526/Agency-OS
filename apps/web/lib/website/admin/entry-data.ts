/**
 * Validation of WebsiteEntry.data against its collection's field definitions (pure).
 * Unknown keys are dropped, values are coerced to the declared type, and every problem is reported at once.
 */
export type FieldType = 'text' | 'number' | 'select' | 'date' | 'rating' | 'list'
export interface CollectionField { key: string; label: string; type: FieldType; options?: string[]; required?: boolean; filterable?: boolean }

export const FIELD_TYPES: FieldType[] = ['text', 'number', 'select', 'date', 'rating', 'list']
const MAX_TEXT = 2000
const MAX_LIST = 50

export class DataValidationError extends Error {
  constructor(readonly issues: string[]) { super(issues.join('; ')) }
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

export function validateEntryData(fields: CollectionField[], input: unknown): Record<string, string | number | string[]> {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {}
  const out: Record<string, string | number | string[]> = {}
  const issues: string[] = []

  for (const f of fields) {
    const v = raw[f.key]
    if (isEmpty(v)) {
      if (f.required) issues.push(`„${f.label}” este obligatoriu`)
      continue
    }
    switch (f.type) {
      case 'text': {
        const s = String(v).trim()
        if (s.length > MAX_TEXT) issues.push(`„${f.label}” depășește ${MAX_TEXT} de caractere`)
        else out[f.key] = s
        break
      }
      case 'number': {
        const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
        if (!Number.isFinite(n)) issues.push(`„${f.label}” trebuie să fie un număr`)
        else out[f.key] = n
        break
      }
      case 'rating': {
        const n = Number(v)
        if (!Number.isFinite(n) || n < 0 || n > 5) issues.push(`„${f.label}” trebuie să fie între 0 și 5`)
        else out[f.key] = n
        break
      }
      case 'select': {
        const s = String(v)
        if (!f.options?.includes(s)) issues.push(`„${f.label}” trebuie să fie una dintre: ${(f.options ?? []).join(', ') || '(nicio opțiune definită)'}`)
        else out[f.key] = s
        break
      }
      case 'date': {
        const s = String(v)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) issues.push(`„${f.label}” trebuie să fie o dată (AAAA-LL-ZZ)`)
        else out[f.key] = s
        break
      }
      case 'list': {
        const arr = Array.isArray(v) ? v : String(v).split(/[\n,;]/)
        const items = arr.map((x) => String(x).trim()).filter(Boolean)
        if (items.length > MAX_LIST) issues.push(`„${f.label}” are prea multe elemente (max ${MAX_LIST})`)
        else if (items.some((x) => x.length > 600)) issues.push(`Elementele din „${f.label}” sunt prea lungi`)
        else out[f.key] = items
        break
      }
    }
  }
  if (issues.length) throw new DataValidationError(issues)
  return out
}

/** Checks a collection's own field definitions (keys, types, options). */
export function validateFieldDefs(fields: CollectionField[]): string[] {
  const issues: string[] = []
  const seen = new Set<string>()
  for (const f of fields) {
    if (!/^[a-z0-9_]{1,40}$/.test(f.key)) issues.push(`Cheie de câmp invalidă: „${f.key}” (litere mici, cifre, _)`)
    if (seen.has(f.key)) issues.push(`Cheie de câmp duplicată: „${f.key}”`)
    seen.add(f.key)
    if (!f.label?.trim()) issues.push(`Câmpul „${f.key}” nu are etichetă`)
    if (!FIELD_TYPES.includes(f.type)) issues.push(`Tip necunoscut pentru „${f.key}”: ${f.type}`)
    if (f.type === 'select' && !(f.options && f.options.length)) issues.push(`Câmpul „${f.key}” (select) are nevoie de opțiuni`)
    if (f.filterable && !['text', 'select'].includes(f.type)) issues.push(`Doar câmpurile text și select pot fi filtre („${f.key}”)`)
  }
  return issues
}
