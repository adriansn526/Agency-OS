/**
 * Writes the generated seoTitle / seoDescription to the storefront listings.
 *   npx tsx --env-file=.env.local scripts/commerce/apply-seo.ts            (dry run: counts only)
 *   npx tsx --env-file=.env.local scripts/commerce/apply-seo.ts --apply
 * Only listings whose seoTitle is empty or was generated before (seoAuto) are written; manual texts are never touched.
 * listing.updatedAt is NOT changed (it drives the sitemap lastmod). Slugs are not touched (separate step).
 */
import { db } from '@repo/db'
import { loadSeoRows } from '../../lib/commerce/seo/data'
import { buildSeo, disambiguate } from '../../lib/commerce/seo/titles'

const CHUNK = 5000
async function main() {
  const apply = process.argv.includes('--apply')
  const bl = await db.businessLine.findUnique({ where: { slug: 'ecaroseria' }, select: { id: true } })
  if (!bl) throw new Error('business line not found')
  const rows = await loadSeoRows({ businessLineId: bl.id })
  const built = rows.map((r) => ({ r, s: buildSeo(r) }))
  const titles = disambiguate(built.map(({ s }) => s.title), built.map(({ r }) => r.oeMain))
  const items = built.map(({ r, s }, i) => ({ id: r.listingId, title: titles[i]!, description: s.description }))

  const manual = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM "CommerceListing" WHERE "businessLineId" = ${bl.id} AND "seoTitle" IS NOT NULL AND NOT "seoAuto"`
  console.log(`listări de procesat: ${items.length} | cu text SEO manual (neatinse): ${Number(manual[0]?.n ?? 0)} | mod: ${apply ? 'SCRIERE' : 'dry-run'}`)
  if (!apply) return

  let written = 0
  for (let i = 0; i < items.length; i += CHUNK) {
    const part = items.slice(i, i + CHUNK)
    written += Number(await db.$executeRaw`
      UPDATE "CommerceListing" l SET "seoTitle" = u.t, "seoDescription" = u.d, "seoAuto" = true
      FROM unnest(${part.map((x) => x.id)}::text[], ${part.map((x) => x.title)}::text[], ${part.map((x) => x.description)}::text[]) AS u(id, t, d)
      WHERE l.id = u.id AND (l."seoTitle" IS NULL OR l."seoAuto")
        AND (l."seoTitle" IS DISTINCT FROM u.t OR l."seoDescription" IS DISTINCT FROM u.d OR NOT l."seoAuto")`)
  }
  console.log(`scrise: ${written}`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
