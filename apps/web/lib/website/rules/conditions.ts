import type { Condition, FactValue, Facts } from './types'

/** Case- and diacritics-insensitive comparison for text ("Iași" == "iasi"). */
export const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const isMissing = (v: FactValue) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

const sameScalar = (a: string | number | boolean, b: unknown): boolean =>
  typeof a === 'string' && typeof b === 'string' ? norm(a) === norm(b) : a === b

const asNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') { const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : null }
  return null
}

export function matchCondition(c: Condition, facts: Facts): boolean {
  const fact = facts[c.field]
  if (c.op === 'exists') return (c.value ?? true) === true ? !isMissing(fact) : isMissing(fact)
  if (isMissing(fact)) return false // an unknown fact never satisfies a condition

  switch (c.op) {
    case 'eq': {
      if (Array.isArray(fact)) return fact.some((f) => sameScalar(f, c.value))
      return sameScalar(fact as string | number | boolean, c.value)
    }
    case 'in': {
      if (!Array.isArray(c.value)) return false
      const set = c.value
      return Array.isArray(fact) ? fact.some((f) => set.some((v) => sameScalar(f, v))) : set.some((v) => sameScalar(fact as string, v))
    }
    case 'contains': {
      if (typeof c.value !== 'string') return false
      if (Array.isArray(fact)) return fact.some((f) => norm(String(f)) === norm(c.value as string))
      return typeof fact === 'string' && norm(fact).includes(norm(c.value))
    }
    case 'gte': { const f = asNumber(fact), v = asNumber(c.value); return f !== null && v !== null && f >= v }
    case 'lte': { const f = asNumber(fact), v = asNumber(c.value); return f !== null && v !== null && f <= v }
  }
}

/** Conditions that do NOT hold (empty = the rule matches). Used for the simulator's explanation. */
export const failedConditions = (conds: Condition[], facts: Facts): Condition[] => conds.filter((c) => !matchCondition(c, facts))
