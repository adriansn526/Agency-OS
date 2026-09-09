// ─── Report Themes — Color Palettes per Business Line ───
// Used on the public report page to apply dynamic branding.
// Each BL gets its own color scheme applied via CSS custom properties.

export interface ReportTheme {
  slug: string
  name: string
  logo: string
  // ── Gradient (header) ──
  gradientFrom: string
  gradientVia: string
  gradientTo: string
  gradient: string
  // ── Primary colors ──
  primary: string
  primaryLight: string
  accent: string
  // ── Surfaces ──
  surface: string
  surfaceCard: string
  // ── Text ──
  kpiHighlight: string
  // ── Chart palette ──
  chartColors: string[]
  // ── Misc ──
  spinnerColor: string
  iconBg: string
}

export const REPORT_THEMES: Record<string, ReportTheme> = {
  agency: {
    slug: "agency",
    name: "ASNS Agency",
    logo: "/logos/agency-logo.png",
    gradientFrom: "#1e1b4b",
    gradientVia: "#312e81",
    gradientTo: "#4338ca",
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
    primary: "#4338ca",
    primaryLight: "#6366f1",
    accent: "#818cf8",
    surface: "#f8fafc",
    surfaceCard: "#ffffff",
    kpiHighlight: "#4338ca",
    chartColors: ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#4338ca", "#312e81"],
    spinnerColor: "#6366f1",
    iconBg: "#eef2ff",
  },
  fudly: {
    slug: "fudly",
    name: "Fudly",
    logo: "/logos/fudly-logo.png",
    gradientFrom: "#7f1d1d",
    gradientVia: "#b91c1c",
    gradientTo: "#ea580c",
    gradient: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #ea580c 100%)",
    primary: "#dc2626",
    primaryLight: "#f97316",
    accent: "#fb923c",
    surface: "#fff7ed",
    surfaceCard: "#fffbf5",
    kpiHighlight: "#dc2626",
    chartColors: ["#ef4444", "#f97316", "#fb923c", "#fdba74", "#dc2626", "#b91c1c"],
    spinnerColor: "#f97316",
    iconBg: "#fff1e6",
  },
  climaticpro: {
    slug: "climaticpro",
    name: "ClimaticPro",
    logo: "/logos/climaticpro-logo.png",
    gradientFrom: "#0c4a6e",
    gradientVia: "#075985",
    gradientTo: "#0284c7",
    gradient: "linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0284c7 100%)",
    primary: "#0369a1",
    primaryLight: "#0ea5e9",
    accent: "#38bdf8",
    surface: "#f0f9ff",
    surfaceCard: "#f8fdff",
    kpiHighlight: "#0369a1",
    chartColors: ["#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd", "#0369a1", "#075985"],
    spinnerColor: "#0ea5e9",
    iconBg: "#e0f2fe",
  },
}

// Fallback to agency theme for unknown BLs
const DEFAULT_THEME_SLUG = "agency"

/**
 * Get the report color theme for a given business line slug.
 * Falls back to the agency theme if the slug is not recognized.
 */
export function getReportTheme(blSlug: string): ReportTheme {
  return REPORT_THEMES[blSlug] ?? REPORT_THEMES[DEFAULT_THEME_SLUG]!
}

/**
 * Convert a ReportTheme to CSS custom properties (inline style object).
 * Apply this on the root element of the public report page.
 */
export function getThemeCSSVariables(theme: ReportTheme): Record<string, string> {
  return {
    "--rpt-primary": theme.primary,
    "--rpt-primary-light": theme.primaryLight,
    "--rpt-accent": theme.accent,
    "--rpt-gradient-from": theme.gradientFrom,
    "--rpt-gradient-via": theme.gradientVia,
    "--rpt-gradient-to": theme.gradientTo,
    "--rpt-gradient": theme.gradient,
    "--rpt-surface": theme.surface,
    "--rpt-surface-card": theme.surfaceCard,
    "--rpt-kpi-highlight": theme.kpiHighlight,
    "--rpt-spinner": theme.spinnerColor,
    "--rpt-icon-bg": theme.iconBg,
    "--rpt-chart-1": theme.chartColors[0] || theme.primary,
    "--rpt-chart-2": theme.chartColors[1] || theme.primaryLight,
    "--rpt-chart-3": theme.chartColors[2] || theme.accent,
    "--rpt-chart-4": theme.chartColors[3] || theme.accent,
  }
}
