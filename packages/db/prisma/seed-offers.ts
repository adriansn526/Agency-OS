// packages/db/prisma/seed-offers.ts
// ─── Offers Seed ───
// Imports 2 mock offers from packages/mock-data/src/offers.ts into the DB.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Mock offer data (mirrors packages/mock-data/src/offers.ts) ───
// We inline the data here so we don't need to build the mock-data package or
// deal with TS import path issues from the prisma directory.

const seedOffers = [
  {
    number: 'OF-2026-001',
    businessLine: 'agency',
    entityType: 'client',
    entityName: 'MARYSTELV S.R.L.',
    templateId: 'tpl-seo-ads',
    templateName: 'Campanie Publicitate SEO & Google Ads',
    status: 'trimisa',
    value: 700,
    currency: 'EUR',
    validUntil: '2026-06-01',
    createdBy: 'usr-001',
    createdAt: '2026-03-15',
    updatedAt: '2026-03-20',
    customFields: { pret_lunar: '700 EUR/lună' },
    blocks: [
      {
        id: 'b-001-01', type: 'text',
        title: 'Strategie Directă pe Profilul Clientului Ideal',
        subtitle: 'Crește vizibilitatea și atrage clienți noi din Europa Centrală și Zona Nordică (Suedia, Danemarca, Finlanda)',
        data: {
          content: 'Am definit profilul Clientului Ideal (ICP) ca fiind Supply Chain Manager sau Director de Operațiuni în branduri Europene care au nevoie de audituri (ex. SMETA, SA8000) și controlul calității în România. Folosind Google Ads API, am analizat piețele Nordice.',
        },
      },
      {
        id: 'b-001-02', type: 'stats',
        title: 'Date Globale Piețe Analizate',
        data: {
          items: [
            { value: '6.5K+', label: 'Căutări/Lună', sublabel: 'Volum total cuvinte cheie', color: 'orange' },
            { value: '€8.50', label: 'CPC Mediu', sublabel: 'Cost per click Google Ads', color: 'green' },
            { value: 'LOW-MEDIUM', label: 'Competiție', sublabel: 'Nivel competiție industrie', color: 'blue' },
            { value: 'EXTREM DE RIDICAT', label: 'Oportunitate', sublabel: 'Potențial de creștere', color: 'purple' },
          ],
        },
      },
      {
        id: 'b-001-03', type: 'services',
        title: 'Ce Include Campania',
        data: {
          services: [
            {
              title: 'Optimizare SEO Avansată', icon: 'TrendingUp',
              description: 'Optimizare tehnică și de conținut pentru motoarele de căutare',
              features: [
                'Audit SEO complet și identificare oportunități',
                'Optimizare on-page (meta tags, headings, structură)',
                'Optimizare tehnică (viteză, mobile, Core Web Vitals)',
                'Link building de calitate din surse relevante',
                'Content marketing și articole optimizate SEO',
                'Monitorizare poziții și raportare lunară',
              ],
            },
            {
              title: 'Campanii Google Ads', icon: 'Target',
              description: 'Campanii targetate pentru industria de inspecție și audit',
              features: [
                'Setup complet cont Google Ads',
                'Cercetare cuvinte cheie cu date reale de căutare',
                'Creare anunțuri persuasive și relevante',
                'Targetare geografică și demografică precisă',
                'Optimizare continuă pentru ROI maxim',
                'A/B testing anunțuri și landing pages',
              ],
            },
          ],
        },
      },
    ],
  },
  {
    number: 'OF-2026-002',
    businessLine: 'agency',
    entityType: 'client',
    entityName: 'MARYSTELV S.R.L.',
    templateId: 'tpl-programmatic',
    templateName: 'Sistem Hibrid: Trafic Imediat (Ads) + Creștere Organică (AI SEO)',
    status: 'draft',
    value: 500,
    currency: 'EUR',
    validUntil: '2026-06-01',
    createdBy: 'usr-001',
    createdAt: '2026-03-18',
    updatedAt: '2026-03-25',
    customFields: { pret_lunar: '500 EUR +TVA/lună' },
    blocks: [
      {
        id: 'b-002-01', type: 'text',
        title: 'Noua Generație de Achiziție Clienți',
        subtitle: 'Acaparăm piața nordică atacând din două unghiuri.',
        data: {
          content: 'Clienții din Suedia, Danemarca și Finlanda vor să afle ce se produce în estul Europei. Prin inteligență artificială, le oferim cele mai noi informații corporative gata traduse la superlativ.',
        },
      },
      {
        id: 'b-002-02', type: 'features',
        title: 'Motorul Programmatic SEO',
        subtitle: 'Procesul automat de generare conținut pentru piețele nordice',
        data: {
          categories: [
            {
              name: 'Surse Premium (România B2B)',
              items: ['Ziarul Financiar — zf.ro/industrie', 'Economica.net — /industrie', 'Wall-Street.ro — /companii', 'Profit.ro — Afaceri locale'],
            },
            {
              name: 'Pipeline AI',
              items: ['1. Extragem știrile de industrie', '2. AI-ul adaugă expertiza Quality Control', '3. Traducere & publicare automată'],
            },
          ],
        },
      },
      {
        id: 'b-002-03', type: 'services',
        title: 'Inovații incluse în Pachet',
        subtitle: 'Trei vectori prin care articolele devin Lead-uri corporative B2B',
        data: {
          services: [
            {
              title: 'Generare Audiență Pixel', icon: 'Target',
              description: 'Captare LinkedIn Ads Pixel și retargeting automat.',
              features: ['LinkedIn Ads Pixel instalat', 'Audiență retargeting automată', 'Campanie conversie Phase 2'],
            },
            {
              title: 'LinkedIn Newsletters', icon: 'MonitorSmartphone',
              description: 'Conținutul prelucrat de AI distribuit ca Newsletter periodic.',
              features: ['Newsletter automatizat', 'Distribuție LinkedIn organică', '"Nordic Supply Chain Insights"'],
            },
            {
              title: 'Agenda CSDDD & ESG', icon: 'TrendingUp',
              description: 'Monitorizare legislație EU și conținut CSRD/ESG automat.',
              features: ['Monitorizare legislație EU', 'Conținut CSRD/ESG automat', 'CTA către Audit SMETA'],
            },
          ],
        },
      },
      {
        id: 'b-002-04', type: 'pricing',
        title: 'Investiție',
        data: {
          lines: [
            { label: 'Agency Fee (SEO + Ads Management) / lună', amount: 500 },
            { label: 'Sistem AI Programmatic SEO / lună', amount: 0 },
            { label: 'Instalare Pixel & Configurare Audiență Retargeting', amount: 0 },
            { label: 'Buget Media Sugerat (Pilot Danemarca) / lună', amount: 400 },
          ],
          currency: 'EUR',
          total: 900,
          totalLabel: 'Total Lunar Estimat',
          note: 'Agency Fee: 500€ +TVA/lună. Bugetul media (400€) se achită direct către contul Google Ads propriu.',
        },
      },
      {
        id: 'b-002-05', type: 'stats',
        title: 'Pilot Inițial: Danemarca',
        subtitle: 'Buget media sugerat pentru achiziția imediată de trafic',
        data: {
          items: [
            { value: '400€', label: 'Buget Media/Lună', sublabel: 'Plătit direct către Google Ads', color: 'blue' },
            { value: '~460', label: 'Căutări B2B/Lună', sublabel: '220 daneză + 240 engleză', color: 'green' },
            { value: '~30', label: 'Click-uri Așteptate', sublabel: 'Din intenție B2B garantată', color: 'orange' },
            { value: '100%', label: 'Intenție B2B', sublabel: 'Audiență pre-calificată', color: 'purple' },
          ],
        },
      },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding Offers...')

  // Resolve businessLine slugs → IDs
  const businessLines = await prisma.businessLine.findMany({
    select: { id: true, slug: true },
  })
  const blMap = new Map(businessLines.map((bl) => [bl.slug, bl.id]))

  if (businessLines.length === 0) {
    console.error('❌ No business lines found in DB. Seed the business lines first (Module 0).')
    process.exit(1)
  }

  console.log(`  Found ${businessLines.length} business lines: ${businessLines.map((bl) => bl.slug).join(', ')}`)

  // Try to resolve client "MARYSTELV S.R.L." → clientId
  const maryClient = await prisma.client.findFirst({
    where: { companyName: { contains: 'MARYSTELV', mode: 'insensitive' } },
    select: { id: true, companyName: true },
  })
  if (maryClient) {
    console.log(`  Found client: ${maryClient.companyName} (${maryClient.id})`)
  } else {
    console.warn('  ⚠ Client "MARYSTELV S.R.L." not found — offers will be inserted without clientId')
  }

  // Clear existing offers (to allow re-running seed)
  const deleted = await prisma.offer.deleteMany({})
  console.log(`  Cleared ${deleted.count} existing offers`)

  // Insert offers
  let inserted = 0
  for (const offer of seedOffers) {
    const businessLineId = blMap.get(offer.businessLine)

    if (!businessLineId) {
      console.warn(`  ⚠ Skipping offer ${offer.number}: businessLine "${offer.businessLine}" not found in DB`)
      continue
    }

    await prisma.offer.create({
      data: {
        number: offer.number,
        businessLineId,
        entityType: offer.entityType,
        clientId: maryClient?.id || null,
        entityName: offer.entityName,
        templateId: offer.templateId,
        templateName: offer.templateName,
        status: offer.status,
        value: offer.value,
        currency: offer.currency,
        validUntil: new Date(offer.validUntil),
        blocks: offer.blocks,
        modules: undefined,
        customFields: offer.customFields,
        createdBy: offer.createdBy,
        createdAt: new Date(offer.createdAt),
        updatedAt: new Date(offer.updatedAt),
      },
    })
    inserted++
    console.log(`  ✓ ${offer.number} — ${offer.templateName} (${offer.status})`)
  }

  console.log(`  ✅ Inserted ${inserted} offers`)
  console.log('🌱 Offers seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
