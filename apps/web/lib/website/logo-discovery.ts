/**
 * Finds a company logo on the firm's own website (for the private preview only; the team reviews it before anything is published).
 *
 * - extractLogoCandidates is pure: ranked absolute URLs from a page's HTML (logo <img>, JSON-LD logo, apple-touch-icon).
 * - safeFetch refuses non-http(s) URLs and hosts that resolve to private / loopback / link-local addresses (SSRF), follows at most 3 redirects
 *   (re-checking each hop), and caps time and size.
 */
import dns from 'node:dns/promises'
import net from 'node:net'

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number) as [number, number]
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::' || v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true
    const m = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return m ? isPrivateAddress(m[1]!) : false
  }
  return true
}

async function assertPublicHost(url: URL): Promise<void> {
  if (!/^https?:$/.test(url.protocol)) throw new Error('protocol')
  if (url.username || url.password) throw new Error('credentials')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address)
  if (!addrs.length || addrs.some(isPrivateAddress)) throw new Error('private')
}

export async function safeFetch(start: string, o: { maxBytes: number; timeoutMs?: number; accept?: string }): Promise<{ url: string; type: string; body: Buffer } | null> {
  try {
    let url = new URL(start)
    for (let hop = 0; hop < 4; hop++) {
      await assertPublicHost(url)
      const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(o.timeoutMs ?? 8000), headers: { 'User-Agent': 'IntraConstructBot/1.0 (+https://intraconstruct.ro)', Accept: o.accept ?? '*/*' } })
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { url = new URL(res.headers.get('location')!, url); continue }
      if (!res.ok || !res.body) return null
      const chunks: Buffer[] = []
      let size = 0
      for await (const c of res.body as unknown as AsyncIterable<Uint8Array>) {
        size += c.length
        if (size > o.maxBytes) return null
        chunks.push(Buffer.from(c))
      }
      return { url: url.toString(), type: (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase(), body: Buffer.concat(chunks) }
    }
    return null
  } catch { return null }
}

/** Images that are not the firm's logo even when they carry "logo" in the markup: plugins (cookie banners), badges, payment / social icons, favicons. */
const NOT_A_LOGO = /cookie|consent|gdpr|poweredby|powered-by|\/plugins\/|trustpilot|badge|payment|visa|mastercard|anpc|facebook|instagram|linkedin|youtube|google|favicon|\bfav[._-]|sprite/i

const attr = (tag: string, name: string) => new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)?.slice(2).find((v) => v !== undefined)

function resolve(raw: string | undefined, base: string): string | null {
  if (!raw) return null
  const v = raw.trim().replace(/&amp;/g, '&')
  if (!v || v.startsWith('data:') || v.startsWith('javascript:')) return null
  try { const u = new URL(v, base); return /^https?:$/.test(u.protocol) && !NOT_A_LOGO.test(u.pathname) ? u.toString() : null } catch { return null }
}

/** Ranked, de-duplicated absolute logo URLs found in `html`. */
export function extractLogoCandidates(html: string, baseUrl: string): string[] {
  const out: { url: string; score: number }[] = []
  const add = (raw: string | undefined, score: number) => { const u = resolve(raw, baseUrl); if (u && !out.some((o) => o.url === u)) out.push({ url: u, score }) }
  const head = html.slice(0, 400_000)

  const imgs = head.match(/<img\b[^>]*>/gi) ?? []
  imgs.forEach((tag, i) => {
    const hay = `${attr(tag, 'src') ?? ''} ${attr(tag, 'alt') ?? ''} ${attr(tag, 'class') ?? ''} ${attr(tag, 'id') ?? ''}`.toLowerCase()
    if (!/logo/.test(hay) || /sprite|pixel|facebook|instagram|linkedin|partner|client|footer-logo.*partner/.test(hay)) return
    add(attr(tag, 'data-src') && !attr(tag, 'src')?.startsWith('http') ? attr(tag, 'data-src') : attr(tag, 'src') ?? attr(tag, 'data-src'), 100 - Math.min(i, 50) + (/\blogo\b/.test(attr(tag, 'alt')?.toLowerCase() ?? '') ? 10 : 0))
  })
  for (const m of head.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: unknown) => {
        if (Array.isArray(n)) return n.forEach(walk)
        if (n && typeof n === 'object') {
          const o = n as Record<string, unknown>
          const l = o.logo
          if (typeof l === 'string') add(l, 90)
          else if (l && typeof l === 'object') add((l as { url?: string }).url, 90)
          Object.values(o).forEach(walk)
        }
      }
      walk(JSON.parse(m[1]!))
    } catch { /* malformed JSON-LD */ }
  }
  for (const tag of head.match(/<(meta|link)\b[^>]*>/gi) ?? []) {
    if (/property\s*=\s*["']og:logo["']/i.test(tag)) add(attr(tag, 'content'), 85)
    if (/rel\s*=\s*["'][^"']*apple-touch-icon[^"']*["']/i.test(tag)) add(attr(tag, 'href'), 40)
  }
  return out.sort((a, b) => b.score - a.score).map((o) => o.url).slice(0, 6)
}

/** First candidate that is really an image of reasonable size; null when the site has no usable logo. */
export async function findLogo(websiteUrl: string): Promise<string | null> {
  const page = await safeFetch(websiteUrl, { maxBytes: 1_500_000, accept: 'text/html' })
  if (!page || !/html/.test(page.type)) return null
  for (const c of extractLogoCandidates(page.body.toString('utf8'), page.url)) {
    const img = await safeFetch(c, { maxBytes: 2_000_000, timeoutMs: 6000, accept: 'image/*' })
    if (img && /^image\/(png|jpe?g|webp|svg\+xml|gif|avif)$/.test(img.type) && img.body.length >= 300) return img.url
  }
  return null
}
