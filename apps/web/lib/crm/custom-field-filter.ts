/**
 * Lead filters on custom fields (customFields.<key>, top-level strings and numbers). Prisma cannot express most of these on JSON
 * (missing keys follow SQL NULL logic), so the matching lead ids are selected with SQL and used as `id IN (...)`.
 */
import { db, Prisma } from '@repo/db'

const KEY_RE = /^[A-Za-z0-9_]{1,60}$/
export const CF_OPERATORS = ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'gt', 'gte', 'lt', 'lte', 'exists', 'not_exists', 'in', 'not_in'] as const

const like = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/** SQL predicate on the text value `v` ("customFields" ->> key); null when the operator/value is not usable. */
export function predicate(operator: string, value: unknown, v: Prisma.Sql): Prisma.Sql | null {
  const text = String(value ?? '')
  const num = Number(value)
  const list = (Array.isArray(value) ? value : [value]).map((x) => String(x).toLowerCase())
  switch (operator) {
    case 'equals': return Prisma.sql`lower(${v}) = ${text.toLowerCase()}`
    case 'not_equals': return Prisma.sql`lower(${v}) IS DISTINCT FROM ${text.toLowerCase()}`
    case 'contains': return Prisma.sql`${v} ILIKE ${'%' + like(text) + '%'}`
    case 'not_contains': return Prisma.sql`(${v} IS NULL OR ${v} NOT ILIKE ${'%' + like(text) + '%'})`
    case 'starts_with': return Prisma.sql`${v} ILIKE ${like(text) + '%'}`
    case 'gt': case 'gte': case 'lt': case 'lte': {
      if (!Number.isFinite(num)) return null
      const op = { gt: '>', gte: '>=', lt: '<', lte: '<=' }[operator]!
      return Prisma.sql`(CASE WHEN ${v} ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (${v})::numeric ${Prisma.raw(op)} ${num} ELSE false END)`
    }
    case 'exists': return Prisma.sql`(${v} IS NOT NULL AND ${v} <> '')`
    case 'not_exists': return Prisma.sql`(${v} IS NULL OR ${v} = '')`
    case 'in': return Prisma.sql`lower(${v}) IN (${Prisma.join(list.length ? list : [''])})`
    case 'not_in': return Prisma.sql`(${v} IS NULL OR lower(${v}) NOT IN (${Prisma.join(list.length ? list : [''])}))`
    default: return null
  }
}

/** A Prisma where-fragment for one `cf.<key>` filter, or null when it cannot be applied (then it is ignored like other unusable filters). */
export async function customFieldCondition(field: string, operator: string, value: unknown, businessLine?: string | null): Promise<Record<string, unknown> | null> {
  const key = field.replace(/^cf\./, '')
  if (!KEY_RE.test(key)) return null
  const pred = predicate(operator, value, Prisma.sql`("customFields" ->> ${key})`)
  if (!pred) return null
  const scope = businessLine ? Prisma.sql`AND ("businessLineId" = ${businessLine} OR "businessLineId" IN (SELECT id FROM "BusinessLine" WHERE slug = ${businessLine}))` : Prisma.empty
  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "Lead" WHERE "deletedAt" IS NULL ${scope} AND ${pred}`)
  return { id: { in: rows.map((r) => r.id) } }
}
