/** Saving, history and restore of a firm's home layout. Changes are live at once; every change is a version (last 20 kept) and an activity-log entry. */
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { canonical, CATALOG, defaultLayout, effectiveLayout, parseLayout, type Layout } from './blocks'

export const MAX_VERSIONS = 20

type Parent = { id: string; businessLineId: string; title: string; leadId: string | null; layout: unknown }

const audit = (e: Parent, action: string, details: Record<string, unknown>) =>
  db.activity.create({ data: { businessLineId: e.businessLineId, userName: 'Partener (Profilul meu)', action, entityType: 'website_entry', entityId: e.id, entityName: e.title, leadId: e.leadId ?? undefined, details: details as Prisma.InputJsonValue } })

const summary = (l: Layout) => ({ blocks: l.blocks.length, enabled: l.blocks.filter((b) => b.enabled).length, types: l.blocks.filter((b) => b.enabled).map((b) => b.type) })

export function getLayout(e: Parent) {
  return { layout: effectiveLayout(e.layout), customized: e.layout != null, catalog: CATALOG }
}

async function write(e: Parent, layout: Layout, source: 'partner' | 'restore' | 'reset', stored: Layout | null) {
  await db.$transaction(async (tx) => {
    await tx.websiteEntry.update({ where: { id: e.id }, data: { layout: stored ? (stored as unknown as Prisma.InputJsonValue) : Prisma.DbNull } })
    await tx.websiteLayoutVersion.create({ data: { entryId: e.id, layout: layout as unknown as Prisma.InputJsonValue, source } })
    const old = await tx.websiteLayoutVersion.findMany({ where: { entryId: e.id }, orderBy: { createdAt: 'desc' }, skip: MAX_VERSIONS, select: { id: true } })
    if (old.length) await tx.websiteLayoutVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } })
  })
  await audit(e, `partner_layout_${source}`, summary(layout))
}

export async function saveLayout(e: Parent, raw: unknown, source: 'partner' | 'restore' = 'partner') {
  const r = parseLayout(raw)
  if (!r.ok) throw new AdminError('Aranjament invalid', 422, r.issues)
  if (canonical(r.layout) === canonical(effectiveLayout(e.layout))) return { changed: false, ...getLayout(e) }
  await write(e, r.layout, source, r.layout)
  return { changed: true, layout: r.layout, customized: true, catalog: CATALOG }
}

export async function resetLayout(e: Parent) {
  if (e.layout == null) return { changed: false, ...getLayout(e) }
  await write(e, defaultLayout(), 'reset', null)
  return { changed: true, layout: defaultLayout(), customized: false, catalog: CATALOG }
}

export async function listVersions(entryId: string) {
  const rows = await db.websiteLayoutVersion.findMany({ where: { entryId }, orderBy: { createdAt: 'desc' }, take: MAX_VERSIONS })
  return rows.map((v) => ({ id: v.id, createdAt: v.createdAt.toISOString(), source: v.source, summary: summary(effectiveLayout(v.layout)) }))
}

export async function restoreVersion(e: Parent, versionId: string) {
  const v = await db.websiteLayoutVersion.findFirst({ where: { id: versionId, entryId: e.id } })
  if (!v) throw new AdminError('Versiunea nu există', 404)
  return saveLayout(e, v.layout, 'restore')
}
