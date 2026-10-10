/**
 * Storefront demand counters: product detail views and product searches, accumulated in memory and flushed to
 * CommerceDemandDaily / CommerceSearchDaily every few seconds in one batched upsert. Never throws, never blocks a request;
 * at most one flush interval of counts is lost on a restart. Note: these are API calls from the storefront, so crawlers are included.
 */
import { db } from '@repo/db'

const FLUSH_MS = 20_000
const MAX_KEYS = 5000
const views = new Map<string, number>()
const searches = new Map<string, number>()
let timer: ReturnType<typeof setTimeout> | null = null

export function trackProductView(productId: string) {
  if (views.size < MAX_KEYS || views.has(productId)) views.set(productId, (views.get(productId) ?? 0) + 1)
  schedule()
}

export function trackSearch(raw: string) {
  const term = raw.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80)
  if (term.length < 3) return
  if (searches.size < MAX_KEYS || searches.has(term)) searches.set(term, (searches.get(term) ?? 0) + 1)
  schedule()
}

function schedule() {
  if (timer) return
  timer = setTimeout(() => { timer = null; void flush() }, FLUSH_MS)
  timer.unref?.()
}

async function flush() {
  const v = [...views], s = [...searches]
  views.clear(); searches.clear()
  try {
    if (v.length) {
      await db.$executeRaw`
        INSERT INTO "CommerceDemandDaily" ("day", "productId", "views")
        SELECT (now() AT TIME ZONE 'Europe/Bucharest')::date, u.p, u.n FROM unnest(${v.map((x) => x[0])}::text[], ${v.map((x) => x[1])}::int[]) AS u(p, n)
        ON CONFLICT ("day", "productId") DO UPDATE SET "views" = "CommerceDemandDaily"."views" + EXCLUDED."views"`
    }
    if (s.length) {
      await db.$executeRaw`
        INSERT INTO "CommerceSearchDaily" ("day", "term", "n")
        SELECT (now() AT TIME ZONE 'Europe/Bucharest')::date, u.t, u.n FROM unnest(${s.map((x) => x[0])}::text[], ${s.map((x) => x[1])}::int[]) AS u(t, n)
        ON CONFLICT ("day", "term") DO UPDATE SET "n" = "CommerceSearchDaily"."n" + EXCLUDED."n"`
    }
  } catch (e) {
    console.error('[commerce/track] flush failed', e instanceof Error ? e.message : e)
  }
}
