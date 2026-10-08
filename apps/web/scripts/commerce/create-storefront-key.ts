/**
 * CLI: create a storefront API key for a business line's commerce channel.
 * The plaintext key is printed ONCE; only its SHA-256 is stored (CommerceChannel.config.apiKeyHashes).
 *
 *   npx tsx --env-file=.env.local scripts/commerce/create-storefront-key.ts --bl=ecaroseria [--revoke-all]
 */
import { db, Prisma } from '@repo/db'
import { generateStorefrontKey } from '../../lib/commerce/storefront/auth'

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

async function main() {
  const slug = arg('bl') ?? 'ecaroseria'
  const bl = await db.businessLine.findUnique({ where: { slug }, select: { id: true } })
  if (!bl) throw new Error(`Business line ${slug} not found`)
  const ch = await db.commerceChannel.findUnique({ where: { businessLineId: bl.id } })
  if (!ch) throw new Error('Commerce channel not configured')
  const cfg = { ...((ch.config ?? {}) as Record<string, unknown>) }
  const existing = process.argv.includes('--revoke-all') ? [] : (Array.isArray(cfg.apiKeyHashes) ? cfg.apiKeyHashes : [])
  const { key, hash } = generateStorefrontKey()
  cfg.apiKeyHashes = [...existing, hash]
  await db.commerceChannel.update({ where: { id: ch.id }, data: { config: cfg as Prisma.InputJsonValue } })
  console.log(`Storefront key for ${slug} (store it in the storefront .env as ERP_STOREFRONT_KEY; it will not be shown again):`)
  console.log(key)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
