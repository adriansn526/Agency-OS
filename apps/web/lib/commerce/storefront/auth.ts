/**
 * Storefront API auth (server-to-server, from the storefront BFF).
 *
 * - `Authorization: Bearer sf_<key>`; only the SHA-256 of the key is stored, in CommerceChannel.config.apiKeyHashes.
 * - Resolves the BusinessLine of the channel → every query is scoped to that BL.
 * - In-memory fixed-window rate limit per key (single-instance deployment).
 *   TODO(security): move rate limiting to a shared store (Redis) if the ERP is ever scaled horizontally.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { db } from '@repo/db'

export interface StorefrontContext {
  businessLineId: string
  channelId: string
  stockFlagMeaning: string
}

interface CachedChannel { channelId: string; businessLineId: string; hashes: Buffer[] }
let cache: { at: number; channels: CachedChannel[] } | null = null
const CACHE_MS = 60_000

const RATE_LIMIT = Number(process.env.STOREFRONT_RATE_LIMIT_PER_MIN ?? 1200)
const windows = new Map<string, { start: number; count: number }>()

export function hashStorefrontKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function generateStorefrontKey(): { key: string; hash: string } {
  const key = `sf_${randomBytes(32).toString('base64url')}`
  return { key, hash: hashStorefrontKey(key) }
}

async function loadChannels(): Promise<CachedChannel[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.channels
  const rows = await db.commerceChannel.findMany({ where: { isEnabled: true }, select: { id: true, businessLineId: true, config: true } })
  const channels = rows.map((r) => {
    const cfg = (r.config ?? {}) as { apiKeyHashes?: unknown }
    const hashes = Array.isArray(cfg.apiKeyHashes)
      ? cfg.apiKeyHashes.filter((h): h is string => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h)).map((h) => Buffer.from(h, 'hex'))
      : []
    return { channelId: r.id, businessLineId: r.businessLineId, hashes }
  })
  cache = { at: Date.now(), channels }
  return channels
}

export function invalidateStorefrontKeyCache() { cache = null }

function rateLimited(id: string): boolean {
  const now = Date.now()
  const w = windows.get(id)
  if (!w || now - w.start >= 60_000) {
    windows.set(id, { start: now, count: 1 })
    if (windows.size > 10_000) for (const [k, v] of windows) if (now - v.start >= 60_000) windows.delete(k)
    return false
  }
  w.count++
  return w.count > RATE_LIMIT
}

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })

/**
 * Wraps a storefront handler with auth + rate limiting + generic error handling.
 * No CORS headers are emitted on purpose: browsers must never call this API directly.
 */
export function storefrontHandler<P = Record<string, string>>(
  handler: (req: Request, ctx: StorefrontContext, params: P) => Promise<unknown>,
) {
  return async (req: Request, routeCtx: { params: Promise<P> }) => {
    const auth = req.headers.get('authorization') ?? ''
    const m = /^Bearer (sf_[A-Za-z0-9_-]{20,200})$/.exec(auth)
    if (!m) return json({ error: 'Unauthorized' }, 401)
    const presented = Buffer.from(hashStorefrontKey(m[1]!), 'hex')

    let match: CachedChannel | undefined
    for (const c of await loadChannels()) {
      if (c.hashes.some((h) => h.length === presented.length && timingSafeEqual(h, presented))) { match = c; break }
    }
    if (!match) return json({ error: 'Unauthorized' }, 401)
    if (rateLimited(presented.toString('hex'))) return json({ error: 'Too many requests' }, 429)

    try {
      const feed = await db.commerceSupplierFeed.findFirst({ where: { isActive: true }, select: { stockFlagMeaning: true } })
      const ctx: StorefrontContext = { businessLineId: match.businessLineId, channelId: match.channelId, stockFlagMeaning: feed?.stockFlagMeaning ?? 'unknown' }
      const data = await handler(req, ctx, await routeCtx.params)
      if (data === null) return json({ error: 'Not found' }, 404)
      return json(data, 200)
    } catch (e) {
      if (e instanceof StorefrontInputError) return json({ error: e.message }, 400)
      console.error('[storefront]', e)
      return json({ error: 'Internal error' }, 500)
    }
  }
}

export class StorefrontInputError extends Error {}
