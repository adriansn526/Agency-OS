// ============================================================
// ASNS Agency OS — Business Lines + Entity Types + Templates
// ============================================================

import type { DashboardWidget, DefaultKPI, DataSource, TemplateCategory } from './types'

export interface PipelineStage {
  key: string
  label: string
  color: string // Tailwind color token
}

export interface CustomField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'date' | 'rating'
  options?: string[] // for select type
}

export interface EntityType {
  id: string
  name: string
  namePlural: string
  icon: string
  pipeline: PipelineStage[]
  financialFlow: 'income' | 'expense' | 'both'
  customFields: CustomField[]
}

export type ProjectViewType = 'timeline' | 'stepper' | 'checklist'

export interface ProjectTemplate {
  id: string
  name: string
  phases: string[]
  checklist: string[]
  viewType: ProjectViewType
  linkedEntityTypes?: string[]
  billingType: 'retainer' | 'per_project' | 'subscription_activation'
  defaultDuration: string
  kpis: string[]
  // ─── v8: Service-Aware Dashboards ───
  category?: TemplateCategory
  dataConnectors?: DataSource[]
  dashboardWidgets?: DashboardWidget[]
  defaultKPIs?: DefaultKPI[]
}

export interface OfferTemplate {
  id: string
  name: string
  sections: string[]
  pricingType: 'monthly' | 'fixed' | 'itemized'
  customFields: string[]
  aiCapable: boolean
  aiDataSources?: string[]
}

export interface BusinessLine {
  id: string
  name: string
  shortName: string
  icon: string
  color: string
  bgClass: string
  textClass: string
  entityTypes: EntityType[]
  projectTemplates: ProjectTemplate[]     // ARRAY — multiple per BL
  offerTemplates: OfferTemplate[]         // Offer templates
  metrics: string[]
}

// ────────────────────────────────────────────
// BUSINESS LINE DEFINITIONS
// ────────────────────────────────────────────

