/**
 * Layout of the content pages (services and prices) edited by the team in Marketing → Website.
 * The JSON lives in WebsiteEntry.layout (format v2), its history in WebsiteLayoutVersion (last 20). Images are the entry's own media.
 * A published page goes live with the save (the public site caches 5 minutes); drafts are checked through a private preview link.
 */
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { assertLine } from '../admin/service'
import { countBlocks, emptyPageLayout, type PageLayout } from '../pages/blocks'
import { issuePreview } from '../preview/service'
import { CONTENT_CATALOG, contentMediaRefs, effectiveContentLayout, isContentCollection, parseContentLayout } from './blocks'

export const MAX_VERSIONS = 20

async function ownedEntry(lineId: string, entryId: string) {
  await assertLine(lineId)
  const e = await db.websiteEntry.findFirst({ where: { id: entryId, businessLineId: lineId }, include: { collection: { select: { key: true, kind: true } } } })
  if (!e) throw new AdminError('Intrarea nu există', 404)
  if (!isContentCollection(e.collection.key)) throw new AdminError('Aranjarea pe blocuri este disponibilă doar pentru serviciile, prețurile și ghidurile din glosar', 409)
  return e
}

const entryMedia = (entryId: string) => db.websiteMedia.findMany({ where: { entryId, kind: 'image' }, orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, alt: true } })

export async function getContentPage(lineId: string, entryId: string) {
  const e = await ownedEntry(lineId, entryId)
  return {
    entry: { id: e.id, title: e.title, slug: e.slug, status: e.status, collection: e.collection.key, data: (e.data ?? {}) as Record<string, unknown> },
    layout: effectiveContentLayout(e.layout), catalog: CONTENT_CATALOG, media: await entryMedia(e.id),
  }
}

async function saveVersion(tx: Prisma.TransactionClient, entryId: string, layout: PageLayout, source: 'staff' | 'restore') {
  await tx.websiteLayoutVersion.create({ data: { entryId, layout: layout as unknown as Prisma.InputJsonValue, source } })
  const old = await tx.websiteLayoutVersion.findMany({ where: { entryId }, orderBy: { createdAt: 'desc' }, skip: MAX_VERSIONS, select: { id: true } })
  if (old.length) await tx.websiteLayoutVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } })
}

const putInput = z.object({ layout: z.unknown() }).strict()

export async function saveContentLayout(lineId: string, entryId: string, raw: unknown, user: { id?: string | null; name?: string | null } = {}, source: 'staff' | 'restore' = 'staff') {
  const e = await ownedEntry(lineId, entryId)
  const p = putInput.safeParse(raw)
  if (!p.success) throw new AdminError('Date invalide', 422, p.error.issues.map((i) => `${i.path.join('.') || 'cerere'}: ${i.message}`))
  const mediaIds = new Set((await entryMedia(e.id)).map((m) => m.id))
  const r = parseContentLayout(p.data.layout, mediaIds)
  if (!r.ok) throw new AdminError('Pagină invalidă', 422, r.issues)
  const changed = JSON.stringify(r.layout) !== JSON.stringify(effectiveContentLayout(e.layout))
  if (changed) {
    await db.$transaction(async (tx) => {
      await tx.websiteEntry.update({ where: { id: e.id }, data: { layout: r.layout as unknown as Prisma.InputJsonValue } })
      await saveVersion(tx, e.id, r.layout, source)
    })
    await db.activity.create({ data: { businessLineId: lineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action: 'website_content_layout', entityType: 'website_entry', entityId: e.id, entityName: e.title, details: { blocks: countBlocks(r.layout), images: contentMediaRefs(r.layout).length, status: e.status } as Prisma.InputJsonValue } })
  }
  return { changed, blocks: countBlocks(r.layout), layout: r.layout }
}

export async function listContentVersions(lineId: string, entryId: string) {
  await ownedEntry(lineId, entryId)
  const rows = await db.websiteLayoutVersion.findMany({ where: { entryId }, orderBy: { createdAt: 'desc' }, take: MAX_VERSIONS })
  return rows.map((v) => { const l = (v.layout ?? {}) as { blocks?: unknown[] }; return { id: v.id, createdAt: v.createdAt.toISOString(), source: v.source, blocks: Array.isArray(l.blocks) ? l.blocks.length : 0 } })
}

export async function restoreContentVersion(lineId: string, entryId: string, versionId: string, user: { id?: string | null; name?: string | null } = {}) {
  await ownedEntry(lineId, entryId)
  const v = await db.websiteLayoutVersion.findFirst({ where: { id: versionId, entryId } })
  if (!v) throw new AdminError('Versiunea nu există', 404)
  return saveContentLayout(lineId, entryId, { layout: v.layout }, user, 'restore')
}

const siteOf = async (lineId: string) => ((await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { siteUrl: true } }))?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://intraconstruct.ro').replace(/\/$/, '')
const PUBLIC_PATH: Record<string, string> = { preturi: '/preturi', servicii: '/lucrari', ghiduri: '/ghiduri' }

/**
 * The link to check a page: the public address when it is published; otherwise a private link (a draft is moved to the private "preview" state,
 * which is never in the public API). Each call issues a new link and the previous one stops working.
 */
export async function contentPreviewLink(lineId: string, entryId: string) {
  const e = await ownedEntry(lineId, entryId)
  const site = await siteOf(lineId)
  const path = `${PUBLIC_PATH[e.collection.key]}/${e.slug}`
  if (e.status === 'published') return { kind: 'public' as const, link: `${site}${path}`, expiresAt: null }
  if (e.status === 'suspended') throw new AdminError('Intrarea este suspendată', 409)
  if (e.status === 'draft') await db.websiteEntry.update({ where: { id: e.id }, data: { status: 'preview' } })
  const r = await issuePreview(lineId, e.id)
  return { kind: 'private' as const, link: `${site}/previzualizare-pagina/${r.token}`, expiresAt: r.expiresAt.toISOString() }
}

export { emptyPageLayout }
