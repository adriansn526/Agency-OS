/**
 * Seed Client "David-Masini" and associated Offer
 * Run: cd apps/web && export $(grep -v '^#' .env | xargs) && npx tsx scripts/seed-david-masini.ts
 */

import { db } from '@repo/db'

async function main() {
  console.log('🌱 Seeding David-Masini...')

  const agency = await db.businessLine.findUnique({ where: { slug: 'agency' } })
  if (!agency) throw new Error('Agency business line not found')

  // 1. Create Client
  const client = await db.client.create({
    data: {
      businessLineId: agency.id,
      entityType: 'b2b',
      companyName: 'David Masini S.R.L.',
      contactPerson: 'David',
      email: 'contact@cumpar-masini-rulate.ro',
      phone: '0700000000',
      website: 'https://cumpar-masini-rulate.ro/',
      websites: ['https://cumpar-masini-rulate.ro/'],
      status: 'active',
      industry: 'Auto',
    }
  })
  console.log(`✅ Created client: ${client.companyName}`)

  // 2. Create Domain Config
  await db.clientDomainConfig.create({
    data: {
      clientId: client.id,
      domain: 'cumpar-masini-rulate.ro',
      isActive: true,
    }
  })

  // 3. Create Offer
  const blocks = [
    {
      id: 'block-intro',
      type: 'text',
      title: 'Unde am ajuns',
      data: {
        content: 'Rezultatele obținute până acum ne confirmă direcția: site-ul actual (construit anterior tot de noi) generează rezultate stabile. Acum e momentul să trecem la nivelul următor.'
      }
    },
    {
      id: 'block-next',
      type: 'text',
      title: 'Ce urmează și ce obține concret',
      data: {
        content: 'Vrem să adăugăm un instrument (evaluator instant) care transformă vizitatorii în solicitări de ofertă (lead-uri cu date complete). Deoarece această funcționalitate necesită o bază tehnică diferită de site-ul de prezentare actual, vom migra platforma ca o consecință firească pentru a susține această inovație.'
      }
    },
    {
      id: 'block-deliverables',
      type: 'features',
      title: 'Livrabile',
      data: {
        categories: [
          {
            name: 'Evaluator instant de preț',
            items: [
              'Tehnologie proprie validată',
              'Completare marcă, model, an, km',
              'Estimare pe loc (orientativă)',
              'Captare lead-uri complete cu număr de telefon'
            ]
          },
          {
            name: 'Generare Trafic & Tracking',
            items: [
              'Pagini dedicate pe orașe',
              'Pagini dedicate pe mărci auto',
              'Măsurare reală (telefoane din Google vs Reclame)'
            ]
          },
          {
            name: 'Platformă nouă',
            items: [
              'Încărcare foarte rapidă pe mobil',
              'Păstrarea conținutului și a pozițiilor Google'
            ]
          }
        ]
      }
    },
    {
      id: 'block-not-included',
      type: 'text',
      title: 'Ce NU este inclus',
      data: {
        content: 'Texte scrise de copywriter, fotografii profesionale, logo nou, administrarea campaniilor Google Ads, traduceri, integrare cu un CRM anume.'
      }
    },
    {
      id: 'block-client-needs',
      type: 'text',
      title: 'Ce ne trebuie de la tine',
      data: {
        content: 'O persoană de contact unică, feedback în maximum 3 zile lucrătoare, materialele pentru paginile de orașe. Accesele tehnice le avem deja. Termenele (în zile lucrătoare) se calculează de la primirea materialelor.'
      }
    },
    {
      id: 'block-mentions',
      type: 'text',
      title: 'Mențiune Importantă',
      data: {
        content: 'În primele 2-4 săptămâni după lansare traficul poate fluctua temporar, practică standard la orice migrare web.'
      }
    }
  ]

  const offer = await db.offer.create({
    data: {
      number: 'OFE-DAVID-001',
      businessLineId: agency.id,
      entityType: 'client',
      clientId: client.id,
      entityName: client.companyName,
      templateId: 'custom',
      templateName: 'Platformă Nouă + Evaluator Auto',
      status: 'draft',
      value: 2500, // example package value
      currency: 'EUR',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      blocks: blocks,
      modules: [
        {
          serviceId: 'dev-custom',
          serviceName: 'Dezvoltare Platformă Nouă + Pagini Orașe',
          icon: 'Monitor',
          price: 1500,
          pricingUnit: 'unic',
          setupFee: 0,
          status: 'priced',
        },
        {
          serviceId: 'dev-eval',
          serviceName: 'Modul Evaluator Instant',
          icon: 'Zap',
          price: 1000,
          pricingUnit: 'unic',
          setupFee: 0,
          status: 'priced',
        }
      ],
      createdBy: 'system'
    }
  })
  console.log(`✅ Created offer: ${offer.number}`)

  console.log('🎉 Done!')
}

main().catch(console.error).finally(() => db.$disconnect())
