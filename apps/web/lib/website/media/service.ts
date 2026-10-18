/** Uploads, replaces and removes the images of a WebsiteEntry (logo, cover, gallery). All reads/writes are scoped to the business line. */
import { randomBytes } from 'node:crypto'
import { db } from '@repo/db'
import { AdminError } from '../admin/errors'
import { processImage, type ImageKind } from './process'
import { PUBLIC_PREFIX, spacesStore, type ObjectStore } from './storage'

export const MAX_GALLERY = 30

async function entryOf(lineId: string, entryId: string) {
  if (!lineId || lineId === 'all') throw new AdminError('Alege o linie de business', 400)
  const e = await db.websiteEntry.findFirst({ where: { id: entryId, businessLineId: lineId }, select: { id: true, logoUrl: true, coverUrl: true } })
  if (!e) throw new AdminError('Intrarea nu există', 404)
  return e
}

const newKey = (lineId: string, entryId: string, kind: ImageKind) => `${PUBLIC_PREFIX}${lineId}/${entryId}/${kind}-${randomBytes(8).toString('hex')}.webp`
const alt = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 200) || null : null)

/** Best-effort removal: a failed delete leaves an orphan object, never a broken page. */
async function tryRemove(store: ObjectStore, url: string | null | undefined) {
  const key = store.keyFromUrl(url)
  if (key) await store.remove(key).catch((e) => console.error('[website-media] could not delete', key, e instanceof Error ? e.message : e))
}

export async function uploadEntryImage(lineId: string, entryId: string, kind: ImageKind, file: Buffer, o: { alt?: unknown; store?: ObjectStore; maxImages?: number } = {}) {
  const store = o.store ?? spacesStore
  const entry = await entryOf(lineId, entryId)
  const cap = o.maxImages ?? MAX_GALLERY
  if (kind === 'image' && (await db.websiteMedia.count({ where: { entryId, kind: 'image' } })) >= cap) throw new AdminError(`Maxim ${cap} de imagini`, 409)
  const img = await processImage(file, kind)
  const key = newKey(lineId, entryId, kind)
  await store.put(key, img.buffer, img.mime)
  const url = store.publicUrl(key)
  try {
    if (kind === 'image') {
      const last = await db.websiteMedia.aggregate({ where: { entryId }, _max: { sortOrder: true } })
      return await db.websiteMedia.create({ data: { entryId, kind: 'image', storageKey: key, url, alt: alt(o.alt), mimeType: img.mime, sizeBytes: img.bytes, width: img.width, height: img.height, sortOrder: (last._max.sortOrder ?? -1) + 1 } })
    }
    const column = kind === 'logo' ? 'logoUrl' : 'coverUrl'
    const previous = entry[column]
    await db.websiteEntry.update({ where: { id: entryId }, data: { [column]: url } })
    await tryRemove(store, previous)
    return { url, width: img.width, height: img.height }
  } catch (e) {
    await store.remove(key).catch(() => undefined) // do not leave an object nobody references
    throw e
  }
}

export async function clearEntryImage(lineId: string, entryId: string, kind: 'logo' | 'cover', store: ObjectStore = spacesStore) {
  const entry = await entryOf(lineId, entryId)
  const column = kind === 'logo' ? 'logoUrl' : 'coverUrl'
  await db.websiteEntry.update({ where: { id: entryId }, data: { [column]: null } })
  await tryRemove(store, entry[column])
  return { ok: true }
}

export async function deleteGalleryImage(lineId: string, entryId: string, mediaId: string, store: ObjectStore = spacesStore) {
  await entryOf(lineId, entryId)
  const m = await db.websiteMedia.findFirst({ where: { id: mediaId, entryId }, select: { id: true, url: true, storageKey: true } })
  if (!m) throw new AdminError('Imaginea nu există', 404)
  await db.websiteMedia.delete({ where: { id: m.id } })
  await tryRemove(store, m.url)
  return { ok: true }
}

export async function updateGalleryAlt(lineId: string, entryId: string, mediaId: string, raw: unknown) {
  await entryOf(lineId, entryId)
  const m = await db.websiteMedia.findFirst({ where: { id: mediaId, entryId }, select: { id: true } })
  if (!m) throw new AdminError('Imaginea nu există', 404)
  return db.websiteMedia.update({ where: { id: m.id }, data: { alt: alt((raw as { alt?: unknown } | null)?.alt) } })
}

/** Objects that belong to an entry, to delete after the entry itself is removed. */
export async function entryObjectUrls(entryId: string): Promise<string[]> {
  const e = await db.websiteEntry.findUnique({ where: { id: entryId }, select: { logoUrl: true, coverUrl: true, media: { select: { url: true } } } })
  return e ? [e.logoUrl, e.coverUrl, ...e.media.map((m) => m.url)].filter((u): u is string => !!u) : []
}
export async function removeObjects(urls: string[], store: ObjectStore = spacesStore) {
  for (const u of urls) await tryRemove(store, u)
}
