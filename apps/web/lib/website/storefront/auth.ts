/**
 * Website storefront API auth (server-to-server, from the site's backend).
 *
 * - `Authorization: Bearer ws_<key>`, matched against WebsiteChannel.apiKeys hashes.
 * - Resolves the BusinessLine of the channel: every query is scoped to that line.
 * - In-memory fixed-window rate limit per key (single-instance deployment).
 * - No CORS headers on purpose: browsers must never call this API directly (the key would be public).
 */
import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { hashWebsiteKey, keyMatches, parseStoredKeys, WEBSITE_KEY_RE, type StoredApiKey } from './keys'

export interface WebsiteContext { businessLineId: string; channelId: string }

interface CachedChannel { channelId: string; businessLineId: string; keys: StoredApiKey[] }
let cache: { at: number; channels: CachedChannel[] } | null = null
const CACHE_MS = 60_000

const RATE_LIMIT = Number(process.env.WEBSITE_RATE_LIMIT_PER_MIN ?? 1200)
const windows = new Map<string, { start: number; count: number }>()

export class WebsiteInputError extends Error {}

async function loadChannels(): Promise<CachedChannel[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.channels
  const rows = await db.websiteChannel.findMany({ where: { isEnabled: true }, select: { id: true, businessLineId: true, apiKeys: true } })
  const channels = rows.map((r) => ({ channelId: r.id, businessLineId: r.businessLineId, keys: parseStoredKeys(r.apiKeys) }))
  cache = { at: Date.now(), channels }
  return channels
}

export function invalidateWebsiteKeyCache() { cache = null }

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

const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: HEADERS })

export function websiteHandler<P = Record<string, string>>(
  handler: (req: Request, ctx: WebsiteContext, params: P) => Promise<unknown>,
) {
  return async (req: Request, routeCtx: { params: Promise<P> }) => {
    const m = WEBSITE_KEY_RE.exec(req.headers.get('authorization') ?? '')
    if (!m) return json({ error: 'Unauthorized' }, 401)
    const presented = m[1]!

    const match = (await loadChannels()).find((c) => keyMatches(c.keys, presented))
    if (!match) return json({ error: 'Unauthorized' }, 401)
    if (rateLimited(hashWebsiteKey(presented))) return json({ error: 'Too many requests' }, 429)

    try {
      const data = await handler(req, { businessLineId: match.businessLineId, channelId: match.channelId }, await routeCtx.params)
      if (data instanceof Response) return data
      if (data === null) return json({ error: 'Not found' }, 404)
      return json(data, 200)
    } catch (e) {
      if (e instanceof WebsiteInputError) return json({ error: e.message }, 400)
      console.error('[website-storefront]', e)
      return json({ error: 'Internal error' }, 500)
    }
  }
}