export const businessLines: BusinessLine[] = [
  // ─── 🏢 SERVICII AGENȚIE ───────────────────
  {
    id: 'agency',
    name: 'Servicii Agenție',
    shortName: 'Agenție',
    icon: '🏢',
    color: '#2563eb',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-500',
    entityTypes: [
      {
        id: 'clients',
        name: 'Client B2B',
        namePlural: 'Clienți B2B',
        icon: '👤',
        financialFlow: 'income',
        pipeline: [
          { key: 'contactat', label: 'Contactat', color: 'info' },
          { key: 'calificat', label: 'Calificat', color: 'warning' },
          { key: 'oferta_trimisa', label: 'Ofertă Trimisă', color: 'accent' },
          { key: 'negociere', label: 'Negociere', color: 'primary' },
          { key: 'castigat', label: 'Câștigat', color: 'success' },
          { key: 'pierdut', label: 'Pierdut', color: 'destructive' },
        ],
        customFields: [
          { key: 'cui', label: 'CUI', type: 'text' },
          { key: 'reg_com', label: 'Reg. Com.', type: 'text' },
          { key: 'domeniu_web', label: 'Domeniu Web', type: 'text' },
          { key: 'tip_serviciu', label: 'Tip Serviciu', type: 'select', options: ['SEO', 'SEO Programmatic', 'Web Development', 'Google Ads', 'Consultanță', 'Audit'] },
        ],
      },
    ],
    projectTemplates: [
      {
        id: 'seo_project',
        name: 'Proiect SEO',
        phases: ['Audit', 'Strategie', 'Implementare', 'Monitorizare', 'Raportare'],
        checklist: ['Audit tehnic', 'Cercetare cuvinte cheie', 'Optimizare on-page', 'Creare conținut', 'Link building', 'Raport lunar'],
        viewType: 'timeline',
        billingType: 'retainer',
        defaultDuration: '6 luni',
        kpis: ['Trafic organic', 'Poziții Top 10', 'Conversii', 'ROI'],
        category: 'marketing',
        dataConnectors: ['gsc', 'ga4', 'posthog'],
        dashboardWidgets: [
          { id: 'w1', type: 'stat_card', source: 'gsc', metric: 'clicks', title: 'Clicks Organice', size: 'sm', comparison: 'previous_period' },
          { id: 'w2', type: 'stat_card', source: 'gsc', metric: 'impressions', title: 'Impresii', size: 'sm', comparison: 'previous_period' },
          { id: 'w3', type: 'stat_card', source: 'gsc', metric: 'ctr', title: 'CTR', size: 'sm', comparison: 'previous_period' },
          { id: 'w4', type: 'stat_card', source: 'gsc', metric: 'position', title: 'Poziție Medie', size: 'sm', comparison: 'previous_period' },
          { id: 'w5', type: 'line_chart', source: 'gsc', metric: 'clicks_over_time', title: 'Trafic Organic (6 luni)', size: 'full' },
          { id: 'w6', type: 'stat_card', source: 'ga4', metric: 'sessions', title: 'Sessions', size: 'sm', comparison: 'previous_period' },
          { id: 'w7', type: 'stat_card', source: 'ga4', metric: 'bounce_rate', title: 'Bounce Rate', size: 'sm', comparison: 'previous_period' },
          { id: 'w8', type: 'stat_card', source: 'ga4', metric: 'conversions', title: 'Conversii Organice', size: 'sm', comparison: 'previous_period' },
          { id: 'w9', type: 'table', source: 'gsc', metric: 'top_queries', title: 'Top Keywords (by Clicks)', size: 'full' },
          { id: 'w10', type: 'bar_chart', source: 'gsc', metric: 'position_distribution', title: 'Distribuție Poziții', size: 'md' },
        ],
        defaultKPIs: [
          { metric: 'organic_clicks', label: 'Clicks Organice', source: 'gsc', unit: 'clicks', direction: 'up' },
          { metric: 'avg_position', label: 'Poziție Medie', source: 'gsc', unit: 'pos', direction: 'down' },
          { metric: 'top10_keywords', label: 'Keywords Top 10', source: 'gsc', unit: 'kw', direction: 'up' },
          { metric: 'organic_conversions', label: 'Conversii Organice', source: 'ga4', unit: 'conv', direction: 'up' },
          { metric: 'bounce_rate', label: 'Bounce Rate', source: 'ga4', unit: '%', direction: 'down' },
        ],
      },
      {
        id: 'webdev_project',
        name: 'Proiect Web Development',
        phases: ['Brief', 'UX/UI Design', 'Development', 'Testing', 'Lansare', 'Mentenanță'],
        checklist: ['Brief aprobat', 'Wireframes aprobate', 'Design aprobat', 'Frontend gata', 'Backend gata', 'Testing QA', 'Deploy producție'],
        viewType: 'timeline',
        billingType: 'per_project',
        defaultDuration: '3 luni',
        kpis: ['Milestone-uri completate', 'Buget consumat', 'Bugs identificate'],
        category: 'development',
        dataConnectors: ['ga4', 'posthog'],
        dashboardWidgets: [
          { id: 'w1', type: 'stat_card', source: 'posthog', metric: 'lcp', title: 'LCP', size: 'sm' },
          { id: 'w2', type: 'stat_card', source: 'posthog', metric: 'fid', title: 'FID', size: 'sm' },
          { id: 'w3', type: 'stat_card', source: 'posthog', metric: 'cls', title: 'CLS', size: 'sm' },
          { id: 'w4', type: 'line_chart', source: 'ga4', metric: 'sessions_over_time', title: 'Trafic Post-Lansare', size: 'full' },
        ],
        defaultKPIs: [
          { metric: 'lcp', label: 'Largest Contentful Paint', source: 'posthog', unit: 's', direction: 'down' },
          { metric: 'cls', label: 'Cumulative Layout Shift', source: 'posthog', unit: 'score', direction: 'down' },
          { metric: 'sessions', label: 'Sessions', source: 'ga4', unit: 'sessions', direction: 'up' },
        ],
      },
      {
        id: 'ads_campaign',
        name: 'Campanie Google Ads',
        phases: ['Setup', 'Optimizare', 'Scalare'],
        checklist: ['Cont configurat', 'Conversii setate', 'Campanii create', 'Ads aprobate', 'Prima optimizare'],
        viewType: 'timeline',
        billingType: 'retainer',
        defaultDuration: '12 luni',
        kpis: ['CTR', 'CPC', 'Conversii', 'ROAS', 'Cost per Lead'],
        category: 'marketing',
        dataConnectors: ['google_ads', 'ga4'],
        dashboardWidgets: [
          { id: 'w1', type: 'stat_card', source: 'google_ads', metric: 'cost', title: 'Spend', size: 'sm', comparison: 'previous_period' },
          { id: 'w2', type: 'stat_card', source: 'google_ads', metric: 'clicks', title: 'Clicks', size: 'sm', comparison: 'previous_period' },
          { id: 'w3', type: 'stat_card', source: 'google_ads', metric: 'conversions', title: 'Conversii', size: 'sm', comparison: 'previous_period' },
          { id: 'w4', type: 'stat_card', source: 'google_ads', metric: 'roas', title: 'ROAS', size: 'sm', comparison: 'previous_period' },
          { id: 'w5', type: 'stat_card', source: 'google_ads', metric: 'cpc', title: 'CPC Mediu', size: 'sm' },
          { id: 'w6', type: 'stat_card', source: 'google_ads', metric: 'ctr', title: 'CTR', size: 'sm' },
          { id: 'w7', type: 'line_chart', source: 'google_ads', metric: 'spend_vs_conversions', title: 'Spend vs Conversii (30 zile)', size: 'full' },
          { id: 'w8', type: 'table', source: 'google_ads', metric: 'campaign_performance', title: 'Performance per Campanie', size: 'full' },
        ],
        defaultKPIs: [
          { metric: 'roas', label: 'ROAS', source: 'google_ads', unit: 'x', direction: 'up' },
          { metric: 'cpc', label: 'CPC', source: 'google_ads', unit: '€', direction: 'down' },
          { metric: 'conversions', label: 'Conversii', source: 'google_ads', unit: 'conv', direction: 'up' },
          { metric: 'cost_per_conversion', label: 'Cost/Conversie', source: 'google_ads', unit: '€', direction: 'down' },
          { metric: 'ctr', label: 'CTR', source: 'google_ads', unit: '%', direction: 'up' },
        ],
      },
      // ─── Social Campaign Templates (v8) ───
      {
        id: 'linkedin_campaign',
        name: 'LinkedIn Ads',
        phases: ['Strategie', 'Content Creation', 'Lansare', 'Optimizare', 'Raportare'],
        checklist: ['Brief aprobat', 'Calendar editorial', 'Conținut creat', 'Campanie lansată', 'Prima optimizare', 'Raport lunar'],
        viewType: 'timeline',
        billingType: 'retainer',
        defaultDuration: '3 luni',
        kpis: ['Leads', 'CPL', 'Engagement Rate', 'Impressions', 'CTR'],
        category: 'marketing',
        dataConnectors: ['linkedin_ads'],
        dashboardWidgets: [
          { id: 'w1', type: 'stat_card', source: 'linkedin_ads', metric: 'spend', title: 'Spend', size: 'sm', comparison: 'previous_period' },
          { id: 'w2', type: 'stat_card', source: 'linkedin_ads', metric: 'leads', title: 'Leads', size: 'sm', comparison: 'previous_period' },
          { id: 'w3', type: 'stat_card', source: 'linkedin_ads', metric: 'cpl', title: 'Cost/Lead', size: 'sm', comparison: 'previous_period' },
          { id: 'w4', type: 'stat_card', source: 'linkedin_ads', metric: 'impressions', title: 'Impresii', size: 'sm' },
          { id: 'w5', type: 'stat_card', source: 'linkedin_ads', metric: 'ctr', title: 'CTR', size: 'sm' },
          { id: 'w6', type: 'stat_card', source: 'linkedin_ads', metric: 'engagement_rate', title: 'Engagement', size: 'sm' },
          { id: 'w7', type: 'line_chart', source: 'linkedin_ads', metric: 'leads_over_time', title: 'Leads Trend', size: 'full' },
          { id: 'w8', type: 'table', source: 'linkedin_ads', metric: 'campaign_performance', title: 'Campaigns', size: 'full' },
        ],
        defaultKPIs: [
          { metric: 'leads', label: 'Leads', source: 'linkedin_ads', unit: 'leads', direction: 'up' },
          { metric: 'cpl', label: 'Cost/Lead', source: 'linkedin_ads', unit: '€', direction: 'down' },
          { metric: 'engagement_rate', label: 'Engagement Rate', source: 'linkedin_ads', unit: '%', direction: 'up' },
          { metric: 'ctr', label: 'CTR', source: 'linkedin_ads', unit: '%', direction: 'up' },
        ],
      },
      {
        id: 'instagram_campaign',
        name: 'Instagram Campaign',
        phases: ['Strategie', 'Content Creation', 'Lansare', 'Optimizare', 'Raportare'],
        checklist: ['Brief aprobat', 'Calendar editorial', 'Conținut creat', 'Campanie lansată', 'Prima optimizare', 'Raport lunar'],
        viewType: 'timeline',
        billingType: 'retainer',
        defaultDuration: '3 luni',
        kpis: ['Reach', 'Engagement Rate', 'Followers Growth', 'CPM'],
        category: 'marketing',
        dataConnectors: ['meta_ads', 'instagram'],
        dashboardWidgets: [
          { id: 'w1', type: 'stat_card', source: 'meta_ads', metric: 'spend', title: 'Spend', size: 'sm', comparison: 'previous_period' },
          { id: 'w2', type: 'stat_card', source: 'instagram', metric: 'reach', title: 'Reach', size: 'sm', comparison: 'previous_period' },
          { id: 'w3', type: 'stat_card', source: 'instagram', metric: 'engagement_rate', title: 'Engagement', size: 'sm', comparison: 'previous_period' },
          { id: 'w4', type: 'stat_card', source: 'instagram', metric: 'followers_growth', title: 'Followers +', size: 'sm' },
          { id: 'w5', type: 'line_chart', source: 'instagram', metric: 'reach_over_time', title: 'Reach Trend', size: 'full' },
          { id: 'w6', type: 'table', source: 'instagram', metric: 'top_posts', title: 'Top Posts', size: 'full' },
        ],
        defaultKPIs: [
          { metric: 'reach', label: 'Reach', source: 'instagram', unit: 'people', direction: 'up' },
          { metric: 'engagement_rate', label: 'Engagement Rate', source: 'instagram', unit: '%', direction: 'up' },
          { metric: 'followers_growth', label: 'Followers Growth', source: 'instagram', unit: 'followers', direction: 'up' },
        ],
      },
      {
        id: 'facebook_campaign',
        name: 'Facebook Ads',
        phases: ['Strategie', 'Setup Campanii', 'Optimizare', 'Scalare', 'Raportare'],
        checklist: ['Brief aprobat', 'Pixel configurat', 'Audiențe create', 'Campanie lansată', 'Prima optimizare'],
        viewType: 'timeline',
        billingType: 'retainer',
        defaultDuration: '6 luni',
        kpis: ['Leads', 'CPL', 'ROAS', 'Spend'],
        category: 'marketing',
        dataConnectors: ['meta_ads'],
        dashboardWidgets: [
          { id: 'w1', type: 'stat_card', source: 'meta_ads', metric: 'spend', title: 'Spend', size: 'sm', comparison: 'previous_period' },
          { id: 'w2', type: 'stat_card', source: 'meta_ads', metric: 'leads', title: 'Leads', size: 'sm', comparison: 'previous_period' },
          { id: 'w3', type: 'stat_card', source: 'meta_ads', metric: 'cpl', title: 'Cost/Lead', size: 'sm', comparison: 'previous_period' },
          { id: 'w4', type: 'stat_card', source: 'meta_ads', metric: 'roas', title: 'ROAS', size: 'sm' },
          { id: 'w5', type: 'line_chart', source: 'meta_ads', metric: 'spend_vs_results', title: 'Spend vs Results', size: 'full' },
          { id: 'w6', type: 'table', source: 'meta_ads', metric: 'adset_performance', title: 'Ad Sets', size: 'full' },
        ],
        defaultKPIs: [
          { metric: 'leads', label: 'Leads', source: 'meta_ads', unit: 'leads', direction: 'up' },
          { metric: 'cpl', label: 'Cost/Lead', source: 'meta_ads', unit: '€', direction: 'down' },
          { metric: 'roas', label: 'ROAS', source: 'meta_ads', unit: 'x', direction: 'up' },
        ],
      },
      {
        id: 'tiktok_campaign',
        name: 'TikTok Ads',
        phases: ['Strategie', 'Content Creation', 'Lansare', 'Optimizare', 'Raportare'],
        checklist: ['Brief aprobat', 'Video-uri create', 'Campanie lansată', 'Prima optimizare', 'Raport lunar'],
        viewType: 'timeline',
        billingType: 'retainer',
        defaultDuration: '3 luni',
        kpis: ['Video Views', 'Engagement Rate', 'CPC', 'Spend'],
        category: 'marketing',
        dataConnectors: ['tiktok_ads'],
        dashboardWidgets: [
          { id: 'w1', type: 'stat_card', source: 'tiktok_ads', metric: 'spend', title: 'Spend', size: 'sm', comparison: 'previous_period' },
          { id: 'w2', type: 'stat_card', source: 'tiktok_ads', metric: 'video_views', title: 'Video Views', size: 'sm', comparison: 'previous_period' },
          { id: 'w3', type: 'stat_card', source: 'tiktok_ads', metric: 'engagement_rate', title: 'Engagement', size: 'sm' },
          { id: 'w4', type: 'stat_card', source: 'tiktok_ads', metric: 'cpc', title: 'CPC', size: 'sm' },
          { id: 'w5', type: 'line_chart', source: 'tiktok_ads', metric: 'views_over_time', title: 'Views Trend', size: 'full' },
          { id: 'w6', type: 'table', source: 'tiktok_ads', metric: 'ad_performance', title: 'Top Ads', size: 'full' },
        ],
        defaultKPIs: [
          { metric: 'video_views', label: 'Video Views', source: 'tiktok_ads', unit: 'views', direction: 'up' },
          { metric: 'engagement_rate', label: 'Engagement Rate', source: 'tiktok_ads', unit: '%', direction: 'up' },
          { metric: 'cpc', label: 'CPC', source: 'tiktok_ads', unit: '€', direction: 'down' },
        ],
      },
    ],
    offerTemplates: [
      {
        id: 'seo_offer',
        name: 'Ofertă SEO Retainer',
        sections: ['Situația Curentă', 'Oportunități Identificate', 'Strategie Propusă', 'Livrabile Lunare', 'KPIs Țintă', 'Timeline', 'Investiție'],
        pricingType: 'monthly',
        customFields: ['pret_lunar', 'durata_contract', 'obiective_trafic'],
        aiCapable: true,
        aiDataSources: ['gsc', 'ga4'],
      },
      {
        id: 'webdev_offer',
        name: 'Ofertă Web Development',
        sections: ['Cerințe Proiect', 'Soluție Tehnică', 'Etape Livrare', 'Timeline', 'Investiție'],
        pricingType: 'fixed',
        customFields: ['pret_total', 'nr_pagini', 'functionalitati', 'termen_livrare'],
        aiCapable: false,
      },
      {
        id: 'ads_offer',
        name: 'Ofertă Google Ads Management',
        sections: ['Situația Curentă', 'Analiza Competiției', 'Strategie Ads', 'Buget Recomandat', 'KPIs Țintă', 'Fee Management'],
        pricingType: 'monthly',
        customFields: ['fee_lunar', 'buget_ads_recomandat', 'platform'],
        aiCapable: true,
        aiDataSources: ['google_ads', 'ga4'],
      },
    ],
    metrics: ['MRR', 'Clienți Activi', 'Rata Conversie', 'Valoare Pipeline'],
  },

  // ─── 🍕 FUDLY (SaaS) ──────────────────────
  {
    id: 'fudly',
    name: 'Fudly',
    shortName: 'Fudly',
    icon: '🍕',
    color: '#f97316',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-500',
    entityTypes: [
      {
        id: 'restaurants',
        name: 'Restaurant',
        namePlural: 'Restaurante',
        icon: '🍽️',
        financialFlow: 'income',
        pipeline: [
          { key: 'nou', label: 'Nou', color: 'primary' },
          { key: 'trial', label: 'Trial', color: 'info' },
          { key: 'onboarding', label: 'Onboarding', color: 'warning' },
          { key: 'activ_fudly', label: 'Activ', color: 'success' },
          { key: 'churn_risk', label: 'Churn Risk', color: 'accent' },
          { key: 'churned', label: 'Churned', color: 'destructive' },
        ],
        customFields: [
          { key: 'tip_bucatarie', label: 'Tip Bucătărie', type: 'select', options: ['Italiană', 'Românească', 'Asiatică', 'Fast Food', 'Mixtă'] },
          { key: 'plan_subscriptie', label: 'Plan Subscripție', type: 'select', options: ['Basic (29€)', 'Standard (49€)', 'Premium (99€)'] },
          { key: 'nr_comenzi_luna', label: 'Nr. Comenzi/Lună', type: 'number' },
        ],
      },
    ],
    projectTemplates: [
      {
        id: 'onboarding',
        name: 'Onboarding Restaurant',
        phases: ['Setup Cont', 'Configurare Meniu', 'Training', 'Go-Live', 'Follow-up'],
        checklist: ['Cont creat', 'Logo uploadat', 'Meniu complet', 'Personal instruit', 'Test comandă', 'Restaurant live'],
        viewType: 'checklist',
        billingType: 'subscription_activation',
        defaultDuration: '5 zile',
        kpis: ['Timp până la Go-Live', 'Nr. produse meniu', 'Prima comandă'],
      },
    ],
    offerTemplates: [
      {
        id: 'subscription_proposal',
        name: 'Propunere Plan Subscripție',
        sections: ['Beneficii Platformă', 'Comparație Planuri', 'Funcționalități Incluse', 'Testimoniale'],
        pricingType: 'monthly',
        customFields: ['plan_recomandat', 'pret_lunar', 'perioada_trial'],
        aiCapable: false,
      },
    ],
    metrics: ['MRR SaaS', 'Restaurante Active', 'Churn Rate', 'LTV'],
  },

  // ─── 🏗️ CLIMATICPRO (Marketplace) ──────────
  {
    id: 'climaticpro',
    name: 'ClimaticPRO',
    shortName: 'ClimaticPRO',
    icon: '🏗️',
    color: '#0891b2',
    bgClass: 'bg-cyan-600/10',
    textClass: 'text-cyan-600',
    entityTypes: [
      {
        id: 'end_clients',
        name: 'Client Final',
        namePlural: 'Clienți Finali',
        icon: '👤',
        financialFlow: 'income',
        pipeline: [
          { key: 'cerere', label: 'Cerere', color: 'info' },
          { key: 'oferta_cp', label: 'Ofertă', color: 'warning' },
          { key: 'programat', label: 'Programat', color: 'accent' },
          { key: 'instalat', label: 'Instalat', color: 'success' },
          { key: 'garantie', label: 'Garanție', color: 'primary' },
        ],
        customFields: [
          { key: 'adresa_instalare', label: 'Adresă Instalare', type: 'text' },
          { key: 'tip_echipament', label: 'Tip Echipament', type: 'select', options: ['AC Split', 'AC Multi-split', 'AC Duct', 'Pompă de Căldură', 'Centrală Termică'] },
          { key: 'nr_unitati', label: 'Nr. Unități', type: 'number' },
        ],
      },
      {
        id: 'installers',
        name: 'Instalator',
        namePlural: 'Instalatori',
        icon: '🔧',
        financialFlow: 'expense',
        pipeline: [
          { key: 'aplicat_inst', label: 'Aplicat', color: 'info' },
          { key: 'verificat_inst', label: 'Verificat', color: 'warning' },
          { key: 'activ_inst', label: 'Activ', color: 'success' },
          { key: 'suspendat_inst', label: 'Suspendat', color: 'destructive' },
        ],
        customFields: [
          { key: 'zona_acoperire', label: 'Zonă Acoperire', type: 'text' },
          { key: 'certificari', label: 'Certificări', type: 'text' },
          { key: 'rating', label: 'Rating', type: 'rating' },
          { key: 'nr_instalari', label: 'Nr. Instalări', type: 'number' },
        ],
      },
      {
        id: 'suppliers',
        name: 'Furnizor',
        namePlural: 'Furnizori Materiale',
        icon: '📦',
        financialFlow: 'expense',
        pipeline: [
          { key: 'contactat_fz', label: 'Contactat', color: 'info' },
          { key: 'negociere_fz', label: 'Negociere', color: 'warning' },
          { key: 'contract_activ', label: 'Contract Activ', color: 'success' },
          { key: 'inactiv_fz', label: 'Inactiv', color: 'destructive' },
        ],
        customFields: [
          { key: 'produse', label: 'Produse', type: 'text' },
          { key: 'termen_plata', label: 'Termen Plată (zile)', type: 'number' },
          { key: 'discount', label: 'Discount Negociat (%)', type: 'number' },
        ],
      },
    ],
    projectTemplates: [
      {
        id: 'ac_installation',
        name: 'Instalare AC',
        phases: ['Programare', 'Achiziție Materiale', 'Instalare', 'Verificare', 'PV Recepție'],
        checklist: ['Client confirmat', 'Materiale comandate', 'Instalator asignat', 'Instalare finalizată', 'Verificare OK', 'PV semnat'],
        viewType: 'stepper',
        linkedEntityTypes: ['end_clients', 'installers', 'suppliers'],
        billingType: 'per_project',
        defaultDuration: '3 zile',
        kpis: ['Timp execuție', 'Cost materiale', 'Profit net', 'Rating client'],
      },
    ],
    offerTemplates: [
      {
        id: 'ac_quote',
        name: 'Deviz Instalare AC',
        sections: ['Echipament Propus', 'Specificații Tehnice', 'Manoperă', 'Materiale Auxiliare', 'Total'],
        pricingType: 'itemized',
        customFields: ['model_ac', 'nr_unitati', 'pret_echipament', 'pret_manopera', 'pret_materiale'],
        aiCapable: false,
      },
    ],
    metrics: ['Instalări/Lună', 'Profit Net', 'Instalatori Activi', 'Cost Mediu Materiale'],
  },

  // ─── 🏗️ INTRACONSTRUCT ──────────────────────
  {
    id: 'intraconstruct',
    name: 'IntraConstruct',
    shortName: 'IntraConstruct',
    icon: '🏗️',
    color: '#f97316',
    bgClass: 'bg-orange-600/10',
    textClass: 'text-orange-600',
    entityTypes: [
      {
        id: 'clients',
        name: 'Client',
        namePlural: 'Clienți',
        icon: '👤',
        financialFlow: 'income',
        pipeline: [
          { key: 'contactat', label: 'Contactat', color: 'info' },
          { key: 'calificat', label: 'Calificat', color: 'warning' },
          { key: 'oferta_trimisa', label: 'Ofertă Trimisă', color: 'accent' },
          { key: 'negociere', label: 'Negociere', color: 'primary' },
          { key: 'castigat', label: 'Câștigat', color: 'success' },
          { key: 'pierdut', label: 'Pierdut', color: 'destructive' },
        ],
        customFields: [
          { key: 'cui', label: 'CUI', type: 'text' },
          { key: 'tip_lucrare', label: 'Tip Lucrare', type: 'select', options: ['Construcții Civile', 'Construcții Industriale', 'Renovări', 'Instalații', 'Drumuri', 'Consolidări'] },
          { key: 'valoare_proiect', label: 'Valoare Proiect (EUR)', type: 'number' },
        ],
      },
      {
        id: 'prospects',
        name: 'Prospect',
        namePlural: 'Prospecți',
        icon: '🎯',
        financialFlow: 'income',
        pipeline: [
          { key: 'cold', label: 'Cold', color: 'info' },
          { key: 'contactat', label: 'Contactat', color: 'warning' },
          { key: 'calificat', label: 'Calificat', color: 'accent' },
          { key: 'castigat', label: 'Câștigat', color: 'success' },
          { key: 'pierdut', label: 'Pierdut', color: 'destructive' },
        ],
        customFields: [
          { key: 'cui', label: 'CUI', type: 'text' },
          { key: 'domeniu', label: 'Domeniu Activitate', type: 'text' },
          { key: 'servicii', label: 'Servicii', type: 'text' },
        ],
      },
    ],
    projectTemplates: [
      {
        id: 'constructie',
        name: 'Proiect Construcție',
        phases: ['Cerere Ofertă', 'Evaluare', 'Ofertă', 'Contract', 'Execuție', 'Recepție'],
        checklist: ['Cerere analizată', 'Deviz întocmit', 'Ofertă trimisă', 'Contract semnat', 'Execuție începută', 'Recepție finalizată'],
        viewType: 'timeline',
        billingType: 'per_project',
        defaultDuration: '6 luni',
        kpis: ['Buget consumat', 'Deadline-uri respectate', 'Recepții finalizate'],
      },
      {
        id: 'renovare',
        name: 'Renovare',
        phases: ['Consultare', 'Proiect', 'Deviz', 'Execuție', 'Finalizare'],
        checklist: ['Consultare inițială', 'Proiect tehnic', 'Deviz aprobat', 'Lucrări începute', 'Recepție', 'Garanție'],
        viewType: 'stepper',
        billingType: 'per_project',
        defaultDuration: '2 luni',
        kpis: ['Timp execuție', 'Cost materiale', 'Satisfacție client'],
      },
    ],
    offerTemplates: [
      {
        id: 'deviz_constructie',
        name: 'Deviz Construcție',
        sections: ['Descriere Lucrări', 'Materiale', 'Manoperă', 'Utilaje', 'Transport', 'Total'],
        pricingType: 'itemized',
        customFields: ['suprafata_mp', 'tip_lucrare', 'termen_executie'],
        aiCapable: false,
      },
    ],
    metrics: ['Proiecte Active', 'Valoare Pipeline', 'Rata Conversie', 'Profit Net'],
  },
]

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────

