// ─── Report Widget Catalog ───
// Central registry of all available widgets for the public report.
// Used by admin widget editor and public page renderer.

export type WidgetSize = "full" | "half" | "third"

export type WidgetCategory =
  | "general"
  | "google_ads"
  | "seo"
  | "social"
  | "analytics"
  | "technical"
  | "ai"

export interface WidgetDefinition {
  type: string
  label: string
  description: string
  category: WidgetCategory
  categoryLabel: string
  icon: string // emoji
  defaultSize: WidgetSize
  /** Integration required — widget only makes sense if this is available */
  requiresIntegration?: "googleAds" | "gsc" | "posthog" | "uptime"
}

export interface WidgetConfig {
  type: string
  label: string
  enabled: boolean
  order: number
  size: WidgetSize
}

/**
 * Complete catalog of available widgets.
 * Order here represents the default ordering when creating a new report.
 */
export const WIDGET_CATALOG: WidgetDefinition[] = [
  // ── General ──
  {
    type: "conversions_hero",
    label: "Rezultate — Conversii",
    description: "KPI-uri hero: formulare, apeluri, WhatsApp, total conversii",
    category: "general",
    categoryLabel: "📊 General",
    icon: "🏆",
    defaultSize: "full",
  },
  {
    type: "source_attribution",
    label: "Surse Trafic — Attribution",
    description: "Grafic bar cu sursele de trafic (Google Ads, Organic, Social, Direct)",
    category: "general",
    categoryLabel: "📊 General",
    icon: "📊",
    defaultSize: "half",
    requiresIntegration: "posthog",
  },
  {
    type: "conversion_details",
    label: "Conversii Detaliate",
    description: "Landing pages cu conversii + form submissions per pagină",
    category: "general",
    categoryLabel: "📊 General",
    icon: "📋",
    defaultSize: "full",
  },

  // ── Google Ads ──
  {
    type: "google_ads_kpis",
    label: "Google Ads KPIs",
    description: "Impresii, click-uri, CTR, spend, CPC, conversii, ROAS",
    category: "google_ads",
    categoryLabel: "📣 Google Ads",
    icon: "📣",
    defaultSize: "full",
    requiresIntegration: "googleAds",
  },
  {
    type: "google_ads_trend",
    label: "Google Ads Trend",
    description: "Grafic trend zilnic pentru performanța Ads",
    category: "google_ads",
    categoryLabel: "📣 Google Ads",
    icon: "📈",
    defaultSize: "half",
    requiresIntegration: "googleAds",
  },
  {
    type: "google_ads_tables",
    label: "Google Ads Campanii & Termeni",
    description: "Tabel campanii + breakdown conversii + termeni de căutare",
    category: "google_ads",
    categoryLabel: "📣 Google Ads",
    icon: "📋",
    defaultSize: "full",
    requiresIntegration: "googleAds",
  },
  {
    type: "google_ads_extended",
    label: "Google Ads Analiză Extinsă",
    description: "Device breakdown, impression share, keywords, ora/zi performanță",
    category: "google_ads",
    categoryLabel: "📣 Google Ads",
    icon: "🔬",
    defaultSize: "full",
    requiresIntegration: "googleAds",
  },

  // ── SEO ──
  {
    type: "seo_kpis",
    label: "SEO KPIs",
    description: "Click-uri organice, impresii, CTR, poziție medie",
    category: "seo",
    categoryLabel: "🔍 SEO",
    icon: "🔍",
    defaultSize: "full",
    requiresIntegration: "gsc",
  },
  {
    type: "seo_trend",
    label: "SEO Trend",
    description: "Grafic trend zilnic pentru performanța SEO",
    category: "seo",
    categoryLabel: "🔍 SEO",
    icon: "📈",
    defaultSize: "half",
    requiresIntegration: "gsc",
  },
  {
    type: "seo_tables",
    label: "SEO Top Queries & Pages",
    description: "Top keywords și top pagini din Search Console",
    category: "seo",
    categoryLabel: "🔍 SEO",
    icon: "📋",
    defaultSize: "full",
    requiresIntegration: "gsc",
  },
  {
    type: "seo_articles",
    label: "Articole Noi SEO",
    description: "Articole de blog/ghiduri publicate recent cu metrici SEO",
    category: "seo",
    categoryLabel: "🔍 SEO",
    icon: "📝",
    defaultSize: "half",
    requiresIntegration: "gsc",
  },
  {
    type: "seo_page_keywords",
    label: "SEO Pagini & Recomandări",
    description: "Cross-reference pagini ↔ keywords + recomandări SEO automate",
    category: "seo",
    categoryLabel: "🔍 SEO",
    icon: "🔗",
    defaultSize: "full",
    requiresIntegration: "gsc",
  },

  // ── Social ──
  {
    type: "social_breakdown",
    label: "Social Media",
    description: "Breakdown trafic din social media (Facebook, Instagram, etc.)",
    category: "social",
    categoryLabel: "🌐 Social",
    icon: "🌐",
    defaultSize: "half",
    requiresIntegration: "posthog",
  },

  // ── Analytics ──
  {
    type: "posthog_traffic",
    label: "Website Analytics",
    description: "Trafic site, vizitatori unici, sesiuni, bounce rate, surse",
    category: "analytics",
    categoryLabel: "📊 Analytics",
    icon: "📊",
    defaultSize: "full",
    requiresIntegration: "posthog",
  },

  // ── Technical ──
  {
    type: "site_health",
    label: "Sănătate Site & Web Vitals",
    description: "Health score, Core Web Vitals (LCP, CLS, INP), excepții",
    category: "technical",
    categoryLabel: "🛡️ Tehnic",
    icon: "🛡️",
    defaultSize: "half",
    requiresIntegration: "posthog",
  },
  {
    type: "uptime",
    label: "Uptime Monitoring",
    description: "Disponibilitate site, timp răspuns mediu, incidente",
    category: "technical",
    categoryLabel: "🛡️ Tehnic",
    icon: "⏱",
    defaultSize: "half",
    requiresIntegration: "uptime",
  },

  // ── AI ──
  {
    type: "interpretation",
    label: "Interpretare & Analiză AI",
    description: "Rezumat AI generat cu highlights și recomandări",
    category: "ai",
    categoryLabel: "🤖 AI",
    icon: "✨",
    defaultSize: "full",
  },
]

