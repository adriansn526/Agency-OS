/**
 * Business-line scope of suppliers.
 *
 * Supplier.businessLineIds EMPTY = shared by all lines (software vendors, banks…). A non-empty list restricts the supplier to those lines.
 * Existing suppliers all have the empty list, so introducing the column changes nothing until someone scopes a supplier.
 */
import { db, Prisma } from '@repo/db'

export class ScopeError extends Error {}

/** Where-fragment: suppliers visible on a given line (shared + that line). `null`/"all" = no restriction (consolidated view). */
export function visibleOnLine(businessLineId: string | null | undefined): Prisma.SupplierWhereInput | null {
  if (!businessLineId || businessLineId === 'all') return null
  return { OR: [{ businessLineIds: { isEmpty: true } }, { businessLineIds: { has: businessLineId } }] }
}

/** Validates a list coming from the client: strings, existing business lines, no duplicates. [] means "all lines". */
export async function normalizeBusinessLineIds(input: unknown): Promise<string[]> {
  if (input == null) return []
  if (!Array.isArray(input) || input.some((x) => typeof x !== 'string' || !/^[A-Za-z0-9_-]{3,60}$/.test(x))) throw new ScopeError('Lista de linii de business este invalidă')
  const ids = [...new Set(input as string[])]
  if (ids.length === 0) return []
  const found = await db.businessLine.findMany({ where: { id: { in: ids } }, select: { id: true } })
  if (found.length !== ids.length) throw new ScopeError('Una dintre liniile de business nu există')
  return ids
}
