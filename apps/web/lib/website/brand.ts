import { db } from '@repo/db'

/**
 * Name used in what the platform says to partners and customers ("Codul X: 123456", "Echipa X").
 * A line with several sites issues one key per site and the key carries its `brandName`; otherwise the line's own name is used.
 */
export async function brandNameOf(ctx: { businessLineId: string; brandName?: string }): Promise<string> {
  if (ctx.brandName) return ctx.brandName
  const line = await db.businessLine.findUnique({ where: { id: ctx.businessLineId }, select: { name: true } })
  return line?.name ?? 'Platforma'
}
