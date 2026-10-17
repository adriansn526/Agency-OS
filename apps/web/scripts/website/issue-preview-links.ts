/**
 * Issues preview links (token + expiry from now) for preview entries and prints them. SENDS NOTHING.
 * The expiry clock starts here, so run it right before the campaign. Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/issue-preview-links.ts --line intraconstruct --site https://intraconstruct.ro [--limit 5] [--entry <id>] [--apply]
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { issuePreview, validityDays } from '../../lib/website/preview/service'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, site: { type: 'string' }, limit: { type: 'string', default: '5' }, entry: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!v.line || !v.site) throw new Error('Folosire: --line <slug> --site <https://…> [--limit N] [--entry id] [--apply]')
  const line = await db.businessLine.findUnique({ where: { slug: v.line }, select: { id: true } })
  if (!line) throw new Error('Linia nu există')
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: line.id }, select: { config: true } })
  const days = validityDays(channel?.config)
  const entries = await db.websiteEntry.findMany({
    where: { businessLineId: line.id, status: 'preview', ...(v.entry ? { id: v.entry } : { previewSentAt: null }) }, orderBy: { createdAt: 'asc' }, take: Number(v.limit), select: { id: true, title: true },
  })
  console.log(`${entries.length} profile fără link trimis | valabilitate: ${days} zile de la generare`)
  if (!v.apply) { console.log('REGIM DE PROBĂ: nu s-a generat nimic. Adaugă --apply.'); return }
  for (const e of entries) {
    const r = await issuePreview(line.id, e.id)
    console.log(`${e.title}\t${r.expiresAt.toISOString().slice(0, 10)}\t${v.site.replace(/\/$/, '')}/previzualizare/${r.token}`)
  }
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