export const getBusinessLine = (id: string): BusinessLine | undefined =>
  businessLines.find((bl) => bl.id === id)

export const getBusinessLineOrDefault = (id: string): BusinessLine =>
  businessLines.find((bl) => bl.id === id) || businessLines[0]!

export const getEntityType = (blId: string, etId: string): EntityType | undefined =>
  getBusinessLine(blId)?.entityTypes.find((et) => et.id === etId)

export const getDefaultEntityType = (blId: string): EntityType | undefined =>
  getBusinessLine(blId)?.entityTypes[0]

export const hasMultipleEntityTypes = (blId: string): boolean =>
  (getBusinessLine(blId)?.entityTypes.length ?? 0) > 1

export const allPipelineStageKeys = businessLines.flatMap((bl) =>
  bl.entityTypes.flatMap((et) => et.pipeline.map((s) => s.key))
)

export const getPipelineStages = (blId: string, etId: string): PipelineStage[] =>
  getEntityType(blId, etId)?.pipeline ?? []

/** Get the first (default) project template for a business line */
export const getDefaultProjectTemplate = (blId: string): ProjectTemplate | undefined =>
  getBusinessLine(blId)?.projectTemplates[0]

/** Get a specific project template by ID */
export const getProjectTemplate = (blId: string, templateId: string): ProjectTemplate | undefined =>
  getBusinessLine(blId)?.projectTemplates.find((t) => t.id === templateId)

export const getStageColorMap = (): Record<string, string> => {
  const map: Record<string, string> = {}
  businessLines.forEach((bl) =>
    bl.entityTypes.forEach((et) =>
      et.pipeline.forEach((s) => {
        map[s.key] = s.color
      })
    )
  )
  return map
}
