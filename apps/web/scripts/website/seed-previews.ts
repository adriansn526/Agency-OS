/**
 * Seeds private preview profiles for the leads of a marketing segment. Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/website/seed-previews.ts --line intraconstruct --segment <id> [--limit 250]
 *   ... --apply --confirm-count=<number announced by the dry run>
 */
import { parseArgs } from 'node:util'
import { db } from '@repo/db'
import { applyPreviewSeed, planPreviewSeed } from '../../lib/website/preview-seed'
import { checkConfirm } from '../../lib/prospectare/import-leads'

async function main() {
  const { values: v } = parseArgs({ options: { line: { type: 'string' }, segment: { type: 'string' }, limit: { type: 'string', default: '250' }, apply: { type: 'boolean', default: false }, 'confirm-count': { type: 'string' } } })
  if (!v.line || !v.segment) throw new Error('Folosire: --line <slug> --segment <id> [--limit N] [--apply --confirm-count=N]')
  const limit = Number(v.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000) throw new Error('--limit trebuie să fie între 1 și 5000')
  console.log(`Bază de date: ${(process.env.DATABASE_URL ?? '').replace(/^.*@/, '')}\n`)
  const p = await planPreviewSeed({ line: v.line, segmentId: v.segment, limit })
  console.log(`Segment: ${p.segment.name} | în segment: ${p.inSegment} | deja cu profil: ${p.alreadySeeded} | eligibile: ${p.eligible}`)
  console.log(`De creat: ${p.entries.length} | colecția „companii”: ${p.collectionExists ? 'există' : 'va fi creată'} | bogăție date min/medie/max: ${p.richness.min}/${p.richness.avg}/${p.richness.max}`)
  console.log('Pe județ (top 10):', Object.entries(p.byCounty).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${k} ${n}`).join(', '))
  console.log('Exemple:', JSON.stringify(p.entries.slice(0, 2), null, 1))
  if (!v.apply) { console.log(`\nREGIM DE PROBĂ: nu s-a scris nimic. Pentru scriere: --apply --confirm-count=${p.entries.length}`); return }
  checkConfirm(p.entries.length, v['confirm-count'])
  const r = await applyPreviewSeed(p)
  console.log(`\nGata: ${r.created} profile preview create din ${r.planned} planificate. Nu s-a publicat nimic, nu s-a generat niciun token.`)
}
main().catch((e) => { console.error('EȘEC:', e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
