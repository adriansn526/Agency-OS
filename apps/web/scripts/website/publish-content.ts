/**
 * Publishes (or takes back to draft) the SEO content of a line in bulk: glossary groups and categories, price pages and guides. Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/publish-content.ts --line intraconstruct [--apply]
 *   npx tsx --env-file=.env.local scripts/website/publish-content.ts --line intraconstruct --to draft [--apply]    # take everything back to draft
 *
 * Pages whose content is not finished are published too: the site shows them as "în construcție" (noindex, not in the sitemap).
 * Publishing also ticks "În construcție" on every entry that has no decision yet, so nothing is indexed before the team clears the tick (page by page,
 * in the entry's form); pass --no-wip to skip that.
 * Suspended entries and other collections (firms, projects, custom pages) are never touched.
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applyPublish, planPublish, type PublishTarget } from '../../lib/website/content/publish'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, to: { type: 'string', default: 'published' }, 'no-wip': { type: 'boolean', default: false }, apply: { type: 'boolean', default: false } } })
  if (!v.line) throw new Error('Folosire: --line <slug> [--to published|draft] [--no-wip] [--apply]')
  if (v.to !== 'published' && v.to !== 'draft') throw new Error('--to trebuie să fie published sau draft')
  const p = await planPublish(v.line, v.to as PublishTarget, !v['no-wip'])
  console.log(`Linia ${p.line.slug}: ${p.total} intrări trec în „${p.to === 'published' ? 'publicat' : 'ciornă'}”`)
  if (p.markWip) console.log(`  + bifa „În construcție” se pune pe ${p.wipToMark} intrări (se debifează pe rând, din formularul fiecărei intrări)`)
  for (const c of p.counts) console.log(`  ${c.collection}${c.tip ? ` (${c.tip})` : ''}: ${c.count} din starea „${c.from}”`)
  if (!v.apply) { console.log('\nREGIM DE PROBĂ: nu s-a schimbat nimic. Adaugă --apply.'); return }
  const r = await applyPublish(p)
  console.log(`\nGata: ${r.changed} intrări actualizate. Site-ul le arată după cel mult 5 minute (cache).`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
