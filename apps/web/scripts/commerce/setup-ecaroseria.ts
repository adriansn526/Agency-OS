/**
 * One-time / idempotent setup for the eCaroseria business line + supplier feed.
 *
 *   npx tsx scripts/commerce/setup-ecaroseria.ts --feed-dir=eCaroseria/docs/feed
 *
 * --feed-dir is relative to COMMERCE_FEED_ROOT.
 */
import { db } from '@repo/db'
import { ensureCategories } from '../../lib/commerce/feed/import'

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')

async function main() {
  const feedDir = arg('feed-dir') ?? 'eCaroseria/docs/feed'

  const bl = await db.businessLine.upsert({
    where: { slug: 'ecaroseria' },
    update: {},
    create: {
      slug: 'ecaroseria',
      name: 'eCaroseria',
      icon: '🚗',
      color: '#f97316',
      domain: 'ecaroseria.ro',
      config: {
        metrics: ['Comenzi/Lună', 'Valoare medie coș', 'Marjă brută', 'Rată retur'],
        entityTypes: [
          {
            id: 'customers',
            icon: '👤',
            name: 'Client',
            namePlural: 'Clienți',
            financialFlow: 'income',
            pipeline: [
              { key: 'nou', color: 'info', label: 'Nou' },
              { key: 'comanda', color: 'warning', label: 'Comandă' },
              { key: 'livrat', color: 'success', label: 'Livrat' },
            ],
            customFields: [{ key: 'vehicul', type: 'text', label: 'Vehicul' }],
          },
        ],
        projectTemplates: [],
        offerTemplates: [],
      },
    },
  })

  await db.commerceChannel.upsert({
    where: { businessLineId: bl.id },
    update: {},
    create: {
      businessLineId: bl.id,
      storefrontUrl: 'https://ecaroseria.ro',
      vatRate: 21,
      transportPct: 12,
      defaultMarkupPct: 35,
      minMarginRon: 15,
      roundingMode: '99',
    },
  })

  const feed = await db.commerceSupplierFeed.upsert({
    where: { code: 'gr-main' },
    update: { sourceConfig: { dir: feedDir } },
    create: {
      code: 'gr-main',
      name: 'Furnizor GR — caroserie (PRICELIST/GENUINE/REFAR/STOCK)',
      format: 'gr-txt-v1',
      sourceType: 'local',
      sourceConfig: { dir: feedDir },
      encoding: 'ISO-8859-7',
      currency: 'EUR',
      stockFlagMeaning: 'unknown',
    },
  })

  await ensureCategories()

  // Default pricing rules (editable in ERP). Higher priority wins.
  const rules = await db.commercePricingRule.count({ where: { businessLineId: bl.id } })
  if (rules === 0) {
    await db.commercePricingRule.createMany({
      data: [
        { businessLineId: bl.id, name: 'Piese foarte ieftine (< 50 RON cost)', priority: 200, costMax: 50, markupPct: 80, minMarginRon: 20 },
        { businessLineId: bl.id, name: 'Piese ieftine (50–200 RON cost)', priority: 150, costMin: 50, costMax: 200, markupPct: 45, minMarginRon: 25 },
        { businessLineId: bl.id, name: 'Piese medii (200–800 RON cost)', priority: 120, costMin: 200, costMax: 800, markupPct: 32 },
        { businessLineId: bl.id, name: 'Piese scumpe (> 800 RON cost)', priority: 110, costMin: 800, markupPct: 22 },
      ],
    })
  }

  console.log('✔ BusinessLine:', bl.slug, bl.id)
  console.log('✔ Feed:', feed.code, '→', feedDir)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Setup failed:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
