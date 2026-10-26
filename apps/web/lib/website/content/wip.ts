/**
 * "În construcție": a tick the team puts on a service, price or guide so that the page stays published but is shown as "în construcție"
 * (notice, no content, `noindex`, out of the sitemap), whatever its content looks like. Easy to switch on and off from the entry's form.
 *
 * Stored in the entry's data (`in_constructie: 'da'`), as a system field of the content collections, so it needs no migration and no change to the
 * collection definitions: it is added to their fields when data is validated.
 */
import type { CollectionField } from '../admin/entry-data'
import { isContentCollection } from './blocks'

export const WIP_KEY = 'in_constructie'
export const WIP_VALUE = 'da'
/** Unticking stores `nu` (a decision), so a later bulk publish does not tick the page again; an entry nobody has looked at has no value at all. */
export const WIP_CLEARED = 'nu'
export const WIP_FIELD: CollectionField = { key: WIP_KEY, label: 'În construcție', type: 'select', options: [WIP_VALUE, WIP_CLEARED] }

export const isWip = (data: unknown): boolean => !!data && typeof data === 'object' && (data as Record<string, unknown>)[WIP_KEY] === WIP_VALUE

/** The collection's fields, plus the tick for content collections (unless the collection already defines it). */
export function withWipField(collectionKey: string, fields: CollectionField[]): CollectionField[] {
  return isContentCollection(collectionKey) && !fields.some((f) => f.key === WIP_KEY) ? [...fields, WIP_FIELD] : fields
}
