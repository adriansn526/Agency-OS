// ============================================================
// ASNS Agency OS — Statement of Work (SoW) Templates
// Anexa 2 la Contract Cadru
// ============================================================

import type { SoWTemplate } from './types'

export const sowTemplates: SoWTemplate[] = [
  {
    id: 'sow-seo-ads',
    name: 'SoW — Servicii SEO & Google Ads',
    serviceTypes: ['seo', 'ads', 'seo+ads'],

    // ── SECTION A: Livrabile & KPI-uri (auto-populate din ofertă) ──
    defaultDeliverables: [
      {
        id: 'del-01',
        service: 'Audit SEO Tehnic Complet',
        description: 'Analiză completă a infrastructurii tehnice a website-ului: indexare, crawlability, viteza de încărcare, Core Web Vitals, date structurate, erori de crawl',
        frequency: 'one-time',
        kpi: 'Raport complet',
        details: [
          'Scanare completă cu Screaming Frog / Sitebulb',
          'Analiză Core Web Vitals (LCP, CLS, INP)',
          'Verificare indexare Google Search Console',
          'Analiză structură URL-uri și redirect-uri',
          'Verificare robots.txt, sitemap.xml, hreflang',
        ],
      },
      {
        id: 'del-02',
        service: 'Cercetare & Strategie Cuvinte Cheie',
        description: 'Identificarea și prioritizarea cuvintelor cheie relevante pentru domeniul de activitate, cu analiza volumului de căutare, dificultății și intenției',
        frequency: 'lunar',
        kpi: '50+ keywords monitorizate',
        details: [
          'Cercetare keyword-uri principale și long-tail',
          'Analiză cuvinte cheie ale competiției',
          'Mapare keywords → pagini (keyword mapping)',
          'Identificare oportunități de conținut',
        ],
      },
      {
        id: 'del-03',
        service: 'Optimizare On-Page',
        description: 'Optimizarea elementelor on-page ale paginilor prioritare: title, meta description, heading-uri, imagini, link-uri interne',
        frequency: 'lunar',
        kpi: 'Pagini optimizate/lună',
        details: [
          'Optimizare meta tag-uri (title, description)',
          'Structurare heading-uri (H1-H6)',
          'Optimizare imagini (alt text, compresie, WebP)',
          'Implementare date structurate Schema.org',
          'Optimizare link-uri interne',
        ],
      },
      {
        id: 'del-04',
        service: 'Link Building & Off-Page',
        description: 'Strategie de achiziție link-uri de calitate din surse relevante pentru domeniu',
        frequency: 'lunar',
        kpi: '4+ backlinks/lună (DA 30+)',
        details: [
          'Guest posting pe site-uri de industrie',
          'Citări locale (NAP consistency)',
          'Outreach campanii de link-uri editoriale',
          'Monitorizare profil backlink-uri (Ahrefs/Moz)',
        ],
      },
      {
        id: 'del-05',
        service: 'Content Marketing & Programmatic SEO',
        description: 'Creare conținut optimizat SEO și automatizare generare articole prin AI pentru piețe internaționale',
        frequency: 'lunar',
        kpi: '4-8 articole/lună',
        details: [
          'Articole blog optimizate SEO (manual)',
          'Monitorizare surse de știri industrie (RSS)',
          'Generare conținut prin AI (adaptare + traducere)',
          'Publicare automată pe CMS (WordPress REST API)',
          'Traducere localizată: RO, EN, DA, SV, FI',
        ],
      },
      {
        id: 'del-06',
        service: 'Setup Google Ads & Conversion Tracking',
        description: 'Configurarea completă a contului Google Ads, structura campaniilor și implementarea trackingului de conversii',
        frequency: 'one-time',
        kpi: 'Cont configurat',
        details: [
          'Creare / audit cont Google Ads',
          'Configurare Google Tag Manager',
          'Implementare tracking conversii (GA4 + Ads)',
          'Setup audiențe remarketing',
          'Configurare campanii inițiale (Search + PMax)',
        ],
      },
      {
        id: 'del-07',
        service: 'Management Campanii Google Ads',
        description: 'Administrare continuă a campaniilor PPC: optimizare bidding, audiențe, ad copy, buget',
        frequency: 'lunar',
        kpi: 'ROAS, CPA, CTR',
        details: [
          'Optimizare bidding și buget zilnic',
          'A/B testing texte publicitare',
          'Gestionare cuvinte cheie negative',
          'Ajustare audiențe și plasamente',
          'Raportare lunară PPC cu KPIs',
        ],
      },
      {
        id: 'del-08',
        service: 'Raport Performanță Lunar',
        description: 'Raport complet cu indicatorii de performanță, analiza rezultatelor și recomandări pentru luna următoare',
        frequency: 'lunar',
        kpi: 'Raport PDF + Dashboard',
        details: [
          'Evoluție poziții cuvinte cheie',
          'Trafic organic vs. paid (GA4)',
          'Performanță campanii Ads (CTR, CPC, CPA, ROAS)',
          'Activități realizate în luna curentă',
          'Recomandări și plan pentru luna următoare',
        ],
      },
    ],

    // ── SECTION B: Plan de Implementare (editabil per client) ──
    defaultPhases: [
      {
        id: 'phase-1',
        name: 'Onboarding & Setup Tehnic',
        period: 'Luna 1',
        tasks: [
          'Primirea și configurarea acceselor: CMS (WordPress/Next.js), Google Analytics 4, Google Search Console, Google Tag Manager, Google Ads, Google Business Profile',
          'Audit SEO tehnic complet — scanare, analiză și raport cu priorități',
          'Cercetare inițială cuvinte cheie — identificarea a 50+ keywords strategice',
          'Setup complet cont Google Ads — structură campanii, tracking conversii, audiențe',
          'Instalare LinkedIn Ads Pixel pentru retargeting cross-platform',
          'Configurare sistem AI Programmatic SEO — integrare surse RSS, pipeline AI, publicare automată pe CMS',
          'Definirea KPI-urilor de bază și a dashboard-ului de raportare (Google Looker Studio)',
        ],
        deliverable: 'Documentul de Strategie Inițială + Raport Audit SEO + Cont Ads configurat',
      },
      {
        id: 'phase-2',
        name: 'Implementare & Lansare',
        period: 'Lunile 2-3',
        tasks: [
          'Implementare recomandări audit SEO — remedierea erorilor tehnice critice',
          'Optimizare On-Page a primelor 15-20 pagini prioritare (title, meta, headings, Schema.org)',
          'Lansare campanii Google Ads pilot — Search + Performance Max pe piața Danemarca',
          'Publicare primele articole Programmatic SEO (2-4 articole/lună, traduse în limbile țintă)',
          'Configurare strategii de linkbuilding — identificare oportunități guest posting',
          'Monitorizare zilnică a campaniilor Ads — optimizare bidding, cuvinte cheie negative',
          'Primul raport lunar complet de performanță',
        ],
        deliverable: 'Raport de progres Luna 2 + Metrici de bază SEO & Ads stabilite',
      },
      {
        id: 'phase-3',
        name: 'Scalare & Optimizare Continuă',
        period: 'Lunile 4-6',
        tasks: [
          'Scalare producție conținut: 4-8 articole/lună prin pipeline AI',
          'Link building activ — 4+ backlinks de calitate pe lună (DA 30+)',
          'Extindere campanii Google Ads pe piețe suplimentare (Suedia, Finlanda)',
          'Optimizare campanii pe baza datelor acumulate — A/B testing ad copy, landing pages',
          'Implementare strategie retargeting LinkedIn din audiența colectată pe blog',
          'Analiză competitivă trimestrială — ajustare strategie pe baza evoluției pieței',
          'Raport lunar complet + meeting de alignment cu clientul',
        ],
        deliverable: 'Raport trimestrial de performanță complet cu ROI și recomandări strategice',
      },
    ],

    // ── SECTION C: Cadrul de Raportare (standard) ──
    defaultReporting: {
      frequency: 'Lunar — până la data de 10 a lunii următoare perioadei de raportare',
      format: 'Raport PDF detaliat + Dashboard live Google Looker Studio (acces permanent)',
      meetingCadence: 'La cerere sau bilunar (conform preferinței Beneficiarului)',
      kpis: [
        {
          category: 'SEO Organic',
          metrics: [
            'Poziții cuvinte cheie (Top 3, Top 10, Top 20)',
            'Trafic organic (sesiuni, utilizatori unici)',
            'Click-through rate organic (GSC)',
            'Paginile indexate și erorile de crawl',
            'Autoritate domeniu (DA/DR) și profil backlinks',
          ],
        },
        {
          category: 'Google Ads (PPC)',
          metrics: [
            'Cost per Click (CPC) mediu',
            'Click-through Rate (CTR)',
            'Cost per Achiziție (CPA)',
            'Return on Ad Spend (ROAS)',
            'Impression Share și poziția medie',
            'Număr conversii și valoare conversii',
          ],
        },
        {
          category: 'Programmatic SEO',
          metrics: [
            'Articole publicate (per limbă)',
            'Trafic generat de articolele AI',
            'Indexare articole noi (Google Search Console)',
            'Audiență retargeting LinkedIn (dimensiune pixel)',
          ],
        },
        {
          category: 'General',
          metrics: [
            'Sesiuni totale website (toate sursele)',
            'Bounce Rate / Engagement Rate',
            'Conversii totale (formulare, telefon, email)',
            'Evoluție față de luna precedentă (%)',
          ],
        },
      ],
    },
  },
]
