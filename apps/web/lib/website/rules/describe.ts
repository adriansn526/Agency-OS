/** Plain-language descriptions and field options for the rules UI (pure; shared by components and tests). */
import { FACT_CATALOG, type Condition, type Op, type RuleKind } from './types'

export interface FieldOption { key: string; label: string; type: 'string' | 'number' | 'boolean'; list?: boolean; ops: Op[]; options?: string[] }
interface CollectionLike { key?: string; name: string; fields: { key: string; label: string; type: string; options?: string[] }[] }

/** Facts that exist today. `account` and `plan` come with partner accounts and are not offered until then. */
const HIDDEN_FACTS = new Set(['account', 'plan'])

export function buildFieldOptions(collections: CollectionLike[]): FieldOption[] {
  const keys = collections.map((c) => c.key).filter((k): k is string => !!k)
  const fixedOptions: Record<string, string[] | undefined> = { requestType: ['direct', 'general'], collection: keys.length ? keys : undefined }
  const base: FieldOption[] = Object.entries(FACT_CATALOG).filter(([k]) => !HIDDEN_FACTS.has(k)).map(([key, m]) => ({ key, label: m.label, type: m.type, list: m.list, ops: m.ops, options: fixedOptions[key] }))
  const seen = new Set<string>()
  const custom: FieldOption[] = []
  for (const c of collections) for (const f of c.fields) {
    const key = `data.${f.key}`
    if (seen.has(key)) continue
    seen.add(key)
    const number = f.type === 'number' || f.type === 'rating'
    const list = f.type === 'list'
    custom.push({
      key, label: `${f.label} (câmp ${c.name.toLowerCase()})`, type: number ? 'number' : 'string', list,
      ops: number ? ['gte', 'lte', 'exists'] : list ? ['contains', 'in', 'exists'] : ['eq', 'in', 'exists'],
      options: f.type === 'select' ? f.options : undefined,
    })
  }
  return [...base, ...custom]
}

export const OP_LABEL: Record<Op, string> = { eq: 'este', in: 'este una dintre', contains: 'conține', gte: '≥', lte: '≤', exists: 'există' }
export const KIND_LABEL: Record<RuleKind, string> = { pricing: 'Preț', routing: 'Distribuire', billing: 'Taxare', recommendation: 'Recomandare' }
export const SELECTION_LABEL: Record<string, string> = { nearest: 'cele mai apropiate', rating: 'cele mai bine cotate', round_robin: 'pe rând' }
export const TRACE_LABEL: Record<string, string> = {
  matched: 'Se aplică', no_match: 'Nu se potrivește', inactive: 'Oprită', not_started: 'Încă nevalabilă', expired: 'Expirată', not_evaluated: 'Neevaluată (o regulă anterioară se aplică)',
}

const fmtValue = (v: Condition['value']): string => (v === undefined ? '' : typeof v === 'boolean' ? (v ? 'Da' : 'Nu') : Array.isArray(v) ? v.join(', ') : String(v))

export function describeCondition(c: Condition, fields: FieldOption[]): string {
  const label = fields.find((f) => f.key === c.field)?.label ?? c.field
  if (c.op === 'exists') return `${label} ${(c.value ?? true) === true ? 'este completat' : 'nu este completat'}`
  return `${label} ${OP_LABEL[c.op]} ${fmtValue(c.value)}`
}

export function describeAction(kind: RuleKind, a: Record<string, unknown>): string {
  switch (kind) {
    case 'pricing': {
      const amount = Number(a.amountRon ?? 0), free = Number(a.freeFirstN ?? 0)
      return `${amount === 0 ? 'Gratuit' : `${amount} RON / cerere`}${free > 0 ? ` · primele ${free} gratuite` : ''}`
    }
    case 'routing':
      return a.mode === 'multi'
        ? `Până la ${a.maxFirms} firme, max ${a.maxAcceptances} acceptări · ${SELECTION_LABEL[String(a.selection)] ?? a.selection}`
        : 'O singură firmă'
    case 'billing':
      return a.chargeAt === 'delivery' ? 'Taxare la livrare' : 'Taxare la acceptare'
    case 'recommendation':
      return `Cel puțin ${a.minReviews} recenzii, media ≥ ${a.minRating}${a.requireVerified === false ? '' : ', doar verificate'}`
  }
}

/** Summary of what changed in an audit row, e.g. ["name: A → B", "action.amountRon: 10 → 12"]. */
export function diffSummary(before: unknown, after: unknown): string[] {
  const flat = (o: unknown, prefix = ''): Record<string, string> => {
    if (o === null || o === undefined) return {}
    if (typeof o !== 'object' || Array.isArray(o)) return { [prefix]: JSON.stringify(o) }
    return Object.entries(o as Record<string, unknown>).reduce((acc, [k, v]) => ({ ...acc, ...flat(v, prefix ? `${prefix}.${k}` : k) }), {} as Record<string, string>)
  }
  const b = flat(before), a = flat(after), out: string[] = []
  for (const k of [...new Set([...Object.keys(b), ...Object.keys(a)])]) if (b[k] !== a[k]) out.push(`${k}: ${b[k] ?? '—'} → ${a[k] ?? '—'}`)
  return out
}
