import type { ServiceCatalogItem } from './types'

/**
 * ASNS Service Catalog
 * Predefined services with default pricing, blocks, and dependency rules.
 */
export const serviceCatalog: ServiceCatalogItem[] = [
  // ────────────────────────────────────
  // 🔧 DEVELOPMENT
  // ────────────────────────────────────
  {
    id: 'svc-website',
    name: 'Website Development',
    shortName: 'Website',
    icon: 'Globe',
    description: 'Design și dezvoltare website profesional, responsive, optimizat pentru conversii.',
    category: 'development',
    defaultPrice: 2500,
    pricingUnit: 'fix',
    defaultBlocks: [
      {
        id: 'web-text-1',
        type: 'text',
        title: 'Despre Proiect',
        data: { content: 'Website profesional, complet responsive, construit cu tehnologii moderne (Next.js/React), optimizat pentru performanță și SEO. Include configurare completă hosting, SSL, și Go-Live.' },
      },
      {
        id: 'web-features-1',
        type: 'features',
        title: 'Funcționalități Incluse',
        data: {
          categories: [
            { name: 'Design & UX', items: ['Design custom responsive', 'Animații și micro-interacțiuni', 'Mobile-first approach', 'Dark/Light mode'] },
            { name: 'Tehnic', items: ['Next.js / React', 'SEO tehnic integrat', 'Core Web Vitals optimizat', 'SSL & Security headers'] },
            { name: 'Conținut', items: ['Până la 10 pagini', 'Blog integrat', 'Formular de contact', 'Integrare Google Analytics'] },
          ],
        },
      },
      {
        id: 'web-timeline-1',
        type: 'timeline',
        title: 'Etape de Livrare',
        data: {
          steps: [
            { step: 1, title: 'Brief & UX Research', duration: '3-5 zile', description: 'Analiză cerințe, wireframes, arhitectură informațională.', deliverables: ['Brief aprobat', 'Wireframes', 'Sitemap'] },
            { step: 2, title: 'Design UI', duration: '5-7 zile', description: 'Design vizual complet pentru toate paginile.', deliverables: ['Mockups Figma', 'Design System', 'Revizie 1'] },
            { step: 3, title: 'Development', duration: '10-15 zile', description: 'Implementare frontend + backend, integrări.', deliverables: ['Website funcțional', 'CMS configurare', 'Formulare active'] },
            { step: 4, title: 'Testing & Lansare', duration: '3-5 zile', description: 'QA, optimizare performanță, deploy producție.', deliverables: ['QA report', 'PageSpeed 90+', 'SSL activ', 'Go-Live'] },
          ],
        },
      },
    ],
  },

  {
    id: 'svc-branding',
    name: 'Branding & Design',
    shortName: 'Branding',
    icon: 'Palette',
    description: 'Identitate vizuală completă: logo, paletă de culori, tipografie, brand guidelines.',
    category: 'development',
    defaultPrice: 1500,
    pricingUnit: 'fix',
    defaultBlocks: [
      {
        id: 'brand-text-1',
        type: 'text',
        title: 'Despre Serviciu',
        data: { content: 'Creare identitate vizuală care reflectă valorile brandului. Include cercetare competiție, propuneri logo, și manual de brand complet.' },
      },
      {
        id: 'brand-features-1',
        type: 'features',
        title: 'Livrabile',
        data: {
          categories: [
            { name: 'Logo & Identitate', items: ['3 propuneri logo', 'Logo în formate vectoriale (SVG, AI, EPS)', 'Favicon & Social media assets', 'Variante monocrom și color'] },
            { name: 'Brand Guidelines', items: ['Paletă de culori (HEX, RGB, CMYK)', 'Tipografie primară și secundară', 'Spacing & layout rules', 'Do\'s and Don\'ts'] },
          ],
        },
      },
    ],
  },

  // ────────────────────────────────────
  // 📈 MARKETING
  // ────────────────────────────────────
  {
    id: 'svc-seo',
    name: 'SEO Optimization',
    shortName: 'SEO',
    icon: 'TrendingUp',
    description: 'Optimizare completă SEO: audit tehnic, cercetare cuvinte cheie, optimizare on-page, link building și raportare.',
    category: 'marketing',
    defaultPrice: 450,
    pricingUnit: 'lunar',
    setupFee: 500,
    defaultBlocks: [
      {
        id: 'seo-text-1',
        type: 'text',
        title: 'Strategia SEO',
        data: { content: 'Am definit profilul Clientului Ideal (ICP) și am analizat piețele relevante folosind Google Ads API. Strategia include optimizare tehnică, content marketing, și link building targhetat.' },
      },
      {
        id: 'seo-services-1',
        type: 'services',
        title: 'Ce Include Campania SEO',
        data: {
          services: [
            { title: 'Optimizare SEO Avansată', icon: 'TrendingUp', description: 'Optimizare tehnică și de conținut pentru motoarele de căutare', features: ['Audit SEO complet și identificare oportunități', 'Optimizare on-page (meta tags, headings, structură)', 'Optimizare tehnică (viteză, mobile, Core Web Vitals)', 'Link building de calitate din surse relevante', 'Content marketing și articole optimizate SEO', 'Monitorizare poziții și raportare lunară'], included: true, badge: 'INCLUS' },
          ],
        },
      },
      {
        id: 'seo-features-1',
        type: 'features',
        title: 'Livrabile Lunare',
        data: {
          categories: [
            { name: 'Analiză & Strategie', items: ['Raport poziții cuvinte cheie', 'Analiza traficului organic', 'Recomandări strategice'] },
            { name: 'Implementare', items: ['Optimizare 5-10 pagini/lună', '2-4 articole blog/lună', '5-10 linkuri externe/lună'] },
            { name: 'Raportare', items: ['Raport lunar detaliat', 'Meeting strategie', 'Dashboard live'] },
          ],
        },
      },
    ],
  },

  {
    id: 'svc-ads',
    name: 'Google Ads Campaign',
    shortName: 'Google Ads',
    icon: 'Target',
    description: 'Campanii Google Ads targhetate pentru industria dumneavoastră, cu optimizare continuă și raportare detaliată.',
    category: 'marketing',
    defaultPrice: 700,
    pricingUnit: 'lunar',
    setupFee: 1200,
    defaultBlocks: [
      {
        id: 'ads-text-1',
        type: 'text',
        title: 'Strategia Google Ads',
        data: { content: 'Campanii Google Ads pentru maximizarea ROI, cu targetare precisă geografică și demografică, optimizare continuă a cuvintelor cheie și licitațiilor.' },
      },
      {
        id: 'ads-services-1',
        type: 'services',
        title: 'Ce Include Campania Ads',
        data: {
          services: [
            { title: 'Campanii Google Ads', icon: 'Target', description: 'Campanii targhetate pentru industria de inspecție și audit', features: ['Setup complet cont Google Ads', 'Cercetare cuvinte cheie cu date reale de căutare', 'Creare anunțuri persuasive și relevante', 'Targetare geografică și demografică precisă', 'Optimizare continuă pentru ROI maxim', 'A/B testing anunțuri și landing pages'] },
          ],
        },
      },
      {
        id: 'ads-stats-1',
        type: 'stats',
        title: 'KPIs Estimați',
        data: {
          items: [
            { value: '3-5%', label: 'CTR Estimat', sublabel: 'Click-through rate', color: 'orange' },
            { value: '€2-8', label: 'CPC Mediu', sublabel: 'Cost per click', color: 'green' },
            { value: '50+', label: 'Conversii/Lună', sublabel: 'Lead-uri generate', color: 'blue' },
            { value: '300%+', label: 'ROAS Țintă', sublabel: 'Return on ad spend', color: 'purple' },
          ],
        },
      },
    ],
  },

  {
    id: 'svc-programmatic-seo',
    name: 'Programmatic SEO',
    shortName: 'Prog. SEO',
    icon: 'Settings',
    description: 'Strategie SEO programatică: generare automată de pagini optimizate pentru volum mare de cuvinte cheie long-tail.',
    category: 'marketing',
    defaultPrice: 500,
    pricingUnit: 'lunar',
    defaultBlocks: [
      {
        id: 'pseo-text-1',
        type: 'text',
        title: 'Ce este SEO Programatic?',
        data: { content: 'SEO Programatic este o strategie avansată care creează automat sute sau mii de pagini optimizate pentru cuvinte cheie specifice, folosind template-uri și date structurate pentru a captura trafic organic la scară mare.' },
      },
      {
        id: 'pseo-features-1',
        type: 'features',
        title: 'Funcționalități',
        data: {
          categories: [
            { name: 'Setup Tehnic', items: ['Setup pipeline conținut automatizat', 'Template-uri pagini optimizate', 'Schema markup automat', 'Internal linking algoritmic'] },
            { name: 'Conținut', items: ['Generare articole AI-assisted', 'Traduceri multi-limbă', 'Imagini optimizate automat', 'Meta tags dinamice'] },
          ],
        },
      },
    ],
  },

  {
    id: 'svc-content',
    name: 'Content Marketing',
    shortName: 'Content',
    icon: 'FileText',
    description: 'Strategie de conținut: articole blog, social media copy, newsletters, și content plan lunar.',
    category: 'marketing',
    defaultPrice: 350,
    pricingUnit: 'lunar',
    defaultBlocks: [
      {
        id: 'content-text-1',
        type: 'text',
        title: 'Strategia de Conținut',
        data: { content: 'Plan de conținut strategic aliniat cu obiectivele de business, creat pentru a atrage, educa și converti audiența țintă prin articole de blog, studii de caz, și conținut social media.' },
      },
      {
        id: 'content-features-1',
        type: 'features',
        title: 'Livrabile Content Marketing',
        data: {
          categories: [
            { name: 'Blog & Articole', items: ['4-8 articole/lună optimizate SEO', 'Cercetare topics & keywords', 'Revizuire editorială', 'Publicare și promovare'] },
            { name: 'Social Media', items: ['Content calendar lunar', 'Copywriting postări', 'Grafice & vizualuri', 'Monitorizare engagement'] },
          ],
        },
      },
    ],
  },

  // ────────────────────────────────────
  // 🔍 CONSULTANȚĂ
  // ────────────────────────────────────
  {
    id: 'svc-audit',
    name: 'Audit SEO Tehnic',
    shortName: 'Audit SEO',
    icon: 'Search',
    description: 'Audit SEO tehnic complet: analiză site, performanță, structură, competiție, cu raport detaliat și recomandări.',
    category: 'consultancy',
    defaultPrice: 800,
    pricingUnit: 'fix',
    defaultBlocks: [
      {
        id: 'audit-text-1',
        type: 'text',
        title: 'Ce include auditul',
        data: { content: 'Audit SEO tehnic aprofundat care analizează structura site-ului, performanța tehnică, profilul de backlinks, competiția, și identifică toate oportunitățile de creștere organică.' },
      },
      {
        id: 'audit-features-1',
        type: 'features',
        title: 'Arii de audit',
        data: {
          categories: [
            { name: 'Tehnic', items: ['Crawlabilitate & Indexare', 'Core Web Vitals', 'Structura URL-urilor', 'Schema Markup', 'Mobile-friendliness'] },
            { name: 'Conținut', items: ['Analiza cuvinte cheie existente', 'Content gaps vs competiție', 'Calitate meta tags', 'Conținut duplicat'] },
            { name: 'Off-Page', items: ['Profil backlinks', 'Analiza competiției', 'Oportunități link building', 'Autoritate domeniu'] },
          ],
        },
      },
    ],
  },

  {
    id: 'svc-consulting',
    name: 'Consultanță Digitală',
    shortName: 'Consultanță',
    icon: 'MessageSquare',
    description: 'Sesiuni de consultanță strategică: analiză business, recomandări digitale, plan de acțiune.',
    category: 'consultancy',
    defaultPrice: 150,
    pricingUnit: 'per_hour',
    defaultBlocks: [
      {
        id: 'consult-text-1',
        type: 'text',
        title: 'Consultanță Strategică',
        data: { content: 'Sesiuni de consultanță one-on-one cu specialist digital, axate pe identificarea celor mai eficiente strategii pentru creșterea business-ului online.' },
      },
    ],
  },

  // ────────────────────────────────────
  // 🎁 SERVICII INCLUSE (gratuite cu altele)
  // ────────────────────────────────────
  {
    id: 'svc-admin-website',
    name: 'Administrare Website',
    shortName: 'Admin Website',
    icon: 'Shield',
    description: 'Mentenanță și optimizare continuă a website-ului: actualizări securitate, backup, monitorizare, optimizări continue.',
    category: 'development',
    defaultPrice: 200,
    pricingUnit: 'lunar',
    includedWith: ['svc-website', 'svc-seo'],
    defaultBlocks: [
      {
        id: 'admin-web-services-1',
        type: 'services',
        title: 'Administrare Website',
        data: {
          services: [
            { title: 'Administrare Website', icon: 'Shield', description: 'Mentenanță și optimizare continuă a website-ului', features: ['Actualizări securitate și framework-uri', 'Backup zilnic și monitorizare 24/7', 'Optimizări continue performanță', 'Modificări conținut și imagini', 'Integrare formulare și tracking', 'Suport tehnic prioritar'], included: true, badge: 'INCLUS' },
          ],
        },
      },
    ],
  },

  {
    id: 'svc-admin-ads',
    name: 'Administrare Campanie Google Ads',
    shortName: 'Admin Ads',
    icon: 'Settings',
    description: 'Management profesional al campaniilor publicitare: monitorizare, ajustare bugete, optimizare cuvinte cheie, raportare.',
    category: 'marketing',
    defaultPrice: 300,
    pricingUnit: 'lunar',
    includedWith: ['svc-ads'],
    defaultBlocks: [
      {
        id: 'admin-ads-services-1',
        type: 'services',
        title: 'Administrare Campanie Google Ads',
        data: {
          services: [
            { title: 'Administrare Campanie Google Ads', icon: 'Settings', description: 'Management profesional al campaniilor publicitare', features: ['Monitorizare zilnică performanță', 'Ajustare bugete și licitații', 'Optimizare cuvinte cheie și anunțuri', 'Excludere termeni negativi', 'Rapoarte detaliate săptămânale', 'Consultanță strategică lunară'], included: true, badge: 'INCLUS' },
          ],
        },
      },
    ],
  },

  {
    id: 'svc-reporting',
    name: 'Raportare Lunară',
    shortName: 'Raportare',
    icon: 'BarChart3',
    description: 'Rapoarte lunare detaliate cu KPIs, analize, recomandări strategice și meeting de discuție.',
    category: 'marketing',
    defaultPrice: 100,
    pricingUnit: 'lunar',
    includedWith: ['svc-seo', 'svc-ads', 'svc-programmatic-seo'],
    defaultBlocks: [
      {
        id: 'report-features-1',
        type: 'features',
        title: 'Ce Include Raportarea',
        data: {
          categories: [
            { name: 'Raport Lunar', items: ['Dashboard KPI live', 'Analiză trafic & conversii', 'Raport poziții SEO', 'Recomandări strategice', 'Meeting prezentare rezultate'] },
          ],
        },
      },
    ],
  },
]
