/**
 * A firm's portfolio: projects are child entries (collection "proiecte", parentId = the firm's entry) with their own photos.
 * They go live at once, but are public only while the firm's own entry is published (enforced by the storefront queries).
 */
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { slugify } from '../admin/slug'
import { isCategorySlug } from '../glossary/taxonomy'
import type { CollectionField } from '../admin/entry-data'
import { deleteGalleryImage, removeObjects, entryObjectUrls, updateGalleryAlt, uploadEntryImage } from '../media/service'
import type { ObjectStore } from '../media/storage'

export const PROJECTS_KEY = 'proiecte'
export const MAX_PROJECTS = 50
export const MAX_PROJECT_IMAGES = 12
export const PROJECT_FIELDS: CollectionField[] = [
  { key: 'categorie', label: 'Categorie (serviciu)', type: 'text', filterable: true },
  { key: 'an', label: 'Anul execuției', type: 'number' },
]

const text = (max: number) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null))
const thisYear = () => new Date().getFullYear()

export const projectInput = z.object({
  title: z.string().trim().min(3).max(120),
  summary: text(300), body: text(5000), city: text(80),
  categorie: z.string().trim().refine(isCategorySlug, 'Categorie necunoscută').nullish().transform((v) => v ?? null),
  an: z.number().int().min(1950).max(thisYear() + 1).nullish().transform((v) => v ?? null),
}).strict()
export const projectPatch = projectInput.partial()

type Parent = { id: string; businessLineId: string; county: string | null; city: string | null; title: string; leadId: string | null }

async function ensureCollection(lineId: string) {
  return db.websiteCollection.upsert({
    where: { businessLineId_key: { businessLineId: lineId, key: PROJECTS_KEY } },
    create: { businessLineId: lineId, key: PROJECTS_KEY, name: 'Proiect', namePlural: 'Proiecte', kind: 'project', fields: PROJECT_FIELDS as unknown as Prisma.InputJsonValue, sortOrder: 30 },
    update: {},
  })
}

type ProjectRow = Prisma.WebsiteEntryGetPayload<{ include: { media: true } }>
const shape = (e: ProjectRow) => {
  const d = (e.data ?? {}) as Record<string, unknown>
  return {
    id: e.id, slug: e.slug, title: e.title, summary: e.summary, body: e.body, city: e.city,
    categorie: typeof d.categorie === 'string' ? d.categorie : null, an: typeof d.an === 'number' ? d.an : null,
    media: e.media.filter((m) => m.kind === 'image').map((m) => ({ id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height })),
  }
}

async function owned(parent: Parent, id: string) {
  const e = await db.websiteEntry.findFirst({ where: { id, parentId: parent.id, businessLineId: parent.businessLineId }, include: { media: { orderBy: { sortOrder: 'asc' } } } })
  if (!e) throw new AdminError('Proiectul nu există', 404)
  return e
}

const audit = (parent: Parent, action: string, details: Record<string, unknown>) =>
  db.activity.create({ data: { businessLineId: parent.businessLineId, userName: 'Partener (Profilul meu)', action, entityType: 'website_entry', entityId: parent.id, entityName: parent.title, leadId: parent.leadId ?? undefined, details: details as Prisma.InputJsonValue } })

export async function listProjects(parent: Parent) {
  const rows = await db.websiteEntry.findMany({ where: { parentId: parent.id, businessLineId: parent.businessLineId }, orderBy: { createdAt: 'desc' }, include: { media: { orderBy: { sortOrder: 'asc' } } } })
  return rows.map(shape)
}

export async function createProject(parent: Parent, raw: unknown) {
  const p = projectInput.safeParse(raw)
  if (!p.success) throw new AdminError('Date invalide', 422, p.error.issues.map((i) => `${i.path.join('.') || 'cerere'}: ${i.message}`))
  if ((await db.websiteEntry.count({ where: { parentId: parent.id } })) >= MAX_PROJECTS) throw new AdminError(`Maxim ${MAX_PROJECTS} de proiecte`, 409)
  const col = await ensureCollection(parent.businessLineId)
  const slug = `${slugify(p.data.title).slice(0, 60)}-${randomBytes(3).toString('hex')}`
  const data: Record<string, unknown> = {}
  if (p.data.categorie) data.categorie = p.data.categorie
  if (p.data.an) data.an = p.data.an
  const e = await db.websiteEntry.create({
    data: { businessLineId: parent.businessLineId, collectionId: col.id, parentId: parent.id, slug, title: p.data.title, summary: p.data.summary, body: p.data.body, status: 'published', publishedAt: new Date(),
            city: p.data.city ?? parent.city, county: parent.county, data: data as Prisma.InputJsonValue },
    include: { media: true },
  })
  await audit(parent, 'partner_project_create', { projectId: e.id, title: e.title })
  return shape(e)
}

export async function updateProject(parent: Parent, id: string, raw: unknown) {
  await owned(parent, id)
  const p = projectPatch.safeParse(raw)
  if (!p.success) throw new AdminError('Date invalide', 422, p.error.issues.map((i) => `${i.path.join('.') || 'cerere'}: ${i.message}`))
  const cur = await owned(parent, id)
  const d = { ...((cur.data ?? {}) as Record<string, unknown>) }
  if (p.data.categorie !== undefined) { if (p.data.categorie) d.categorie = p.data.categorie; else delete d.categorie }
  if (p.data.an !== undefined) { if (p.data.an) d.an = p.data.an; else delete d.an }
  const e = await db.websiteEntry.update({
    where: { id },
    data: { ...(p.data.title !== undefined ? { title: p.data.title } : {}), ...(p.data.summary !== undefined ? { summary: p.data.summary } : {}), ...(p.data.body !== undefined ? { body: p.data.body } : {}), ...(p.data.city !== undefined ? { city: p.data.city } : {}), data: d as Prisma.InputJsonValue },
    include: { media: { orderBy: { sortOrder: 'asc' } } },
  })
  await audit(parent, 'partner_project_edit', { projectId: id, changed: Object.keys(p.data) })
  return shape(e)
}

export async function deleteProject(parent: Parent, id: string, store?: ObjectStore) {
  await owned(parent, id)
  const urls = await entryObjectUrls(id)
  await db.websiteEntry.delete({ where: { id } })
  await removeObjects(urls, store)
  await audit(parent, 'partner_project_delete', { projectId: id })
  return { ok: true }
}

export async function addProjectImage(parent: Parent, id: string, file: Buffer, alt: unknown, store?: ObjectStore) {
  await owned(parent, id)
  const m = (await uploadEntryImage(parent.businessLineId, id, 'image', file, { alt, store, maxImages: MAX_PROJECT_IMAGES })) as { id: string; url: string; alt: string | null; width: number | null; height: number | null }
  return { id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height }
}
export async function removeProjectImage(parent: Parent, id: string, mediaId: string, store?: ObjectStore) {
  await owned(parent, id)
  return deleteGalleryImage(parent.businessLineId, id, mediaId, store)
}
export async function setProjectImageAlt(parent: Parent, id: string, mediaId: string, raw: unknown) {
  await owned(parent, id)
  const m = await updateGalleryAlt(parent.businessLineId, id, mediaId, raw)
  return { id: m.id, alt: m.alt }
}
