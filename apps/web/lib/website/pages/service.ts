/**
 * Custom pages of a firm (layout v2, edited with Puck): child entries of the collection "pagini" (parentId = the firm's entry), like the portfolio projects.
 * The page's JSON lives in WebsiteEntry.layout, its history in WebsiteLayoutVersion (last 20), the SEO texts in seoTitle / seoDescription.
 * Creating pages is part of the "abonament" plan; a page is public only while it is published AND the firm's own entry is published.
 */
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { slugify } from '../admin/slug'
import type { CollectionField } from '../admin/entry-data'
import { planActive } from '../plan'
import { countBlocks, emptyPageLayout, mediaRefs, PAGE_CATALOG, parsePageLayout, type PageLayout } from './blocks'

export const PAGES_KEY = 'pagini'
export const MAX_PAGES = 5
export const MAX_VERSIONS = 20
const PAGE_FIELDS: CollectionField[] = [{ key: 'pagina', label: 'Adresa paginii', type: 'text' }]

type Parent = { id: string; slug: string; businessLineId: string; title: string; leadId: string | null; plan: string; planUntil: Date | null }

const audit = (p: Parent, action: string, details: Record<string, unknown>) =>
  db.activity.create({ data: { businessLineId: p.businessLineId, userName: 'Partener (Profilul meu)', action, entityType: 'website_entry', entityId: p.id, entityName: p.title, leadId: p.leadId ?? undefined, details: details as Prisma.InputJsonValue } })

export const policy = (p: Parent, now = new Date()) => ({ canCreate: planActive(p, now), max: MAX_PAGES, reason: planActive(p, now) ? null : 'Paginile personalizate sunt incluse în abonament.' })

const ensureCollection = (lineId: string) => db.websiteCollection.upsert({
  where: { businessLineId_key: { businessLineId: lineId, key: PAGES_KEY } },
  create: { businessLineId: lineId, key: PAGES_KEY, name: 'Pagină', namePlural: 'Pagini', kind: 'article', fields: PAGE_FIELDS as unknown as Prisma.InputJsonValue, sortOrder: 40 },
  update: {},
})

type Row = Prisma.WebsiteEntryGetPayload<object>
const pageSlug = (r: Row) => String(((r.data ?? {}) as { pagina?: unknown }).pagina ?? '')
const brief = (r: Row) => ({ id: r.id, title: r.title, slug: pageSlug(r), status: r.status, updatedAt: r.updatedAt.toISOString(), publishedAt: r.publishedAt?.toISOString() ?? null })

async function owned(parent: Parent, id: string): Promise<Row> {
  const r = await db.websiteEntry.findFirst({ where: { id, parentId: parent.id, businessLineId: parent.businessLineId, collection: { key: PAGES_KEY } } })
  if (!r) throw new AdminError('Pagina nu există', 404)
  return r
}
const effective = (r: Row): PageLayout => {
  const v = parsePageLayout(r.layout, { mediaIds: new Set(mediaRefsOf(r.layout)) })
  return v.ok ? v.layout : emptyPageLayout()
}
/** Stored layouts were validated on save; to read one back its own references count as known. */
function mediaRefsOf(raw: unknown): string[] { const v = parsePageLayout(raw, { mediaIds: new Set(allIds(raw)) }); return v.ok ? mediaRefs(v.layout) : [] }
function allIds(raw: unknown): string[] { const out: string[] = []; const walk = (x: unknown) => { if (typeof x === 'string' && /^[A-Za-z0-9_-]{10,40}$/.test(x)) out.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk) }; walk(raw); return out }

async function firmMedia(parentId: string) {
  const rows = await db.websiteMedia.findMany({ where: { entryId: parentId, kind: 'image' }, orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, alt: true } })
  return rows
}

export async function listPages(parent: Parent, now = new Date()) {
  const rows = await db.websiteEntry.findMany({ where: { parentId: parent.id, businessLineId: parent.businessLineId, collection: { key: PAGES_KEY } }, orderBy: { createdAt: 'asc' } })
  return { policy: policy(parent, now), items: rows.map(brief) }
}

const createInput = z.object({ title: z.string().trim().min(2).max(120) }).strict()