/**
 * Get the catalog grouped by category
 */
export function getWidgetCatalogGrouped(): Record<string, WidgetDefinition[]> {
  const groups: Record<string, WidgetDefinition[]> = {}
  for (const w of WIDGET_CATALOG) {
    const key = w.categoryLabel
    if (!groups[key]) groups[key] = []
    groups[key].push(w)
  }
  return groups
}

/**
 * Find a widget definition by type
 */
export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return WIDGET_CATALOG.find(w => w.type === type)
}

/**
 * Generate default widget config list for a new report.
 * All widgets enabled, in catalog order.
 */
export function getDefaultWidgetConfigs(): WidgetConfig[] {
  return WIDGET_CATALOG.map((w, i) => ({
    type: w.type,
    label: w.label,
    enabled: true,
    order: i,
    size: w.defaultSize,
  }))
}

/**
 * Migrate legacy widget configs (without order/size) to the new format.
 * Preserves existing enabled state, adds missing fields.
 */
export function migrateWidgetConfigs(
  legacy: Array<{ type: string; label?: string; enabled: boolean; order?: number; size?: WidgetSize }>
): WidgetConfig[] {
  const result: WidgetConfig[] = legacy.map((w, i) => {
    const def = getWidgetDefinition(w.type)
    return {
      type: w.type,
      label: w.label || def?.label || w.type,
      enabled: w.enabled,
      order: w.order ?? i,
      size: w.size || def?.defaultSize || "full",
    }
  })

  // Add any new widgets from the catalog that aren't in the legacy config
  for (const catalogWidget of WIDGET_CATALOG) {
    if (!result.some(w => w.type === catalogWidget.type)) {
      result.push({
        type: catalogWidget.type,
        label: catalogWidget.label,
        enabled: true,
        order: result.length,
        size: catalogWidget.defaultSize,
      })
    }
  }

  return result.sort((a, b) => a.order - b.order)
}
