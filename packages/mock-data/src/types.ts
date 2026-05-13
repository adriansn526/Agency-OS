// ============================================================
// ASNS Agency OS — Core Data Models
// ============================================================

// ─── Pipeline Statuses (Union of all entity type pipelines) ───

// Agency
export type AgencyLeadStatus = 'contactat' | 'calificat' | 'oferta_trimisa' | 'negociere' | 'castigat' | 'pierdut'
// Fudly — Restaurants
export type FudlyLeadStatus = 'trial' | 'onboarding' | 'activ_fudly' | 'churn_risk' | 'churned'
// ClimaticPRO — End Clients
export type ClimaticProClientStatus = 'cerere' | 'oferta_cp' | 'programat' | 'instalat' | 'garantie'
// ClimaticPRO — Installers
export type ClimaticProInstallerStatus = 'aplicat_inst' | 'verificat_inst' | 'activ_inst' | 'suspendat_inst'
// ClimaticPRO — Suppliers
export type ClimaticProSupplierStatus = 'contactat_fz' | 'negociere_fz' | 'contract_activ' | 'inactiv_fz'

// Union of all lead/entity statuses
export type LeadStatus =
  | AgencyLeadStatus
  | FudlyLeadStatus
  | ClimaticProClientStatus
  | ClimaticProInstallerStatus
  | ClimaticProSupplierStatus

export type ClientStatus = 'activ' | 'inactiv' | 'prospect'
export type ProjectStatus = 'planificare' | 'in_lucru' | 'review' | 'finalizat' | 'suspendat'
export type ProjectType = 'website' | 'seo' | 'seo_programmatic' | 'google_ads' | 'mentenanta' | 'audit' | 'onboarding_restaurant' | 'menu_setup' | 'instalare_ac' | 'mentenanta_hvac' | 'linkedin_campaign' | 'instagram_campaign' | 'facebook_campaign' | 'tiktok_campaign'
export type LeadSource = 'website' | 'referral' | 'linkedin' | 'cold_outreach' | 'google_ads' | 'marketplace' | 'partner'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type InvoiceStatus = 'emisa' | 'trimisa' | 'platita' | 'restanta'
export type InvoiceType = 'proforma' | 'fiscala' | 'subscriptie'
export type InvoiceDirection = 'emisa' | 'primita' // emisa = income, primita = expense
export type RetainerStatus = 'activ' | 'inactiv' | 'expirat' | 'paused' | 'cancelled'
export type RetainerServiceStatus = 'active' | 'paused' | 'completed'
export type FinancialFlow = 'income' | 'expense' | 'both'
export type OfferStatus = 'draft' | 'trimisa' | 'vizualizata' | 'acceptata' | 'respinsa' | 'expirata' | 'contract_generat'
export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer'

export interface Client {
  id: string
  businessLine: string
  entityType: string
  companyName: string
  cui: string
  regCom?: string
  contactPerson: string
  email: string
  phone: string
  status: ClientStatus
  industry: string
  website?: string
  address?: string
  monthlyRevenue: number
  contractStartDate: string
  services: string[]
  notes?: string
  avatarUrl?: string
  createdAt: string
  /** Fudly-specific */
  plan?: string
  activeOrders?: number
  /** ClimaticPRO Installer-specific */
  rating?: number
  certificari?: string
  zonaAcoperire?: string
  nrInstalari?: number
  /** ClimaticPRO Supplier-specific */
  produse?: string
  termenPlata?: number
  discountNegociat?: number
}

export interface Lead {
  id: string
  businessLine: string
  entityType: string
  companyName: string
  contactPerson: string
  email: string
  phone?: string
  status: LeadStatus
  source: LeadSource
  estimatedValue: number
  probability: number
  priority: Priority
  assignedTo: string
  nextAction?: string
  nextActionDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  businessLine: string
  entityType: string
  clientId: string
  name: string
  type: ProjectType
  status: ProjectStatus
  progress: number
  startDate: string
  deadline: string
  budget: number
  hoursEstimated: number
  hoursLogged: number
  teamMembers: string[]
}

export interface Invoice {
  id: string
  businessLine: string
  entityType: string
  clientId: string
  number: string
  status: InvoiceStatus
  type: InvoiceType
  direction: InvoiceDirection
  amount: number
  currency: string
  issuedDate: string
  dueDate: string
  paidDate?: string
  description: string
  items: { description: string; quantity: number; unitPrice: number }[]
}

