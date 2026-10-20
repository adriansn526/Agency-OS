/**
 * Puts the hero ticks, the firms list and the request form of the service and price pages into their layouts as blocks
 * (they used to be fixed on the public site). Dry run by default; idempotent; saves a version (source "seed") per changed page.
 * Run it AFTER the agency-os release that knows these blocks is live, otherwise the API drops the layout it cannot read.
 *
 *   npx tsx --env-file=.env.local scripts/website/migrate-content-blocks.ts --line intraconstruct [--apply]
 */
import { parseArgs } from 'node:util'
import { db, Prisma } from '@repo/db'
import { effectiveContentLayout, parseContentLayout } from '../../lib/website/content/blocks'
import { upgradeBlocks } from '../../lib/website/content/migrate'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--apply]')
  const line = await db.businessLine.findUnique({ where: { slug: v.line }, select: { id: true } })
  if (!line) throw new Error(`Linia „${v.line}” nu există`)
  const rows = await db.websiteEntry.findMany({ where: { businessLineId: line.id, collection: { key: { in: ['servicii', 'preturi'] } }, NOT: { layout: { equals: Prisma.DbNull } } }, select: { id: true, slug: true, title: true, layout: true, collection: { select: { key: true } } } })
  let n = 0
  for (const r of rows) {
    const cur = effectiveContentLayout(r.layout)
    const next = upgradeBlocks(cur.blocks, r.collection.key as 'servicii' | 'preturi')
    if (!next) continue
    const parsed = parseContentLayout({ version: 2, blocks: next }, new Set((await db.websiteMedia.findMany({ where: { entryId: r.id }, select: { id: true } })).map((m) => m.id)))
    if (!parsed.ok) { console.log(`SĂRIT ${r.collection.key}/${r.slug}: ${parsed.issues.join('; ')}`); continue }
    console.log(`${v.apply ? 'ACTUALIZAT' : 'de actualizat'} ${r.collection.key}/${r.slug}: ${cur.blocks.length} → ${parsed.layout.blocks.length} blocuri`)
    n++
    if (!v.apply) continue
    await db.$transaction(async (tx) => {
      const layout = parsed.layout as unknown as Prisma.InputJsonValue
      await tx.websiteEntry.update({ where: { id: r.id }, data: { layout } })
      await tx.websiteLayoutVersion.create({ data: { entryId: r.id, layout, source: 'seed' } })
    })
  }
  console.log(n ? (v.apply ? `\nGata: ${n} pagini.` : `\nREGIM DE PROBĂ: ${n} pagini ar fi actualizate. Adaugă --apply.`) : '\nNimic de actualizat.')
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
