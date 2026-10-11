import { db } from '@repo/db'
import { cdnBase, imageUrl } from '@/lib/commerce/images/urls'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FILE_RE = /^(EC[0-9A-F]{8})-(\d{1,2})\.(?:jpe?g|webp)$/i

/**
 * GET /api/storefront/img/EC935CE466-1.jpg → public image proxy (no API key: it is used from browsers / next/image).
 * Image n of a product is the n-th in the order used by the storefront API (manual first, then by position). The bucket key,
 * which contains the supplier's code, never appears in the URL; the bytes are streamed from the CDN with long cache headers.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const m = FILE_RE.exec((await params).file)
  const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } })
  if (!m || !cdnBase()) return notFound()
  const n = Number(m[2])
  if (n < 1 || n > 30) return notFound()
  const rows = await db.$queryRaw<Array<{ objectKey: string }>>`
    SELECT i."objectKey" FROM "CommerceProductImage" i JOIN "CommerceProduct" p ON p.id = i."productId"
    WHERE p."publicCode" = ${m[1]!.toUpperCase()} AND p."isActive"
    ORDER BY (i.source = 'manual') DESC, i.position ASC, i."objectKey" OFFSET ${n - 1} LIMIT 1`
  const url = rows[0] ? imageUrl(rows[0].objectKey) : null
  if (!url) return notFound()
  const up = await fetch(url, { signal: AbortSignal.timeout(10_000) }).catch(() => null)
  if (!up || !up.ok || !up.body) return notFound()
  return new Response(up.body, {
    headers: {
      'Content-Type': up.headers.get('content-type') ?? 'image/jpeg',
      ...(up.headers.get('content-length') ? { 'Content-Length': up.headers.get('content-length')! } : {}),
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
