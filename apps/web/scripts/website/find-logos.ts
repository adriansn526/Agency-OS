/**
 * Looks for each preview entry's logo on the firm's own website and stores it in WebsiteEntry.logoUrl. Dry run by default.
 * Only entries with status 'preview', a website and no logo are touched; nothing is published. The team reviews logos before publication.
 *
 *   npx tsx --env-file=.env.local scripts/website/find-logos.ts --line intraconstruct [--limit 50] [--apply]
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { findLogo } from '../../lib/website/logo-discovery'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, limit: { type: 'string', default: '50' }, apply: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--limit N] [--apply]')
  const line = await db.businessLine.findUnique({ where: { slug: v.line }, select: { id: true } })
  if (!line) throw new Error('Linia nu există')
  const entries = await db.websiteEntry.findMany({
    where: { businessLineId: line.id, status: 'preview', logoUrl: null, websiteUrl: { not: null } }, orderBy: { createdAt: 'asc' }, take: Number(v.limit), select: { id: true, title: true, websiteUrl: true },
  })
  console.log(`${entries.length} profile preview cu website și fără logo`)
  let found = 0, next = 0
  const worker = async () => {
    for (let e = entries[next++]; e; e = entries[next++]) {
      const logo = await findLogo(e.websiteUrl!)
      if (!logo) { console.log(`—  ${e.title}`); continue }
      found++
      console.log(`OK ${e.title}\t${logo}`)
      if (v.apply) await db.websiteEntry.update({ where: { id: e.id }, data: { logoUrl: logo } })
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker))
  console.log(`\nLogo găsit: ${found}/${entries.length}${v.apply ? ' (salvat)' : ' — REGIM DE PROBĂ, nu s-a salvat nimic; adaugă --apply'}`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
