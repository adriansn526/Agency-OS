/**
 * Website storefront API keys.
 *
 * Stored per business line in WebsiteChannel.apiKeys as [{ id, label, hash, createdAt, lastUsedAt }].
 * Only the SHA-256 of a key is kept; the plain key is shown once at creation. Prefix `ws_` keeps these
 * distinct from Commerce keys (`sf_`): a key only ever works against the channel that holds its hash.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** `brand` and `siteUrl` are optional: a line with several sites (e.g. the medical network) issues one key per site, and links in emails use that key's `siteUrl`. */
export interface StoredApiKey { id: string; label: string; hash: string; createdAt: string; lastUsedAt?: string | null; brand?: string; brandName?: string; siteUrl?: string }

export const hashWebsiteKey = (key: string): string => createHash('sha256').update(key).digest('hex')

export function generateWebsiteKey(label: string, site: { brand?: string; brandName?: string; siteUrl?: string } = {}): { key: string; stored: StoredApiKey } {
  const key = `ws_${randomBytes(32).toString('base64url')}`
  return {
    key,
    stored: { id: randomBytes(6).toString('hex'), label: label.trim().slice(0, 60) || 'Site', hash: hashWebsiteKey(key), createdAt: new Date().toISOString(), lastUsedAt: null, ...(site.brand ? { brand: site.brand } : {}), ...(site.brandName ? { brandName: site.brandName } : {}), ...(site.siteUrl ? { siteUrl: site.siteUrl } : {}) },
  }
}

/** Readable hashes from the channel JSON; anything malformed is ignored. */
export function parseStoredKeys(raw: unknown): StoredApiKey[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (k): k is StoredApiKey => !!k && typeof (k as StoredApiKey).hash === 'string' && /^[0-9a-f]{64}$/.test((k as StoredApiKey).hash) && typeof (k as StoredApiKey).id === 'string',
  )
}

/** Constant-time match of a presented key against stored hashes. */
export function keyMatches(stored: StoredApiKey[], presentedKey: string): boolean {
  const presented = Buffer.from(hashWebsiteKey(presentedKey), 'hex')
  let ok = false
  for (const k of stored) {
    const h = Buffer.from(k.hash, 'hex')
    if (h.length === presented.length && timingSafeEqual(h, presented)) ok = true
  }
  return ok
}

/** The stored key that matches the presented one (same constant-time comparison as keyMatches). */
export function findMatchingKey(stored: StoredApiKey[], presentedKey: string): StoredApiKey | null {
  const presented = Buffer.from(hashWebsiteKey(presentedKey), 'hex')
  let found: StoredApiKey | null = null
  for (const k of stored) {
    const h = Buffer.from(k.hash, 'hex')
    if (h.length === presented.length && timingSafeEqual(h, presented)) found = k
  }
  return found
}

export const WEBSITE_KEY_RE = /^Bearer (ws_[A-Za-z0-9_-]{20,200})$/
