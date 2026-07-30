// ═══════════════════════════════════════════════════════
// IntraConstruct-ERP API Client
// ═══════════════════════════════════════════════════════
// Communicates with IntraConstruct-ERP internal API
// from Agency-OS backend (server-to-server).

const IC_API_URL = process.env.INTRACONSTRUCT_API_URL || "http://localhost:3200"
const IC_API_KEY = process.env.INTRACONSTRUCT_API_KEY || ""

interface ICApiOptions {
  method?: string
  body?: any
  params?: Record<string, string>
}

async function icFetch<T = any>(path: string, options: ICApiOptions = {}): Promise<T> {
  const { method = "GET", body, params } = options

  let url = `${IC_API_URL}${path}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  if (!IC_API_KEY) {
    throw new Error("INTRACONSTRUCT_API_KEY is not configured")
  }

  const headers: Record<string, string> = {
    "x-internal-api-key": IC_API_KEY,
    "Content-Type": "application/json",
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(error.error || `IntraConstruct API error: ${res.status}`)
  }

  return res.json()
}

// ─── Tenant Types ───

export interface ICTenantStats {
  users: number
  clients: number
  projects: number
  invoices: number
  materials: number
  employees: number
}

export interface ICTenantUsage {
  todayTokens: number
  monthTokens: number
  monthCostUsd: number
}

export interface ICTenantModule {
  moduleId: string
  enabled: boolean
  plan: string
  config: any
}

export interface ICTenant {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  domain: string | null
  logo: string | null
  color: string | null
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
  stats: ICTenantStats
  modules: ICTenantModule[]
  usage: ICTenantUsage
}

export interface ICTenantDetail extends ICTenant {
  config: any
  users: {
    id: string
    name: string
    email: string
    role: string
    lastLogin: string | null
  }[]
  businessLines: {
    id: string
    slug: string
    name: string
    icon: string
    color: string
  }[]
}

export interface ICModuleInfo {
  moduleId: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  requiredPlan: string
  addonPrice: number | null
  defaultEnabled: boolean
  enabled: boolean
  config: any
  configId: string | null
}

export interface ICUsageOverview {
  period: string
  periodStart: string
  tenants: any[]
  totals: {
    totalTenants: number
    activeTenants: number
    trialTenants: number
    suspendedTenants: number
    totalUsers: number
    totalClients: number
    totalProjects: number
    realCostUsd: number
    realCostRon: number
    revenueRon: number
    profitRon: number
    marginPercent: number
  }
}

// ─── API Client ───

export const icApi = {
  // ─── Tenants ───

  /** List all tenants with stats and usage */
  async getTenants(): Promise<{ tenants: ICTenant[] }> {
    return icFetch("/api/internal/tenants")
  },

  /** Get a single tenant by ID */
  async getTenant(id: string): Promise<ICTenantDetail> {
    return icFetch(`/api/internal/tenants/${encodeURIComponent(id)}`)
  },

  /** Create a new tenant */
  async createTenant(data: {
    name: string
    slug: string
    domain?: string
    plan?: string
    color?: string
    adminName?: string
    adminEmail?: string
    adminPassword?: string
  }): Promise<{ success: boolean; tenant: any; adminUserId: string | null }> {
    return icFetch("/api/internal/tenants", {
      method: "POST",
      body: data,
    })
  },

  /** Update a tenant */
  async updateTenant(
    id: string,
    data: Partial<{
      name: string
      plan: string
      status: string
      domain: string
      logo: string
      color: string
      config: any
      trialEndsAt: string
    }>
  ): Promise<any> {
    return icFetch(`/api/internal/tenants/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: data,
    })
  },

  /** Suspend a tenant */
  async suspendTenant(id: string): Promise<{ success: boolean }> {
    return icFetch(`/api/internal/tenants/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
  },

  // ─── Modules ───

  /** Get modules for a tenant */
  async getModules(
    tenantId: string
  ): Promise<{ tenantId: string; tenantPlan: string; modules: ICModuleInfo[] }> {
    return icFetch(`/api/internal/tenants/${encodeURIComponent(tenantId)}/modules`)
  },

  /** Update modules for a tenant */
  async updateModules(
    tenantId: string,
    updates: { moduleId: string; enabled?: boolean; config?: any }[]
  ): Promise<{ success: boolean; updated: any[] }> {
    return icFetch(`/api/internal/tenants/${encodeURIComponent(tenantId)}/modules`, {
      method: "PATCH",
      body: { updates },
    })
  },

  // ─── Usage ───

  /** Get AI usage stats for a specific tenant */
  async getTenantUsage(
    tenantId: string,
    period: "today" | "week" | "month" = "month"
  ): Promise<any> {
    return icFetch(`/api/internal/tenants/${encodeURIComponent(tenantId)}/usage`, {
      params: { period },
    })
  },

  /** Get platform-wide usage overview */
  async getUsageOverview(): Promise<ICUsageOverview> {
    return icFetch("/api/internal/usage/overview")
  },
}
