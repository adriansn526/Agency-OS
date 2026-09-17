import { z } from "zod";

// --- Pipeline Stage ---
export const pipelineStageSchema = z.object({
  key: z.string(),
  label: z.string(),
  color: z.string(),
});

// --- Custom Field ---
export const customFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "number", "select", "date", "rating"]),
  options: z.array(z.string()).optional(),
});

// --- Entity Type ---
export const entityTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  namePlural: z.string(),
  icon: z.string(),
  pipeline: z.array(pipelineStageSchema),
  financialFlow: z.enum(["income", "expense", "both"]),
  customFields: z.array(customFieldSchema),
});

// --- Dashboard Widgets & KPIs ---
export const dashboardWidgetSchema = z.object({
  id: z.string(),
  type: z.enum(['stat_card', 'line_chart', 'table', 'bar_chart', 'heatmap', 'funnel', 'pie_chart']),
  title: z.string(),
  source: z.enum(['gsc', 'ga4', 'google_ads', 'posthog', 'meta_ads', 'linkedin_ads', 'instagram', 'tiktok_ads']),
  metric: z.string(),
  comparison: z.enum(['previous_period', 'previous_year']).optional(),
  size: z.enum(['sm', 'md', 'lg', 'full']),
});

export const defaultKpiSchema = z.object({
  metric: z.string(),
  label: z.string(),
  source: z.enum(['gsc', 'ga4', 'google_ads', 'posthog', 'meta_ads', 'linkedin_ads', 'instagram', 'tiktok_ads', 'varies']),
  unit: z.string(),
  direction: z.enum(['up', 'down']),
});

// --- Project Template ---
export const projectTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  phases: z.array(z.string()),
  checklist: z.array(z.string()),
  viewType: z.enum(["timeline", "stepper", "checklist"]),
  linkedEntityTypes: z.array(z.string()).optional(),
  billingType: z.enum(["retainer", "per_project", "subscription_activation"]),
  defaultDuration: z.string(),
  kpis: z.array(z.string()),
  category: z.enum(['marketing', 'development', 'consultancy', 'saas', 'marketplace']).optional(),
  dataConnectors: z.array(z.string()).optional(), // or enum
  dashboardWidgets: z.array(dashboardWidgetSchema).optional(),
  defaultKPIs: z.array(defaultKpiSchema).optional(),
});

// --- Offer Template ---
export const offerTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  sections: z.array(z.string()),
  pricingType: z.enum(["monthly", "fixed", "itemized"]),
  customFields: z.array(z.string()),
  aiCapable: z.boolean(),
  aiDataSources: z.array(z.string()).optional(),
});

// --- MAIN CONFIG SCHEMA ---
export const businessLineConfigSchema = z.object({
  entityTypes: z.array(entityTypeSchema),
  projectTemplates: z.array(projectTemplateSchema),
  offerTemplates: z.array(offerTemplateSchema),
  metrics: z.array(z.string()),
});

export type PipelineStage = z.infer<typeof pipelineStageSchema>;
export type CustomField = z.infer<typeof customFieldSchema>;
export type EntityType = z.infer<typeof entityTypeSchema>;
export type ProjectTemplate = z.infer<typeof projectTemplateSchema>;
export type OfferTemplate = z.infer<typeof offerTemplateSchema>;
export type BusinessLineConfig = z.infer<typeof businessLineConfigSchema>;
