/**
 * CLI: enable the Website module for a business line and/or issue a storefront API key.
 *
 *   npx tsx --env-file=.env.local scripts/website/create-channel.ts <line-slug> --site-url=https://intraconstruct.ro [--key-label="Frontend"]
 *
 * A line with several sites issues one key per site: --key-label="TopDoctori" --key-brand=topdoctori --key-site-url=https://topdoctori.ro
 * (links in emails use the key's site; without them the channel's site-url is used).
 *
 * The plain key is printed once and cannot be recovered (only its hash is stored). Safe to re-run:
 * an existing channel is kept, and a key is only added when --key-label is given.
 */
import { db } from '@repo/db'
import { generateWebsiteKey, parseStoredKeys } from '../../lib/website/storefront/keys'

async function main() {
  const slug = process.argv[2]
  if (!slug || slug.startsWith('--')) throw new Error('Usage: create-channel.ts <line-slug> [--site-url=...] [--key-label=...]')
  const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
  const siteUrl = arg('site-url')
  const keyLabel = arg('key-label')
  const keyBrand = arg('key-brand')
  const keySiteUrl = arg('key-site-url')

  const line = await db.businessLine.findUnique({ where: { slug }, select: { id: true, name: true } })
  if (!line) throw new Error(`Linia „${slug}” nu există`)

  const existing = await db.websiteChannel.findUnique({ where: { businessLineId: line.id } })
  const keys = parseStoredKeys(existing?.apiKeys)
  let plain: string | null = null
  if (keyLabel) {
    const g = generateWebsiteKey(keyLabel, { brand: keyBrand, siteUrl: keySiteUrl })
    keys.push(g.stored)
    plain = g.key
  }

  await db.websiteChannel.upsert({
    where: { businessLineId: line.id },
    create: { businessLineId: line.id, siteUrl: siteUrl ?? null, apiKeys: keys as never },
    update: { ...(siteUrl ? { siteUrl } : {}), ...(keyLabel ? { apiKeys: keys as never } : {}) },
  })
  console.log(`${existing ? 'Canal existent' : 'Canal creat'} pentru ${line.name} (${keys.length} chei)`)
  if (plain) console.log(`\nCheia API (se afișează o singură dată):\n${plain}\n`)
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) }).finally(() => db.$disconnect())
