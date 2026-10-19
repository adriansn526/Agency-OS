/**
 * Applies the block templates to the seeded price pages and service categories that have no layout yet.
 * Idempotent and non-destructive: an entry that already has blocks is never touched, and the FAQ is only filled when empty.
 * Nothing is published here: the templates carry the PLACEHOLDER marker, so the pages stay hidden until the team writes the intros.
 */
import { db, Prisma } from '@repo/db'
import { effectiveContentLayout } from './blocks'
import { PRICE_FAQ, priceTemplate, serviceTemplate } from './templates'

export interface TemplatePlan { line: { id: string; slug: string }; prices: { id: string; faq: boolean }[]; services: { id: string }[]; skipped: number }

export async function planTemplates(lineSlug: string): Promise<TemplatePlan> {
  const line = await db.businessLine.findUnique({ where: { slug: lineSlug }, select: { id: true, slug: true } })
  if (!line) throw new Error(`Linia „${lineSlug}” nu există`)
  const rows = await db.websiteEntry.findMany({ where: { businessLineId: line.id, collection: { key: { in: ['preturi', 'servicii'] } } }, select: { id: true, layout: true, data: true, collection: { select: { key: true } } } })
  const prices: TemplatePlan['prices'] = [], services: TemplatePlan['services'] = []
  let skipped = 0
  for (const r of rows) {
    const d = (r.data ?? {}) as Record<string, unknown>
    const has = effectiveContentLayout(r.layout).blocks.length > 0
    if (r.collection.key === 'preturi') {
      const faq = !Array.isArray(d.intrebari) || d.intrebari.length === 0
      if (has && !faq) { skipped++; continue }
      prices.push({ id: r.id, faq })
      if (has) continue
    } else if (d.tip === 'categorie' && !has) services.push({ id: r.id })
    else skipped++
  }
  return { line, prices, services, skipped }
}

export async function applyTemplates(p: TemplatePlan) {
  let layouts = 0, faqs = 0
  for (const x of [...p.prices.map((e) => ({ ...e, kind: 'preturi' as const })), ...p.services.map((e) => ({ ...e, faq: false, kind: 'servicii' as const }))]) {
    await db.$transaction(async (tx) => {
      const e = await tx.websiteEntry.findUniqueOrThrow({ where: { id: x.id }, select: { summary: true, layout: true, data: true } })
      const data = { ...((e.data ?? {}) as Record<string, unknown>) }
      let changed = false
      if (x.kind === 'preturi' && x.faq && (!Array.isArray(data.intrebari) || data.intrebari.length === 0)) { data.intrebari = PRICE_FAQ; faqs++; changed = true }
      const layout = effectiveContentLayout(e.layout).blocks.length === 0 ? (x.kind === 'preturi' ? priceTemplate({ summary: e.summary }) : serviceTemplate({ summary: e.summary })) : null
      if (layout) { layouts++; changed = true }
      if (!changed) return
      await tx.websiteEntry.update({ where: { id: x.id }, data: { ...(layout ? { layout: layout as unknown as Prisma.InputJsonValue } : {}), data: data as Prisma.InputJsonValue } })
      if (layout) await tx.websiteLayoutVersion.create({ data: { entryId: x.id, layout: layout as unknown as Prisma.InputJsonValue, source: 'seed' } })
    })
  }
  return { layouts, faqs }
}
