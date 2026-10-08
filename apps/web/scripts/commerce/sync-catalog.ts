/**
 * CLI: translate pending product names (resumable) and/or sync listings & prices.
 *
 *   npx tsx --env-file=.env.local scripts/commerce/sync-catalog.ts --translate --limit=600
 *   npx tsx --env-file=.env.local scripts/commerce/sync-catalog.ts --prices --bl=ecaroseria
 */
import { db } from '@repo/db'
import { translatePendingNames } from '../../lib/commerce/translate'
import { syncListingsAndPrices } from '../../lib/commerce/listings'

const has = (f: string) => process.argv.includes(`--${f}`)
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

async function main() {
  if (has('translate')) {
    const limit = Number(arg('limit') ?? 600)
    const res = await translatePendingNames({ limit, batchSize: Number(arg('batch') ?? 60), concurrency: Number(arg('concurrency') ?? 3) })
    console.log('translate:', JSON.stringify(res))
  }
  if (has('prices')) {
    const slug = arg('bl') ?? 'ecaroseria'
    const bl = await db.businessLine.findUnique({ where: { slug } })
    if (!bl) throw new Error(`Business line ${slug} not found`)
    const res = await syncListingsAndPrices(bl.id)
    console.log('prices:', JSON.stringify(res))
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('sync-catalog failed:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
