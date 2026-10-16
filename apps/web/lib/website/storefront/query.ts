/** Parsing and validation of list query strings (pure, no database). */
import { WebsiteInputError } from './auth'

export type SortKey = 'featured' | 'name' | 'rating' | 'new'
export interface FieldDef { key: string; type?: string; filterable?: boolean }

export interface ListQuery {
  collection: string
  q: string | null
  county: string | null
  city: string | null
  verified: boolean
  featured: boolean
  sort: SortKey
  page: number
  limit: number
  /** Equality filters on collection fields flagged `filterable`, from `f.<key>=<value>` */
  fieldFilters: Record<string, string>
}

const KEY_RE = /^[a-z0-9_-]{1,60}$/
const SORTS: SortKey[] = ['featured', 'name', 'rating', 'new']
export const MAX_LIMIT = 50

const text = (sp: URLSearchParams, name: string, max = 120): string | null => {
  const v = sp.get(name)?.trim()
  if (!v) return null
  if (v.length > max) throw new WebsiteInputError(`Parametrul „${name}” este prea lung`)
  return v
}
const int = (sp: URLSearchParams, name: string, def: number, min: number, max: number): number => {
  const raw = sp.get(name)
  if (raw == null || raw === '') return def
  const n = Number(raw)
  if (!Number.isInteger(n) || n < min || n > max) throw new WebsiteInputError(`Parametrul „${name}” trebuie să fie între ${min} și ${max}`)
  return n
}

export function parseListQuery(sp: URLSearchParams, fields: FieldDef[]): ListQuery {
  const collection = sp.get('collection') ?? ''
  if (!KEY_RE.test(collection)) throw new WebsiteInputError('Parametrul „collection” este obligatoriu')

  const sort = (sp.get('sort') ?? 'featured') as SortKey
  if (!SORTS.includes(sort)) throw new WebsiteInputError(`Parametrul „sort” trebuie să fie unul dintre: ${SORTS.join(', ')}`)

  const fieldFilters: Record<string, string> = {}
  for (const [name, value] of sp.entries()) {
    if (!name.startsWith('f.')) continue
    const key = name.slice(2)
    const def = fields.find((f) => f.key === key)
    if (!def || !def.filterable) throw new WebsiteInputError(`Câmpul „${key}” nu poate fi folosit ca filtru`)
    if (value.length > 120) throw new WebsiteInputError(`Valoarea filtrului „${key}” este prea lungă`)
    fieldFilters[key] = value
  }

  return {
    collection,
    q: text(sp, 'q'),
    county: text(sp, 'county'),
    city: text(sp, 'city'),
    verified: sp.get('verified') === '1',
    featured: sp.get('featured') === '1',
    sort,
    page: int(sp, 'page', 1, 1, 1000),
    limit: int(sp, 'limit', 20, 1, MAX_LIMIT),
    fieldFilters,
  }
}

export const isSlug = (s: string) => KEY_RE.test(s)