export interface RetainerService {
  id: string
  projectId: string              // link to project in Projects module
  serviceName: string            // "SEO", "Google Ads Management"
  serviceType: ProjectType       // template id: 'seo', 'google_ads'
  billedSeparately: boolean      // false = included in package price
  individualPrice: number        // 600 for SEO, 0 for "included"
  status: RetainerServiceStatus
}

export interface Retainer {
  id: string
  businessLine: string
  entityType: string
  clientId: string
  // Package info
  name: string                   // "Digital Growth Package"
  description?: string
  // Billing
  monthlyAmount: number          // total package price
  currency: string
  billingDay?: number            // 1-31, day of invoicing
  // Services included
  includedServices: RetainerService[]
  // Legacy compat
  service: string                // display name (backward compat)
  // Period
  status: RetainerStatus
  startDate: string
  endDate?: string
  minimumPeriod?: string         // "6 luni" (minimum commitment)
  // Links
  contractId?: string
  offerId?: string
  // Billing state
  nextInvoiceDate: string
  paymentStatus: 'la_zi' | 'restanta'
}

export interface DashboardStats {
  totalClients: number
  activeProjects: number
  monthlyRevenue: number
  mrr: number
  openLeads: number
  conversionRate: number
  clientsTrend: number
  revenueTrend: number
  leadsTrend: number
  /** ClimaticPRO-specific */
  profitNet?: number
  instalariLuna?: number
  /** Fudly-specific */
  churnRate?: number
  ltv?: number
}

export interface Activity {
  id: string
  businessLine: string
  entityType: string
  type: 'lead_nou' | 'client_nou' | 'proiect_start' | 'factura_emisa' | 'factura_platita' | 'contract_semnat' | 'lead_pierdut' | 'restaurant_onboarded' | 'churn_alert' | 'instalare_completa' | 'plata_instalator' | 'comanda_furnizor'
  title: string
  description: string
  timestamp: string
  entityId?: string
  clientId?: string
}

export interface NavItem {
  title: string
  href: string
  icon: string
  badge?: number | string
  disabled?: boolean
  children?: NavItem[]
}

// ─── Offer Block System ───

export type OfferBlockType = 'text' | 'features' | 'equipment' | 'pricing' | 'packages' | 'timeline' | 'stats' | 'keyword_research' | 'services' | 'faq'

export interface TextBlockData {
  content: string
}

export interface FeaturesBlockData {
  categories: {
    name: string
    items: string[]
  }[]
}

export interface EquipmentBlockData {
  items: {
    name: string
    qty: number
    unitPrice: number
    unit?: string        // "RON", "EUR" etc.
  }[]
  subtotal?: number
  currency?: string
}

export interface PricingBlockData {
  lines: {
    label: string
    amount: number
  }[]
  currency: string
  total: number
  totalLabel?: string     // "Total cu TVA", "Grand Total" etc.
  note?: string
}

export interface PackagesBlockData {
  packages: {
    name: string
    recommended?: boolean
    price: string           // "450 EUR/lună"
    setupFee?: string       // "500 EUR"
    features: string[]
    ideal?: string          // "Piața locală, buget limitat"
    badge?: string          // "POPULAR"
  }[]
  note?: string
}

export interface TimelineBlockData {
  steps: {
    step: number
    title: string
    duration?: string
    description: string
    deliverables?: string[]
  }[]
}

export interface StatsBlockData {
  items: {
    value: string
    label: string
    sublabel?: string
    color?: 'orange' | 'green' | 'blue' | 'purple' | 'red' | 'indigo'
  }[]
}

export interface KeywordResearchBlockData {
  insight?: {
    title: string
    findings: string[]
    conclusion: string
  }
  dataSource?: string
  methodology?: string
  markets: {
    country: string
    language: string
    totalVolume: string
    avgCPC: string
    opportunity: string
    strategyHighlight?: string
    keywords: {
      term: string
      translation?: string
      volume: string
      competition: 'LOW' | 'MEDIUM' | 'HIGH'
      cpc: string
    }[]
  }[]
}

export interface ServicesBlockData {
  services: {
    title: string
    description: string
    icon?: string
    features: string[]
    included?: boolean
    badge?: string
  }[]
}

export interface FAQBlockData {
  items: {
    question: string
    answer: string
  }[]
}