export async function createPage(parent: Parent, raw: unknown, now = new Date()) {
  const p = createInput.safeParse(raw)
  if (!p.success) throw new AdminError('Date invalide', 422, p.error.issues.map((i) => `${i.path.join('.') || 'cerere'}: ${i.message}`))
  if (!planActive(parent, now)) throw new AdminError('Paginile personalizate sunt incluse în abonament.', 403)
  const col = await ensureCollection(parent.businessLineId)
  const existing = await db.websiteEntry.findMany({ where: { parentId: parent.id, collectionId: col.id }, select: { data: true } })
  if (existing.length >= MAX_PAGES) throw new AdminError(`Maxim ${MAX_PAGES} pagini`, 409)
  const taken = new Set(existing.map((e) => String(((e.data ?? {}) as { pagina?: unknown }).pagina ?? '')))
  const base = slugify(p.data.title).slice(0, 50) || 'pagina'
  let slug = base
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`
  const e = await db.websiteEntry.create({
    data: { businessLineId: parent.businessLineId, collectionId: col.id, parentId: parent.id, slug: `${parent.slug}-${slug}-${randomBytes(3).toString('hex')}`.slice(0, 120), title: p.data.title, status: 'draft',
            county: null, data: { pagina: slug } as Prisma.InputJsonValue, layout: emptyPageLayout() as unknown as Prisma.InputJsonValue },
  })
  await audit(parent, 'partner_page_create', { pageId: e.id, title: e.title })
  return brief(e)
}

export async function getPage(parent: Parent, id: string) {
  const r = await owned(parent, id)
  return { ...brief(r), seoTitle: r.seoTitle, seoDescription: r.seoDescription, layout: effective(r), catalog: PAGE_CATALOG, media: await firmMedia(parent.id) }
}

const patchInput = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  seoTitle: z.string().trim().max(160).nullish().transform((v) => (v ? v : null)).optional(),
  seoDescription: z.string().trim().max(320).nullish().transform((v) => (v ? v : null)).optional(),
  layout: z.unknown().optional(),
  status: z.enum(['draft', 'published']).optional(),
}).strict()

async function saveVersion(tx: Prisma.TransactionClient, entryId: string, layout: PageLayout, source: 'partner' | 'restore') {
  await tx.websiteLayoutVersion.create({ data: { entryId, layout: layout as unknown as Prisma.InputJsonValue, source } })
  const old = await tx.websiteLayoutVersion.findMany({ where: { entryId }, orderBy: { createdAt: 'desc' }, skip: MAX_VERSIONS, select: { id: true } })
  if (old.length) await tx.websiteLayoutVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } })
}

export async function updatePage(parent: Parent, id: string, raw: unknown, o: { source?: 'partner' | 'restore'; now?: Date } = {}) {
  const cur = await owned(parent, id)
  const p = patchInput.safeParse(raw)
  if (!p.success) throw new AdminError('Date invalide', 422, p.error.issues.map((i) => `${i.path.join('.') || 'cerere'}: ${i.message}`))
  const d = p.data
  let layout: PageLayout | null = null
  if (d.layout !== undefined) {
    const mediaIds = new Set((await firmMedia(parent.id)).map((m) => m.id))
    const r = parsePageLayout(d.layout, { mediaIds })
    if (!r.ok) throw new AdminError('Pagină invalidă', 422, r.issues)
    layout = r.layout
  }
  const finalLayout = layout ?? effective(cur)
  if (d.status === 'published' && countBlocks(finalLayout) === 0) throw new AdminError('Adaugă cel puțin un bloc înainte să publici pagina', 422)
  const layoutChanged = layout !== null && JSON.stringify(layout) !== JSON.stringify(effective(cur))
  const now = o.now ?? new Date()
  const row = await db.$transaction(async (tx) => {
    const e = await tx.websiteEntry.update({
      where: { id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}), ...(d.seoTitle !== undefined ? { seoTitle: d.seoTitle } : {}), ...(d.seoDescription !== undefined ? { seoDescription: d.seoDescription } : {}),
        ...(layoutChanged ? { layout: layout as unknown as Prisma.InputJsonValue } : {}),
        ...(d.status !== undefined ? { status: d.status, ...(d.status === 'published' && !cur.publishedAt ? { publishedAt: now } : {}) } : {}),
      },
    })
    if (layoutChanged) await saveVersion(tx, id, layout!, o.source ?? 'partner')
    return e
  })
  await audit(parent, 'partner_page_edit', { pageId: id, changed: Object.keys(d).filter((k) => (d as Record<string, unknown>)[k] !== undefined), blocks: countBlocks(finalLayout), status: row.status })
  return { ...brief(row), seoTitle: row.seoTitle, seoDescription: row.seoDescription, changed: layoutChanged || Object.keys(d).some((k) => k !== 'layout') }
}

export async function deletePage(parent: Parent, id: string) {
  const r = await owned(parent, id)
  await db.websiteEntry.delete({ where: { id } })
  await audit(parent, 'partner_page_delete', { pageId: id, title: r.title })
  return { ok: true }
}

export async function listVersions(parent: Parent, id: string) {
  await owned(parent, id)
  const rows = await db.websiteLayoutVersion.findMany({ where: { entryId: id }, orderBy: { createdAt: 'desc' }, take: MAX_VERSIONS })
  return rows.map((v) => { const l = (v.layout ?? {}) as { blocks?: unknown[] }; return { id: v.id, createdAt: v.createdAt.toISOString(), source: v.source, blocks: Array.isArray(l.blocks) ? l.blocks.length : 0 } })
}

export async function restoreVersion(parent: Parent, id: string, versionId: string) {
  await owned(parent, id)
  const v = await db.websiteLayoutVersion.findFirst({ where: { id: versionId, entryId: id } })
  if (!v) throw new AdminError('Versiunea nu există', 404)
  return updatePage(parent, id, { layout: v.layout }, { source: 'restore' })
}
