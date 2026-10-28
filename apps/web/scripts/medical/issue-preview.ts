/**
 * Issues (or re-issues) the private activation link of a doctor profile in status `preview`. The plain link is printed once; only its hash is stored.
 * Issuing starts the expiry clock (default 14 days). Nothing is sent: the link is passed on by the team (or by a campaign once the legal texts are ready).
 *
 *   npx tsx --env-file=.env.local scripts/medical/issue-preview.ts --slug dr-mihaela-madalina-tartalea [--site https://topdoctori.ro] [--days 14]
 */
import { db } from '@repo/db'
import { issuePreview } from '../../lib/website/preview/service'

const arg = (n: string) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); if (a) return a.slice(n.length + 3); const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined }

async function main() {
  const slug = arg('slug')
  if (!slug) throw new Error('Usage: issue-preview.ts --slug <slug> [--site https://topdoctori.ro] [--days N]')
  const line = await db.businessLine.findUnique({ where: { slug: 'retea-medicala' }, select: { id: true } })
  if (!line) throw new Error('Linia retea-medicala nu există')
  const e = await db.websiteEntry.findFirst({ where: { businessLineId: line.id, collection: { key: 'companii' }, slug }, select: { id: true } })
  if (!e) throw new Error(`Profilul ${slug} nu există`)
  const r = await issuePreview(line.id, e.id, { days: arg('days') ? Number(arg('days')) : undefined })
  console.log(`${(arg('site') ?? 'https://topdoctori.ro').replace(/\/$/, '')}/p/${r.token}\nValabil ${r.days} zile (până la ${r.expiresAt.toISOString().slice(0, 10)}).`)
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) }).finally(() => db.$disconnect())
