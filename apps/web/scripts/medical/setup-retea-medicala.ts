/**
 * Idempotent setup for the "Rețea Medicală" business line (topdoctori.ro, doctorchirurg.ro, omniamed.ro).
 *
 *   npx tsx --env-file=.env.local scripts/medical/setup-retea-medicala.ts
 *
 * Creates the line only. The Website channel (storefront key, collections) is a separate step: see docs of the
 * Website module and scripts/website/create-channel.ts.
 */
import { db } from '@repo/db'

async function main() {
  const bl = await db.businessLine.upsert({
    where: { slug: 'retea-medicala' },
    update: {},
    create: {
      slug: 'retea-medicala',
      name: 'Rețea Medicală',
      icon: '🩺',
      color: '#0ea5e9',
      domain: 'topdoctori.ro',
      config: {
        metrics: ['Medici activi', 'Cereri de consult/Lună', 'Venit recurent', 'Recenzii aprobate'],
        entityTypes: [
          {
            id: 'medici',
            icon: '🩺',
            name: 'Medic / Clinică',
            namePlural: 'Medici și clinici',
            financialFlow: 'income',
            pipeline: [
              { key: 'prospect', color: 'info', label: 'Prospect' },
              { key: 'contactat', color: 'warning', label: 'Contactat' },
              { key: 'in_discutii', color: 'accent', label: 'În discuții' },
              { key: 'onboarding', color: 'primary', label: 'Onboarding' },
              { key: 'activ', color: 'success', label: 'Activ' },
              { key: 'refuzat', color: 'destructive', label: 'Refuzat' },
            ],
            customFields: [
              { key: 'cod_parafa', type: 'text', label: 'Cod parafă CMR' },
              { key: 'specialitate', type: 'text', label: 'Specialitate' },
              { key: 'plan', type: 'select', label: 'Plan', options: ['Gratuit', 'Abonament'] },
            ],
          },
        ],
        projectTemplates: [],
        offerTemplates: [],
      },
    },
  })
  console.log(`Linia „${bl.name}” (${bl.slug}) gata, id ${bl.id}`)
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) }).finally(() => db.$disconnect())