export type OfferBlockData =
  | TextBlockData
  | FeaturesBlockData
  | EquipmentBlockData
  | PricingBlockData
  | PackagesBlockData
  | TimelineBlockData
  | StatsBlockData
  | KeywordResearchBlockData
  | ServicesBlockData
  | FAQBlockData

export interface OfferBlock {
  id: string
  type: OfferBlockType
  title: string
  subtitle?: string
  data: OfferBlockData
  aiGenerated?: boolean
}

// ─── Service Catalog ───

export type ServiceCategory = 'development' | 'marketing' | 'consultancy'
export type PricingUnit = 'fix' | 'lunar' | 'per_hour'

export interface ServiceCatalogItem {
  id: string
  name: string
  shortName: string
  icon: string              // Lucide icon name
  description: string
  category: ServiceCategory
  defaultPrice: number
  pricingUnit: PricingUnit
  setupFee?: number
  includedWith?: string[]   // IDs of services this comes free with
  defaultBlocks: OfferBlock[]
}

// ─── Offer Module (one service within a composite offer) ───

export interface OfferDiscount {
  type: 'percent' | 'fixed'
  value: number
  reason?: string           // 'Pachet combinat', 'Promoție', etc.
}

export type ModuleStatus = 'priced' | 'included_free' | 'optional'

export interface OfferModule {
  id: string
  serviceId: string         // from ServiceCatalogItem
  serviceName: string
  icon: string
  status: ModuleStatus
  price: number             // 0 if included_free
  pricingUnit: PricingUnit
  setupFee?: number
  discount?: OfferDiscount
  blocks: OfferBlock[]
  clientResponse?: 'accepted' | 'rejected' | null
}

// ─── Offer ───

export interface Offer {
  id: string
  number: string              // ex: OF-2026-001
  businessLine: string
  entityType: string
  entityId: string            // lead/client ID
  entityName: string          // display name (company)
  projectName?: string        // project/site name for header (e.g. "QualityControl.com.ro")
  templateId: string          // links to OfferTemplate.id
  templateName: string        // display name of template
  status: OfferStatus
  value: number
  currency: string
  blocks: OfferBlock[]        // legacy single-service blocks
  modules?: OfferModule[]     // NEW: composite offer modules
  bundleDiscount?: OfferDiscount
  customFieldValues: Record<string, string | number>
  validUntil: string          // expiration date
  createdAt: string
  updatedAt: string
  createdBy: string           // user ID
  sentAt?: string
  viewedAt?: string
  acceptedAt?: string
  notes?: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  businessLines: string[]     // which BLs this user has access to ('all' or specific IDs)
  initials: string
}

// ─── Company Settings ───

export interface CompanySettings {
  name: string
  legalName: string
  regCom: string              // J40/12223/2006
  cif: string                 // RO18890424
  address: string
  iban: string
  bank: string
  representative: string
  representativeRole: string
  email: string
  phone: string
  website: string
  logo?: string
}

// ─── Contract Settings & Templates ───

export interface ContractSettings {
  defaultDuration: number     // months (e.g. 12)
  defaultCurrency: string
  penaltyRate: number         // daily penalty % for late payment (e.g. 0.1)
  noticePeriod: number        // days for termination notice (e.g. 30)
  autoRenew: boolean
  paymentTermDays: number     // days after invoice (e.g. 5)
  numbering: Record<string, {  // per business line
    prefix: string             // e.g. 'ASNS-AG' for agency
    nextNumber: number         // next contract number
    year: number               // current year
  }>
}

export interface ContractSection {
  id: string
  title: string
  content: string             // supports {{variables}}
  editable: boolean           // can user edit this section?
  condition?: string          // show only if condition is met: 'seo' | 'ads' | 'always'
}

export interface ContractTemplate {
  id: string
  name: string
  description: string
  serviceTypes: string[]      // ['seo', 'ads', 'seo+ads']
  sections: ContractSection[]
}

export interface GeneratedContract {
  id: string
  offerId: string
  templateId: string
  entityName: string
  entityDetails: {
    legalName: string
    cif: string
    regCom: string
    address: string
    representative: string
    representativeRole: string
  }
  companyDetails: CompanySettings
  modules: string[]           // service IDs included
  price: number
  currency: string
  duration: number            // months
  startDate: string
  sections: ContractSection[] // resolved (variables replaced)
  anexa2?: StatementOfWork    // SoW attached
  status: 'draft' | 'sent' | 'signed' | 'active' | 'expired'
  createdAt: string
  signedAt?: string
}

