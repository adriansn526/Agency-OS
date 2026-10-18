/**
 * Copies externally linked logos into our bucket. Dry run by default.
 * By default only firms that accepted their preview (lead.customFields.preview_raspuns = 'acceptat'); --all-preview takes every preview entry.
 *
 *   npx tsx --env-file=.env.local scripts/website/adopt-logos.ts --line intraconstruct [--all-preview] [--limit 50] [--apply]
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { adoptRemoteLogo } from '../../lib/website/media/adopt'
import { spacesStore } from '../../lib/website/media/storage'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, 'all-preview': { type: 'boolean', default: false }, limit: { type: 'string', default: '50' }, apply: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--all-preview] [--limit N] [--apply]')
  const line = await db.businessLine.findUnique({ where: { slug: v.line }, select: { id: true } })
  if (!line) throw new Error('Linia nu există')
  const rows = await db.websiteEntry.findMany({
    where: { businessLineId: line.id, logoUrl: { not: null }, ...(v['all-preview'] ? { status: 'preview' } : { leadId: { not: null } }) },
    orderBy: { createdAt: 'asc' }, select: { id: true, title: true, logoUrl: true, leadId: true },
  })
  let candidates = rows.filter((r) => !spacesStore.keyFromUrl(r.logoUrl))
  if (!v['all-preview']) {
    const accepted = new Set((await db.lead.findMany({ where: { id: { in: candidates.map((c) => c.leadId!) }, customFields: { path: ['preview_raspuns'], equals: 'acceptat' } }, select: { id: true } })).map((l) => l.id))
    candidates = candidates.filter((c) => accepted.has(c.leadId!))
  }
  candidates = candidates.slice(0, Number(v.limit))
  console.log(`${candidates.length} logo-uri externe de copiat (${v['all-preview'] ? 'toate profilele preview' : 'firme care au acceptat'})`)
  if (!v.apply) { for (const c of candidates.slice(0, 10)) console.log(`  ${c.title}\t${c.logoUrl}`); console.log('\nREGIM DE PROBĂ: nu s-a copiat nimic. Adaugă --apply.'); return }
  const tally: Record<string, number> = {}
  for (const c of candidates) {
    const r = await adoptRemoteLogo(line.id, c.id)
    tally[r.status] = (tally[r.status] ?? 0) + 1
    console.log(`${r.status.padEnd(14)} ${c.title}${r.reason ? ` (${r.reason})` : ''}`)
  }
  console.log('\nRezultat:', tally)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
