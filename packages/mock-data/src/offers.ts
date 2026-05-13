import type { Offer } from './types'

/* ═══════════════════════════════════════════════════════
   Mock offers with REAL data from ASNS QualityControl
   offers (seo-ads-campaign & programmatic-seo-ads).
   ═══════════════════════════════════════════════════════ */

export const offers: Offer[] = [
  // ─────────────────────────────────────────────────────
  // OFFER 1: Campanie Publicitate SEO & Google Ads
  // Source: oferta-qualitycontrol.asns.ro/seo-ads-campaign
  // ─────────────────────────────────────────────────────
  {
    id: "off-001",
    number: "OF-2026-001",
    businessLine: "agency",
    entityType: "client",
    entityId: "cli-001",
    entityName: "MARYSTELV S.R.L.",
    projectName: "QualityControl.com.ro",
    templateId: "tpl-seo-ads",
    templateName: "Campanie Publicitate SEO & Google Ads",
    status: "trimisa",
    value: 700,
    currency: "EUR",
    validUntil: "2026-06-01",
    createdAt: "2026-03-15",
    updatedAt: "2026-03-20",
    createdBy: "usr-001",
    sentAt: "2026-03-20",
    viewedAt: "2026-03-21",
    customFieldValues: { pret_lunar: "700 EUR/lună" },
    blocks: [
      // ── HERO TEXT ──
      {
        id: "b-001-01",
        type: "text",
        title: "Strategie Directă pe Profilul Clientului Ideal",
        subtitle: "Crește vizibilitatea și atrage clienți noi din Europa Centrală și Zona Nordică (Suedia, Danemarca, Finlanda)",
        data: {
          content: "Am definit profilul Clientului Ideal (ICP) ca fiind Supply Chain Manager sau Director de Operațiuni în branduri Europene care au nevoie de audituri (ex. SMETA, SA8000) și controlul calității în România. Folosind Google Ads API, am analizat piețele Nordice. Descoperirea principală este că termenii de certificare socială și inspecție au un volum susținut pe plan nativ (în suedeză, daneză și finlandeză), oferind click-uri B2B calificate la costuri foarte scăzute (spre deosebire de engleză, unde CPC-ul trece frecvent de 20 EUR)."
        },
      },
      // ── STATS KPI ──
      {
        id: "b-001-02",
        type: "stats",
        title: "Date Globale Piețe Analizate",
        data: {
          items: [
            { value: "6.5K+", label: "Căutări/Lună", sublabel: "Volum total cuvinte cheie", color: "orange" },
            { value: "€8.50", label: "CPC Mediu", sublabel: "Cost per click Google Ads", color: "green" },
            { value: "LOW-MEDIUM", label: "Competiție", sublabel: "Nivel competiție industrie", color: "blue" },
            { value: "EXTREM DE RIDICAT", label: "Oportunitate", sublabel: "Potențial de creștere", color: "purple" },
          ],
        },
      },
      // ── SERVICES GRID ──
      {
        id: "b-001-03",
        type: "services",
        title: "Ce Include Campania",
        data: {
          services: [
            {
              title: "Optimizare SEO Avansată",
              icon: "TrendingUp",
              description: "Optimizare tehnică și de conținut pentru motoarele de căutare",
              features: [
                "Audit SEO complet și identificare oportunități",
                "Optimizare on-page (meta tags, headings, structură)",
                "Optimizare tehnică (viteză, mobile, Core Web Vitals)",
                "Link building de calitate din surse relevante",
                "Content marketing și articole optimizate SEO",
                "Monitorizare poziții și raportare lunară",
              ],
            },
            {
              title: "Campanii Google Ads",
              icon: "Target",
              description: "Campanii targetate pentru industria de inspecție și audit",
              features: [
                "Setup complet cont Google Ads",
                "Cercetare cuvinte cheie cu date reale de căutare",
                "Creare anunțuri persuasive și relevante",
                "Targetare geografică și demografică precisă",
                "Optimizare continuă pentru ROI maxim",
                "A/B testing anunțuri și landing pages",
              ],
            },
            {
              title: "Administrare Website",
              icon: "Globe",
              description: "Mentenanță și optimizare continuă a website-ului",
              features: [
                "Actualizări securitate și framework-uri",
                "Backup zilnic și monitorizare 24/7",
                "Optimizări continue performanță",
                "Modificări conținut și imagini",
                "Integrare formulare și tracking",
                "Suport tehnic prioritar",
              ],
              included: true,
              badge: "INCLUS",
            },
            {
              title: "Administrare Campanie Google Ads",
              icon: "Settings",
              description: "Management profesional al campaniilor publicitare",
              features: [
                "Monitorizare zilnică performanță",
                "Ajustare budgete și licitații",
                "Optimizare cuvinte cheie și anunțuri",
                "Excludere termeni negativi",
                "Rapoarte detaliate săptămânale",
                "Consultanță strategică lunară",
              ],
              included: true,
              badge: "INCLUS",
            },
          ],
        },
      },
      // ── KEYWORD RESEARCH ──
      {
        id: "b-001-04",
        type: "keyword_research",
        title: "Analiza Cuvintelor Cheie — Date Reale Google Ads API",
        subtitle: "Volumele de căutare reale din piețele europene. Am testat keywords pe 11 țări și am descoperit că piața este de 6-9x mai mare decât estimările inițiale, dar trebuie targetată în limbile native!",
        data: {
          insight: {
            title: "Descoperire Majoră: Nordicii caută nativ și urmăresc etica socială",
            findings: [
              "Finlanda: CPC-uri extrem de avantajoase (sub €7 în medie) pentru audit și control calitate (vs 17-20 EUR pe engleză).",
              "Suedia: ~300 căutări lunare B2B strict pe 'kvalitetskontroll' și derivate, cu intenție complet setată (Low competition).",
              "Danemarca & Finlanda: Cautări explicite pe plan local pentru audituri SMETA (ex. smeta auditointi) care reflectă standardele Nordice înalte pe linia furnizorilor est-europeni.",
              "Germania & Turcia rămân ancore cu un volum uriaș, dar dominat în continuare de limba maternă.",
            ],
            conclusion: "Clienții B2B și Supply Chain Managerii caută în limba lor nativă. Audiența nordică pune foarte mult preț pe auditurile sociale (SMETA, SA8000).",
          },
          dataSource: "Google Ads Keyword Planner API - Date reale testate în Ianuarie 2026",
          methodology: "Testare pe 11 țări cu targetare geografică și lingvistică. Comparație engleză vs limbă nativă pentru fiecare piață.",
          markets: [
            {
              country: "Danemarca", language: "Daneză", totalVolume: "220", avgCPC: "€6.02", opportunity: "RIDICAT",
              strategyHighlight: "Campaniile de mare performanță targetate pe țările nordice folosesc o arhitectură hibridă. Pe lângă cele 220 de căutări în daneză, am identificat încă 240 de căutări identice în limba engleză (ex. 'quality control') exclusiv de pe teritoriul Danemarcei de la expați și corporatiști.",
              keywords: [
                { term: "kvalitetskontrol", translation: "control calitate", volume: "140", competition: "LOW", cpc: "€11.71 - €27.43" },
                { term: "smeta audit", translation: "audit SMETA", volume: "40", competition: "LOW", cpc: "€15.10 - €17.94" },
                { term: "leverandøraudit", translation: "audit furnizor", volume: "10", competition: "LOW", cpc: "€0.00 - €0.00" },
              ],
            },
            {
              country: "Finlanda", language: "Finlandeză", totalVolume: "300", avgCPC: "€6.55", opportunity: "EXTREM DE RIDICAT",
              keywords: [
                { term: "laadunvalvonta", translation: "control calitate", volume: "140", competition: "LOW", cpc: "€6.21 - €14.81" },
                { term: "laaduntarkastus", translation: "inspecție calitate", volume: "90", competition: "LOW", cpc: "€0.00 - €0.00" },
                { term: "toimittaja auditointi", translation: "audit furnizor", volume: "30", competition: "MEDIUM", cpc: "€4.68 - €19.71" },
                { term: "smeta auditointi", translation: "audit SMETA", volume: "30", competition: "LOW", cpc: "€2.95 - €17.17" },
              ],
            },
            {
              country: "Suedia", language: "Suedeză", totalVolume: "290", avgCPC: "€8.19", opportunity: "RIDICAT",
              keywords: [
                { term: "kvalitetskontroll", translation: "control calitate", volume: "260", competition: "LOW", cpc: "€12.09 - €37.06" },
                { term: "kvalitetsinspektion", translation: "inspecție calitate", volume: "20", competition: "LOW", cpc: "€0.00 - €0.00" },
                { term: "social revision", translation: "audit social", volume: "10", competition: "LOW", cpc: "€0.00 - €0.00" },
              ],
            },
            {
              country: "Germania", language: "Germană", totalVolume: "3.2K", avgCPC: "€20.15", opportunity: "EXTREM DE RIDICAT",
              keywords: [
                { term: "qualitätskontrolle", translation: "control calitate", volume: "1.9K", competition: "LOW", cpc: "€5.41 - €11.89" },
                { term: "qualitätsprüfung", translation: "inspecție calitate", volume: "480", competition: "LOW", cpc: "€5.94 - €16.29" },
                { term: "lieferantenaudit", translation: "audit furnizor", volume: "390", competition: "LOW", cpc: "€7.11 - €42.50" },
                { term: "iso audit", translation: "audit ISO", volume: "390", competition: "MEDIUM", cpc: "€6.34 - €19.10" },
              ],
            },
            {
              country: "Franța", language: "Franceză", totalVolume: "1.25K", avgCPC: "€6.07", opportunity: "RIDICAT",
              keywords: [
                { term: "contrôle qualité", translation: "control calitate", volume: "720", competition: "LOW", cpc: "€2.78 - €14.26" },
                { term: "audit iso", translation: "audit ISO", volume: "210", competition: "LOW", cpc: "€5.98 - €21.87" },
                { term: "audit fournisseur", translation: "audit furnizor", volume: "210", competition: "LOW", cpc: "€4.43 - €23.46" },
              ],
            },
            {
              country: "Turcia", language: "Turcă", totalVolume: "1.4K", avgCPC: "€3.49", opportunity: "RIDICAT",
              keywords: [
                { term: "kalite kontrol", translation: "control calitate", volume: "1.3K", competition: "LOW", cpc: "€0.75 - €2.77" },
                { term: "iso denetimi", translation: "audit ISO", volume: "70", competition: "MEDIUM", cpc: "€1.19 - €6.68" },
              ],
            },
            {
              country: "România", language: "Română/Engleză", totalVolume: "110", avgCPC: "€2.71 - €5.05", opportunity: "MEDIU",
              keywords: [
                { term: "control calitate", volume: "50", competition: "MEDIUM", cpc: "€0.21 - €3.22" },
                { term: "audit iso", volume: "40", competition: "MEDIUM", cpc: "€1.62 - €6.85" },
              ],
            },
          ],
        },
      },
      // ── PACKAGES ──
      {
        id: "b-001-05",
        type: "packages",
        title: "Investiție și Pachete SEO",
        subtitle: "Alege pachetul potrivit pentru afacerea ta",
        data: {
          packages: [
            {
              name: "Pachet SEO România",
              price: "450 EUR/lună",
              setupFee: "500 EUR",
              features: [
                "Setup campanie Google Ads (România)",
                "Cercetare 20 cuvinte cheie (RO + EN)",
                "3 grupuri de anunțuri",
                "Optimizare SEO on-page (5 pagini)",
                "Site bilingv RO/EN",
                "Administrare website INCLUSĂ",
                "Administrare campanie Ads INCLUSĂ",
                "Rapoarte lunare performanță",
                "Suport email",
              ],
              ideal: "Piața locală, buget limitat, ~110 căutări/lună",
            },
            {
              name: "Pachet SEO Multi-Țară",
              recommended: true,
              badge: "RECOMANDAT",
              price: "700 EUR/lună",
              setupFee: "1.200 EUR",
              features: [
                "Setup campanii Google Ads (2 țări)",
                "Cercetare 100+ cuvinte cheie (limbi native)",
                "Landing pages în 2 limbi (DE/FR/TR)",
                "10+ grupuri de anunțuri per țară",
                "Optimizare SEO completă multi-lingvă",
                "Content marketing (3 articole/lună)",
                "Link building (8 backlink-uri/lună)",
                "Administrare website INCLUSĂ",
                "Administrare campanii Ads INCLUSĂ",
                "Remarketing și display ads",
                "Rapoarte lunare per țară",
                "Consultanță strategică lunară",
                "Administrare website INCLUSĂ",
              ],
              ideal: "Expansiune europeană, ~4.5K căutări/lună, ROI ridicat",
            },
            {
              name: "Pachet SEO Enterprise Global",
              price: "1.200 EUR/lună",
              setupFee: "2.500 EUR",
              features: [
                "Strategie marketing globală (5+ țări)",
                "Cercetare nelimitată cuvinte cheie",
                "Landing pages în 5+ limbi",
                "20+ grupuri de anunțuri per țară",
                "SEO avansat + optimizare tehnică",
                "Content marketing (6 articole/lună)",
                "Link building agresiv (15+ backlink-uri/lună)",
                "Administrare website INCLUSĂ",
                "Administrare campanii Ads INCLUSĂ",
                "Campanii remarketing avansate",
                "Landing pages dedicate per țară",
                "A/B testing continuu",
                "Suport 24/7",
              ],
              ideal: "Corporații internaționale, expansiune globală",
            },
          ],
          note: "Bugetul publicitar Google Ads este separat și se plătește direct către Google. Prețurile de mai sus reprezintă doar costul serviciilor noastre de management și optimizare.",
        },
      },
      // ── REZULTATE AȘTEPTATE ──
      {
        id: "b-001-06",
        type: "stats",
        title: "Rezultate Așteptate",
        subtitle: "Ce poți obține cu o campanie SEO & Google Ads bine optimizată",
        data: {
          items: [
            { value: "+150%", label: "Trafic Organic", sublabel: "Creștere semnificativă a vizitatorilor din căutări Google", color: "green" },
            { value: "+200%", label: "Lead-uri Calificate", sublabel: "Mai multe cereri de ofertă de la clienți potențiali relevanți", color: "blue" },
            { value: "3-5%", label: "Conversii Google Ads", sublabel: "Rate de conversie peste media industriei (1-2%)", color: "orange" },
            { value: "300-500%", label: "ROI Publicitate", sublabel: "Fiecare 1 EUR investit generează 3-5 EUR venit", color: "purple" },
          ],
        },
      },
      // ── TIMELINE ──
      {
        id: "b-001-07",
        type: "timeline",
        title: "Procesul Nostru",
        data: {
          steps: [
            { step: 1, title: "Audit & Strategie", duration: "Săptămâna 1", description: "Analizăm situația actuală, competiția și identificăm oportunități", deliverables: ["Audit SEO complet", "Analiza competitorilor", "Cercetare cuvinte cheie cu date reale", "Strategie personalizată"] },
            { step: 2, title: "Setup & Implementare", duration: "Săptămânile 2-3", description: "Configurăm campaniile și optimizăm website-ul", deliverables: ["Setup cont Google Ads", "Creare anunțuri și grupuri", "Optimizare on-page SEO", "Instalare tracking și conversii"] },
            { step: 3, title: "Lansare & Monitorizare", duration: "Săptămâna 4", description: "Lansăm campaniile și monitorizăm performanța zilnic", deliverables: ["Lansare campanii Google Ads", "Monitorizare zilnică", "Ajustări rapide", "Primul raport de performanță"] },
            { step: 4, title: "Optimizare Continuă", duration: "Lunar", description: "Optimizăm constant pentru rezultate mai bune", deliverables: ["Optimizare cuvinte cheie", "A/B testing anunțuri", "Content marketing", "Link building", "Rapoarte lunare detaliate"] },
          ],
        },
      },
      // ── CE ESTE INCLUS ──
      {
        id: "b-001-08",
        type: "features",
        title: "Ce Este Inclus",
        subtitle: "Tot ce ai nevoie pentru o campanie de succes",
        data: {
          categories: [
            { name: "Google Ads Management", items: ["Setup complet cont Google Ads", "Cercetare cuvinte cheie cu Google Keyword Planner", "Creare și optimizare anunțuri", "Monitorizare și ajustare zilnică", "Optimizare licitații și bugete", "Rapoarte detaliate performanță"] },
            { name: "Optimizare SEO", items: ["Audit SEO tehnic complet", "Optimizare on-page (toate paginile)", "Optimizare viteză și Core Web Vitals", "Schema markup și rich snippets", "Optimizare pentru mobile", "Monitorizare poziții Google"] },
            { name: "Administrare Website", items: ["Actualizări securitate lunare", "Backup zilnic automat", "Monitorizare uptime 24/7", "Modificări conținut nelimitate", "Optimizări performanță", "Suport tehnic prioritar"] },
            { name: "Content & Link Building", items: ["Articole blog optimizate SEO", "Optimizare conținut existent", "Link building de calitate", "Guest posting pe site-uri relevante", "Promovare social media", "Newsletter marketing (opțional)"] },
          ],
        },
      },
      // ── FAQ ──
      {
        id: "b-001-09",
        type: "faq",
        title: "Întrebări Frecvente",
        data: {
          items: [
            { question: "Care este diferența între SEO și Google Ads?", answer: "SEO (Search Engine Optimization) este optimizarea site-ului pentru a apărea organic în rezultatele Google, fără a plăti pentru fiecare click. Rezultatele apar în timp (3-6 luni) dar sunt durabile. Google Ads este publicitate plătită unde plătești pentru fiecare click, dar rezultatele sunt imediate. Recomandăm ambele: Ads pentru rezultate rapide și SEO pentru creștere pe termen lung." },
            { question: "Cât costă bugetul publicitar Google Ads?", answer: "Bugetul publicitar este separat de serviciile noastre și se plătește direct către Google. Recomandăm minimum 500-1.000 EUR/lună pentru rezultate vizibile. Cu un buget de 1.000 EUR și CPC mediu de €2.80, poți obține ~350 clickuri/lună." },
            { question: "Cât timp durează până văd rezultate?", answer: "Google Ads: rezultate imediate (în 24-48h de la lansare). SEO: primele îmbunătățiri în 1-2 luni, rezultate semnificative în 3-6 luni. Recomandăm un angajament de minimum 6 luni." },
            { question: "Ce se întâmplă cu site-ul meu dacă opresc campania?", answer: "Site-ul rămâne al tău și funcțional. Optimizările SEO făcute rămân active și continuă să aducă trafic organic. Google Ads se oprește imediat, dar beneficiile SEO persistă." },
            { question: "Pot vedea rezultatele campaniei în timp real?", answer: "Da! Vei avea acces la Google Analytics și Google Ads pentru a vedea performanța în timp real. În plus, îți trimitem rapoarte detaliate săptămânale/lunare." },
            { question: "Administrarea website-ului și a campaniei Ads este cu adevărat inclusă?", answer: "Da, 100% inclusă! Includem: administrare completă website (actualizări, backup, securitate, modificări conținut) + management zilnic campanie Google Ads (monitorizare, optimizare, ajustări). Nu există costuri ascunse." },
          ],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────
  // OFFER 2: Programmatic SEO & Google Ads
  // Source: oferta-qualitycontrol.asns.ro/programmatic-seo-ads
  // ─────────────────────────────────────────────────────
  {
    id: "off-002",
    number: "OF-2026-002",
    businessLine: "agency",
    entityType: "client",
    entityId: "cli-001",
    entityName: "MARYSTELV S.R.L.",
    projectName: "QualityControl.com.ro",
    templateId: "tpl-programmatic",
    templateName: "Sistem Hibrid: Trafic Imediat (Ads) + Creștere Organică (AI SEO)",
    status: "draft",
    value: 500,
    currency: "EUR",
    validUntil: "2026-06-01",
    createdAt: "2026-03-18",
    updatedAt: "2026-03-25",
    createdBy: "usr-001",
    customFieldValues: { pret_lunar: "500 EUR +TVA/lună" },
    blocks: [
      // ── HERO TEXT ──
      {
        id: "b-002-01",
        type: "text",
        title: "Noua Generație de Achiziție Clienți",
        subtitle: "Acaparăm piața nordică atacând din două unghiuri: interceptăm decidenții aflați deja în căutare (Google Ads) și le clădim permanent încredere prin știri de expertiză (Programmatic SEO).",
        data: {
          content: "Clienții din Suedia, Danemarca și Finlanda vor să afle ce se produce în estul Europei. Prin inteligență artificială, le oferim cele mai noi informații corporative gata traduse la superlativ. Platforma monitorizează exclusiv portaluri și ziare financiare de elită din România, axate pe investiții, fabrici (textile, procesare) și legislație.",
        },
      },
      // ── MOTOR PROGRAMMATIC SEO ──
      {
        id: "b-002-02",
        type: "features",
        title: "Motorul Programmatic SEO",
        subtitle: "Procesul automat de generare conținut pentru piețele nordice",
        data: {
          categories: [
            {
              name: "Surse Premium (România B2B)",
              items: [
                "Ziarul Financiar — zf.ro/industrie",
                "Economica.net — /industrie",
                "Wall-Street.ro — /companii",
                "Profit.ro — Afaceri locale",
              ],
            },
            {
              name: "Pipeline AI",
              items: [
                "1. Extragem știrile de industrie",
                "2. AI-ul adaugă expertiza Quality Control",
                "3. Traducere & publicare automată (Suedeză, Daneză etc.)",
              ],
            },
          ],
        },
      },
      // ── INOVAȚII / STRATEGII AVANSATE ──
      {
        id: "b-002-03",
        type: "services",
        title: "Inovații incluse în Pachet",
        subtitle: "Trei vectori prin care articolele devin Lead-uri corporative B2B",
        data: {
          services: [
            {
              title: "Generare Audiență Pixel",
              icon: "Target",
              description: "Orice utilizator (Quality Manager, Sourcing Lead) care ajunge pe un articol tradus este capturat de LinkedIn Ads Pixel. În a doua fază, îi targhetăm strict pe ei cu o campanie directă de conversie pe LinkedIn, deoarece deja știu expertiza QualityControl.",
              features: ["LinkedIn Ads Pixel instalat", "Audiență retargeting automată", "Campanie conversie Phase 2"],
            },
            {
              title: "LinkedIn Newsletters",
              icon: "MonitorSmartphone",
              description: "Conținutul prelucrat de AI nu stă doar pe blog. El poate fi automatizat să plece sub formă de Newsletter periodic (ex: \"Nordic Supply Chain Insights\") către abonații paginii de LinkedIn, dublând gratuit vizibilitatea organică.",
              features: ["Newsletter automatizat", "Distribuție LinkedIn organică", "\"Nordic Supply Chain Insights\""],
            },
            {
              title: "Agenda CSDDD & ESG",
              icon: "TrendingUp",
              description: "Sistemul AI este devotat să extragă inclusiv știri despre legile Uniunii Europene de sustenabilitate și amenzi. Un articol nordic despre pericolele neconformității CSRD cu un call-to-action către \"Auditul SMETA\" este extrem de persuasiv.",
              features: ["Monitorizare legislație EU", "Conținut CSRD/ESG automat", "CTA către Audit SMETA"],
            },
          ],
        },
      },
      // ── PRICING ──
      {
        id: "b-002-04",
        type: "pricing",
        title: "Investiție",
        data: {
          lines: [
            { label: "Agency Fee (SEO + Ads Management) / lună", amount: 500 },
            { label: "Sistem AI Programmatic SEO / lună", amount: 0 },
            { label: "Instalare Pixel & Configurare Audiență Retargeting", amount: 0 },
            { label: "Buget Media Sugerat (Pilot Danemarca) / lună", amount: 400 },
          ],
          currency: "EUR",
          total: 900,
          totalLabel: "Total Lunar Estimat",
          note: "Agency Fee: 500€ +TVA/lună. Bugetul media (400€) se achită de către firmă direct către contul Google Ads propriu. Configurare & Gestionare extinsă Google Ads + Setare & Mentenanță Sistem AI Programmatic SEO pe blog incluse.",
        },
      },
      // ── PILOT DANEMARCA STATS ──
      {
        id: "b-002-05",
        type: "stats",
        title: "Pilot Inițial: Danemarca",
        subtitle: "Buget media sugerat pentru achiziția imediată de trafic",
        data: {
          items: [
            { value: "400€", label: "Buget Media/Lună", sublabel: "Plătit direct către Google Ads", color: "blue" },
            { value: "~460", label: "Căutări B2B/Lună", sublabel: "220 daneză + 240 engleză", color: "green" },
            { value: "~30", label: "Click-uri Așteptate", sublabel: "Din intenție B2B garantată", color: "orange" },
            { value: "100%", label: "Intenție B2B", sublabel: "Audiență pre-calificată", color: "purple" },
          ],
        },
      },
    ],
  },
]
