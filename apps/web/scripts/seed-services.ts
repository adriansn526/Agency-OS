/**
 * Seed Service Templates for Agency OS
 * Run: cd apps/web && export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/seed-services.ts
 */

import { db } from '@repo/db'

async function main() {
  console.log('🌱 Seeding service templates...')

  // Get business lines
  const agency = await db.businessLine.findUnique({ where: { slug: 'agency' } })
  const fudly = await db.businessLine.findUnique({ where: { slug: 'fudly' } })

  if (!agency) throw new Error('Agency business line not found')
  if (!fudly) throw new Error('Fudly business line not found')

  // Check if already seeded
  const existing = await db.serviceTemplate.count()
  if (existing > 0) {
    console.log(`⚠️  ${existing} services already exist. Skipping seed.`)
    return
  }

  // ═══════════════════════════════════════
  // AGENȚIE — Service Catalog
  // ═══════════════════════════════════════
  const agencyServices = [
    {
      businessLineId: agency.id,
      name: 'Website Development',
      shortName: 'Website',
      icon: 'Globe',
      description: 'Design și dezvoltare website profesional, responsive, optimizat pentru conversii.',
      category: 'development',
      defaultPrice: 2500,
      pricingUnit: 'fix',
      sortOrder: 1,
      defaultBlocks: [
        { id: 'web-text-1', type: 'text', title: 'Despre Proiect', data: { content: 'Website profesional, complet responsive, construit cu tehnologii moderne (Next.js/React), optimizat pentru performanță și SEO. Include configurare completă hosting, SSL, și Go-Live.' } },
        { id: 'web-features-1', type: 'features', title: 'Funcționalități Incluse', data: { categories: [
          { name: 'Design & UX', items: ['Design custom responsive', 'Animații și micro-interacțiuni', 'Mobile-first approach', 'Dark/Light mode'] },
          { name: 'Tehnic', items: ['Next.js / React', 'SEO tehnic integrat', 'Core Web Vitals optimizat', 'SSL & Security headers'] },
          { name: 'Conținut', items: ['Până la 10 pagini', 'Blog integrat', 'Formular de contact', 'Integrare Google Analytics'] },
        ] } },
        { id: 'web-timeline-1', type: 'timeline', title: 'Etape de Livrare', data: { steps: [
          { step: 1, title: 'Brief & UX Research', duration: '3-5 zile', description: 'Analiză cerințe, wireframes.', deliverables: ['Brief aprobat', 'Wireframes', 'Sitemap'] },
          { step: 2, title: 'Design UI', duration: '5-7 zile', description: 'Design vizual complet.', deliverables: ['Mockups Figma', 'Design System'] },
          { step: 3, title: 'Development', duration: '10-15 zile', description: 'Implementare frontend + backend.', deliverables: ['Website funcțional', 'CMS configurare'] },
          { step: 4, title: 'Testing & Lansare', duration: '3-5 zile', description: 'QA, optimizare, deploy.', deliverables: ['QA report', 'PageSpeed 90+', 'Go-Live'] },
        ] } },
      ],
    },
    {
      businessLineId: agency.id,
      name: 'Branding & Design',
      shortName: 'Branding',
      icon: 'Palette',
      description: 'Identitate vizuală completă: logo, paletă de culori, tipografie, brand guidelines.',
      category: 'development',
      defaultPrice: 1500,
      pricingUnit: 'fix',
      sortOrder: 2,
      defaultBlocks: [
        { id: 'brand-text-1', type: 'text', title: 'Despre Serviciu', data: { content: 'Creare identitate vizuală care reflectă valorile brandului. Include cercetare competiție, propuneri logo, și manual de brand complet.' } },
        { id: 'brand-features-1', type: 'features', title: 'Livrabile', data: { categories: [
          { name: 'Logo & Identitate', items: ['3 propuneri logo', 'Logo vectorial (SVG, AI, EPS)', 'Favicon & Social assets', 'Variante monocrom'] },
          { name: 'Brand Guidelines', items: ['Paletă culori', 'Tipografie', 'Spacing & layout rules', 'Do\'s and Don\'ts'] },
        ] } },
      ],
    },
    {
      businessLineId: agency.id,
      name: 'SEO Optimization',
      shortName: 'SEO',
      icon: 'TrendingUp',
      description: 'Optimizare completă SEO: audit tehnic, cercetare cuvinte cheie, on-page, link building și raportare.',
      category: 'marketing',
      defaultPrice: 450,
      pricingUnit: 'lunar',
      setupFee: 500,
      sortOrder: 3,
      defaultBlocks: [
        { id: 'seo-text-1', type: 'text', title: 'Strategia SEO', data: { content: 'Strategie SEO bazată pe analiza ICP și piețe țintă. Include optimizare tehnică, content marketing, și link building.' } },
        { id: 'seo-features-1', type: 'features', title: 'Livrabile Lunare', data: { categories: [
          { name: 'Analiză & Strategie', items: ['Raport poziții cuvinte cheie', 'Analiza traficului organic', 'Recomandări strategice'] },
          { name: 'Implementare', items: ['Optimizare 5-10 pagini/lună', '2-4 articole blog/lună', '5-10 linkuri externe/lună'] },
          { name: 'Raportare', items: ['Raport lunar detaliat', 'Meeting strategie', 'Dashboard live'] },
        ] } },
      ],
    },
    {
      businessLineId: agency.id,
      name: 'Google Ads Campaign',
      shortName: 'Google Ads',
      icon: 'Target',
      description: 'Campanii Google Ads targhetate cu optimizare continuă și raportare detaliată.',
      category: 'marketing',
      defaultPrice: 700,
      pricingUnit: 'lunar',
      setupFee: 1200,
      sortOrder: 4,
      defaultBlocks: [
        { id: 'ads-text-1', type: 'text', title: 'Strategia Google Ads', data: { content: 'Campanii Google Ads pentru maximizarea ROI, cu targetare precisă, optimizare continuă a cuvintelor cheie și licitațiilor.' } },
        { id: 'ads-stats-1', type: 'stats', title: 'KPIs Estimați', data: { items: [
          { value: '3-5%', label: 'CTR Estimat', sublabel: 'Click-through rate', color: 'orange' },
          { value: '€2-8', label: 'CPC Mediu', sublabel: 'Cost per click', color: 'green' },
          { value: '50+', label: 'Conversii/Lună', sublabel: 'Lead-uri generate', color: 'blue' },
          { value: '300%+', label: 'ROAS Țintă', sublabel: 'Return on ad spend', color: 'purple' },
        ] } },
      ],
    },
    {
      businessLineId: agency.id,
      name: 'Programmatic SEO',
      shortName: 'Prog. SEO',
      icon: 'Settings',
      description: 'Generare automată de pagini optimizate pentru cuvinte cheie long-tail la scară mare.',
      category: 'marketing',
      defaultPrice: 500,
      pricingUnit: 'lunar',
      sortOrder: 5,
      defaultBlocks: [
        { id: 'pseo-text-1', type: 'text', title: 'Ce este SEO Programatic?', data: { content: 'SEO Programatic creează automat sute de pagini optimizate folosind template-uri și date structurate pentru trafic organic la scară mare.' } },
      ],
    },
    {
      businessLineId: agency.id,
      name: 'Content Marketing',
      shortName: 'Content',
      icon: 'FileText',
      description: 'Strategie de conținut: articole blog, social media, newsletters, content plan lunar.',
      category: 'marketing',
      defaultPrice: 350,
      pricingUnit: 'lunar',
      sortOrder: 6,
      defaultBlocks: [
        { id: 'content-text-1', type: 'text', title: 'Strategia de Conținut', data: { content: 'Plan de conținut strategic pentru atragerea, educarea și convertirea audienței țintă prin blog, studii de caz, și social media.' } },
      ],
    },
    {
      businessLineId: agency.id,
      name: 'Audit SEO Tehnic',
      shortName: 'Audit SEO',
      icon: 'Search',
      description: 'Audit SEO tehnic complet cu raport detaliat și recomandări de acțiune.',
      category: 'consultancy',
      defaultPrice: 800,
      pricingUnit: 'fix',
      sortOrder: 7,
      defaultBlocks: [
        { id: 'audit-text-1', type: 'text', title: 'Ce include auditul', data: { content: 'Audit SEO aprofundat: structura site-ului, performanța tehnică, profil backlinks, competiție — toate oportunitățile de creștere organică.' } },
      ],
    },
    {
      businessLineId: agency.id,
      name: 'Consultanță Digitală',
      shortName: 'Consultanță',
      icon: 'MessageSquare',
      description: 'Sesiuni consultanță: analiză business, recomandări digitale, plan de acțiune.',
      category: 'consultancy',
      defaultPrice: 150,
      pricingUnit: 'per_hour',
      sortOrder: 8,
      defaultBlocks: [],
    },
    // Bundled services
    {
      businessLineId: agency.id,
      name: 'Administrare Website',
      shortName: 'Admin Website',
      icon: 'Shield',
      description: 'Mentenanță continuă: actualizări securitate, backup, monitorizare, optimizări.',
      category: 'development',
      defaultPrice: 200,
      pricingUnit: 'lunar',
      sortOrder: 20,
      defaultBlocks: [],
    },
    {
      businessLineId: agency.id,
      name: 'Administrare Google Ads',
      shortName: 'Admin Ads',
      icon: 'Settings',
      description: 'Management campanii: monitorizare, ajustare bugete, optimizare, raportare.',
      category: 'marketing',
      defaultPrice: 300,
      pricingUnit: 'lunar',
      sortOrder: 21,
      defaultBlocks: [],
    },
    {
      businessLineId: agency.id,
      name: 'Raportare Lunară',
      shortName: 'Raportare',
      icon: 'BarChart3',
      description: 'Rapoarte lunare cu KPIs, analize, recomandări strategice + meeting discuție.',
      category: 'marketing',
      defaultPrice: 100,
      pricingUnit: 'lunar',
      sortOrder: 22,
      defaultBlocks: [],
    },
  ]

  // ═══════════════════════════════════════
  // FUDLY — Service Catalog
  // ═══════════════════════════════════════
  const fudlyServices = [
    {
      businessLineId: fudly.id,
      name: 'Fudly Pro — Abonament Lunar',
      shortName: 'Pro',
      icon: 'Zap',
      description: 'Site propriu de comenzi online cu brandul restaurantului. Ideal pentru restaurante mici și medii care vor să construiască relații directe cu clienții.',
      category: 'saas',
      defaultPrice: 59,
      pricingUnit: 'lunar',
      sortOrder: 1,
      defaultBlocks: [
        { id: 'fudly-pro-text', type: 'text', title: 'De Ce Fudly Pro?', data: { content: 'Clienții care comandă de pe platforme de delivery sunt în primul rând clienții PLATFORMEI, nu ai tăi. Cu Fudly Pro, fiecare client care comandă de pe site-ul tău devine al tău — cu date de contact, istoric comenzi, și posibilitatea de a-i fideliza.' } },
        { id: 'fudly-pro-features', type: 'features', title: 'Ce este inclus', data: { categories: [
          { name: 'Site Comenzi Online', items: ['Site cu brandul restaurantului tău', 'Meniu digital cu imagini', 'Sistem de comenzi în timp real', 'Plăți online integrate'] },
          { name: 'Management', items: ['Panou admin comenzi', 'Notificări instant (email + push)', 'Istoric comenzi și clienți', 'Rapoarte vânzări'] },
          { name: 'Marketing', items: ['Pagină dedicată restaurantului', 'Cod QR pentru masă / flyere', 'Vizibilitate în rețeaua Fudly'] },
        ] } },
        { id: 'fudly-pro-value', type: 'stats', title: 'Avantaje', data: { items: [
          { value: '0%', label: 'Comision per comandă', sublabel: 'vs 25-35% pe platforme', color: 'green' },
          { value: '100%', label: 'Datele clienților', sublabel: 'Sunt ale tale', color: 'blue' },
          { value: '5 zile', label: 'Timp de setup', sublabel: 'Gata de lansare', color: 'orange' },
          { value: '59€', label: 'Preț lunar', sublabel: 'Fără angajament', color: 'purple' },
        ] } },
      ],
    },
    {
      businessLineId: fudly.id,
      name: 'Fudly Business — Abonament Lunar',
      shortName: 'Business',
      icon: 'Crown',
      description: 'Pachet complet pentru restaurante active cu volum mare de comenzi. Include loyalty, SMS marketing, AI social media.',
      category: 'saas',
      defaultPrice: 99,
      pricingUnit: 'lunar',
      sortOrder: 2,
      defaultBlocks: [
        { id: 'fudly-biz-text', type: 'text', title: 'Fudly Business', data: { content: 'Tot ce include Pro, plus instrumente avansate de fidelizare: puncte de loialitate, SMS-uri automate, postare AI pe social media, și acces la rețeaua de curieri Fudly Network.' } },
        { id: 'fudly-biz-features', type: 'features', title: 'Funcționalități Business', data: { categories: [
          { name: 'Tot din Pro +', items: ['Toate funcționalitățile Pro incluse'] },
          { name: 'Fidelizare', items: ['Sistem puncte de loialitate', 'Carduri cadou digitale', 'Shared Cart (comandă de grup)', 'Promoții și cupoane automate'] },
          { name: 'Marketing Avansat', items: ['200 SMS-uri marketing/lună', 'AI Social Media posting', 'Email marketing automat', 'Push notifications'] },
          { name: 'Operațional', items: ['Curieri Fudly Network', 'Integrare POS (opțional)', 'Multi-locație support', 'Priority support'] },
        ] } },
      ],
    },
    {
      businessLineId: fudly.id,
      name: 'Fudly Lifetime — Acces Permanent',
      shortName: 'Lifetime',
      icon: 'Infinity',
      description: 'Acces permanent la platforma Fudly cu o singură plată. Include toate funcționalitățile Business, fără plăți recurente.',
      category: 'saas',
      defaultPrice: 850,
      pricingUnit: 'one_time',
      sortOrder: 3,
      defaultBlocks: [
        { id: 'fudly-lt-text', type: 'text', title: 'Investiție Unică, Acces Permanent', data: { content: 'Plătești o singură dată și ai acces permanent la toate funcționalitățile Fudly Business. Ideal pentru restaurante care sunt convinse de valoarea platformei și vor predictibilitate financiară. Practic, echivalentul a 14 luni de Pro — restul e gratuit.' } },
        { id: 'fudly-lt-features', type: 'features', title: 'Ce primești', data: { categories: [
          { name: 'Totul din Business', items: ['Toate funcționalitățile Business incluse', 'Actualizări viitoare incluse', 'Fără plăți lunare, niciodată'] },
          { name: 'Bonus Lifetime', items: ['Onboarding personalizat', 'Setup gratuit al meniului', 'Training staff dedicat', 'Suport prioritar permanent'] },
        ] } },
        { id: 'fudly-lt-value', type: 'stats', title: 'De ce Lifetime?', data: { items: [
          { value: '850€', label: 'O singură plată', sublabel: 'Acces permanent', color: 'green' },
          { value: '~14 luni', label: 'Break-even vs Pro', sublabel: 'Apoi totul e gratuit', color: 'blue' },
          { value: '∞', label: 'Acces nelimitat', sublabel: 'Fără upgrade-uri plătite', color: 'purple' },
        ] } },
      ],
    },
    {
      businessLineId: fudly.id,
      name: 'Setup & Onboarding',
      shortName: 'Setup',
      icon: 'Rocket',
      description: 'Configurare completă: meniu digital, imagini, setări delivery, training staff.',
      category: 'saas',
      defaultPrice: 0,
      pricingUnit: 'fix',
      sortOrder: 10,
      defaultBlocks: [
        { id: 'fudly-setup-text', type: 'text', title: 'Setup Complet', data: { content: 'Echipa noastră configurează totul: importăm meniul, adăugăm imagini, setăm zonele de livrare, și facem training cu echipa ta. Gata de lansare în 5 zile.' } },
      ],
    },
    {
      businessLineId: fudly.id,
      name: 'Integrare POS',
      shortName: 'POS',
      icon: 'Monitor',
      description: 'Conectare cu sistemul de casă existent pentru sincronizarea automată a comenzilor online.',
      category: 'saas',
      defaultPrice: 300,
      pricingUnit: 'fix',
      sortOrder: 11,
      defaultBlocks: [],
    },
    {
      businessLineId: fudly.id,
      name: 'Design Meniu Personalizat',
      shortName: 'Menu Design',
      icon: 'Image',
      description: 'Fotografiere profesională a produselor și design personalizat al meniului digital.',
      category: 'saas',
      defaultPrice: 150,
      pricingUnit: 'fix',
      sortOrder: 12,
      defaultBlocks: [],
    },
  ]

  // Bulk create all services
  const allServices = [...agencyServices, ...fudlyServices]
  for (const svc of allServices) {
    await db.serviceTemplate.create({ data: svc as any })
  }
  console.log(`✅ Created ${allServices.length} service templates (${agencyServices.length} Agency + ${fudlyServices.length} Fudly)`)

  // ═══════════════════════════════════════
  // OFFER TEMPLATES (pre-defined combos)
  // ═══════════════════════════════════════

  // Get service IDs for templates
  const svcMap: Record<string, string> = {}
  const allDbServices = await db.serviceTemplate.findMany({ select: { id: true, shortName: true, businessLineId: true } })
  allDbServices.forEach(s => { svcMap[`${s.businessLineId}:${s.shortName}`] = s.id })

  const offerTemplates = [
    // Agency templates
    {
      businessLineId: agency.id,
      name: 'Pachet Digital Start',
      description: 'Website + SEO — ideal pentru companiile care încep prezența online.',
      serviceIds: [svcMap[`${agency.id}:Website`], svcMap[`${agency.id}:SEO`]].filter(Boolean),
      sortOrder: 1,
    },
    {
      businessLineId: agency.id,
      name: 'Pachet Growth Marketing',
      description: 'SEO + Google Ads + Content — creștere organică + plătită.',
      serviceIds: [svcMap[`${agency.id}:SEO`], svcMap[`${agency.id}:Google Ads`], svcMap[`${agency.id}:Content`]].filter(Boolean),
      sortOrder: 2,
    },
    {
      businessLineId: agency.id,
      name: 'Pachet Full Digital',
      description: 'Soluția completă: Website + Branding + SEO + Ads + Content.',
      serviceIds: [svcMap[`${agency.id}:Website`], svcMap[`${agency.id}:Branding`], svcMap[`${agency.id}:SEO`], svcMap[`${agency.id}:Google Ads`], svcMap[`${agency.id}:Content`]].filter(Boolean),
      sortOrder: 3,
    },
    // Fudly templates
    {
      businessLineId: fudly.id,
      name: 'Propunere Fudly Pro',
      description: 'Abonament lunar Pro + Setup gratuit — testează fără risc.',
      serviceIds: [svcMap[`${fudly.id}:Pro`], svcMap[`${fudly.id}:Setup`]].filter(Boolean),
      sortOrder: 1,
    },
    {
      businessLineId: fudly.id,
      name: 'Propunere Fudly Business',
      description: 'Abonament Business + Setup + Menu Design — pachet complet.',
      serviceIds: [svcMap[`${fudly.id}:Business`], svcMap[`${fudly.id}:Setup`], svcMap[`${fudly.id}:Menu Design`]].filter(Boolean),
      sortOrder: 2,
    },
    {
      businessLineId: fudly.id,
      name: 'Ofertă Lifetime',
      description: 'Acces permanent + Setup + POS Integration — investiție unică.',
      serviceIds: [svcMap[`${fudly.id}:Lifetime`], svcMap[`${fudly.id}:Setup`], svcMap[`${fudly.id}:POS`]].filter(Boolean),
      sortOrder: 3,
    },
  ]

  for (const tpl of offerTemplates) {
    await db.offerTemplate.create({ data: tpl as any })
  }
  console.log(`✅ Created ${offerTemplates.length} offer templates`)

  console.log('\n🎉 Done! Service catalog seeded successfully.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