// ─── Anexa 2 — Statement of Work (SoW) ───

export interface SoWDeliverable {
  id: string
  service: string
  description?: string
  frequency: 'one-time' | 'lunar' | 'trimestrial' | 'la cerere'
  kpi: string
  details?: string[]
}

export interface SoWPhase {
  id: string
  name: string
  period: string               // e.g. "Luna 1", "Lunile 2-3"
  tasks: string[]
  deliverable: string          // livrabil final al fazei
}

export interface SoWReporting {
  frequency: string
  format: string
  meetingCadence: string
  kpis: { category: string; metrics: string[] }[]
}

export interface StatementOfWork {
  // Section A — auto-generated from offer
  deliverables: SoWDeliverable[]
  pricing: {
    monthlyFee?: { amount: number; currency: string }
    setupFee?: { amount: number; currency: string }
    mediaBudget?: { amount: number; currency: string; note: string }
  }
  // Section B — editable implementation plan
  phases: SoWPhase[]
  // Section C — standard reporting template
  reporting: SoWReporting
}

export interface SoWTemplate {
  id: string
  name: string
  serviceTypes: string[]       // matches contract template serviceTypes
  defaultDeliverables: SoWDeliverable[]
  defaultPhases: SoWPhase[]
  defaultReporting: SoWReporting
}

// ─── Dashboard Widgets (Service-Aware Project Dashboards) ───

export type DataSource = 'gsc' | 'ga4' | 'google_ads' | 'posthog' | 'meta_ads' | 'linkedin_ads' | 'instagram' | 'tiktok_ads'
export type WidgetType = 'stat_card' | 'line_chart' | 'table' | 'bar_chart' | 'heatmap' | 'funnel' | 'pie_chart'
export type WidgetSize = 'sm' | 'md' | 'lg' | 'full'

export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  source: DataSource
  metric: string
  comparison?: 'previous_period' | 'previous_year'
  size: WidgetSize
}

export interface DefaultKPI {
  metric: string
  label: string
  source: DataSource | 'varies'
  unit: string                   // '%', 'clicks', '€', 'seconds', 'position'
  direction: 'up' | 'down'      // 'up' = bigger is better (clicks), 'down' = smaller is better (CPC)
}

export type TemplateCategory = 'marketing' | 'development' | 'consultancy' | 'saas' | 'marketplace'

// ─── KPI Mock Data types ───

export interface KPIValue {
  metric: string
  label: string
  value: number | string
  previousValue?: number | string
  change?: number               // percentage change
  direction: 'up' | 'down'
  unit: string
  source: DataSource
}

export interface TimeseriesPoint {
  date: string
  value: number
}

export interface KeywordData {
  keyword: string
  position: number
  previousPosition?: number
  clicks: number
  impressions: number
  ctr: number
  trend: 'up' | 'down' | 'stable'
}

export interface CampaignData {
  name: string
  spend: number
  clicks: number
  impressions: number
  conversions: number
  ctr: number
  cpc: number
  roas?: number
  status: 'active' | 'paused' | 'ended'
}

// ─── Communication Hub ───

export type CommunicationChannel = 'call' | 'whatsapp' | 'sms' | 'email' | 'video'
export type CallResult = 'answered' | 'no_answer' | 'busy' | 'voicemail'

export interface CommunicationEntry {
  id: string
  clientId: string
  clientName: string
  channel: CommunicationChannel
  direction: 'inbound' | 'outbound'
  subject: string
  body?: string
  date: string
  // Call-specific
  phone?: string
  callResult?: CallResult
  duration?: number              // minutes
  // Email-specific
  emailStatus?: 'sent' | 'delivered' | 'opened' | 'bounced'
  // Meeting-specific
  meetingType?: 'demo' | 'followup' | 'onboarding' | 'review' | 'internal'
  meetingUrl?: string
  participants?: string[]
  // General
  user: string
  businessLine: string
  templateId?: string
}

export interface CommunicationTemplate {
  id: string
  channel: CommunicationChannel
  name: string
  subject?: string
  body: string                   // supports {{variables}} like {{contactPerson}}, {{companyName}}
  variables: string[]
  category: 'follow_up' | 'reminder' | 'confirmation' | 'welcome' | 'report'
}
