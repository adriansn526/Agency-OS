"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Building2,
  Users,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  HardHat,
  Activity,
  AlertTriangle,
  Loader2,
  UserPlus,
  Boxes,
  DollarSign,
  RefreshCw,
  ArrowRight,
  Zap,
  Shield,
  Clock,
} from "lucide-react"

/* ============================================================
   Types
   ============================================================ */

interface TenantSummary {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  createdAt: string
  stats: {
    users: number
    clients: number
    projects: number
    invoices: number
    materials: number
    employees: number
  }
  modules: { moduleId: string; enabled: boolean }[]
  usage: {
    todayTokens: number
    monthTokens: number
    monthCostUsd: number
  }
}

/* ============================================================
   Plan Helpers
   ============================================================ */

const planConfig: Record<string, { label: string; color: string; bg: string }> = {
  starter:    { label: "Starter",    color: "text-blue-400",   bg: "bg-blue-500/10" },
  pro:        { label: "Pro",        color: "text-amber-400",  bg: "bg-amber-500/10" },
  enterprise: { label: "Enterprise", color: "text-violet-400", bg: "bg-violet-500/10" },
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active:    { label: "Activ",     color: "text-success",     dot: "bg-success" },
  trial:     { label: "Trial",     color: "text-warning",     dot: "bg-warning" },
  suspended: { label: "Suspendat", color: "text-destructive", dot: "bg-destructive" },
}

function PlanBadge({ plan }: { plan: string }) {
  const cfg = planConfig[plan] || planConfig.starter
  return (
    <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider", cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  )
}

function StatusDot({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.active
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
      <span className={cn("text-[11px] font-medium", cfg.color)}>{cfg.label}</span>
    </div>
  )
}

/* ============================================================
   Stat Card
   ============================================================ */

function StatCard({
  label,
  value,
  icon,
  color,
  href,
  subValue,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  href: string
  subValue?: string
}) {
  return (
    <Link
      href={href}
      className="bg-surface rounded-xl border border-border p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          {icon}
        </div>
        <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {subValue && (
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subValue}</p>
      )}
    </Link>
  )
}

/* ============================================================
   Tenant Row
   ============================================================ */

function TenantRow({ tenant }: { tenant: TenantSummary }) {
  const enabledModules = tenant.modules.filter((m) => m.enabled).length

  return (
    <Link
      href={`/intraconstruct/tenants/${tenant.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/20 transition-all group"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-[11px] font-bold text-amber-500 flex-shrink-0">
        {tenant.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {tenant.name}
          </p>
          <PlanBadge plan={tenant.plan} />
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <StatusDot status={tenant.status} />
          <span className="text-[10px] text-muted-foreground">{tenant.slug}.intraconstruct.ro</span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-5 text-[11px] text-muted-foreground">
        <div className="text-center">
          <p className="font-semibold text-foreground tabular-nums">{tenant.stats.users}</p>
          <p>Utilizatori</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground tabular-nums">{tenant.stats.clients}</p>
          <p>Clienți</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground tabular-nums">{tenant.stats.projects}</p>
          <p>Proiecte</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground tabular-nums">{enabledModules}</p>
          <p>Module</p>
        </div>
      </div>

      <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </Link>
  )
}

/* ============================================================
   Main Dashboard
   ============================================================ */

export default function IntraConstructDashboard() {
  const [tenants, setTenants] = useState<TenantSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/intraconstruct/tenants")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setTenants(json.tenants || [])
    } catch (err: any) {
      console.error("[IntraConstruct Dashboard] Fetch failed")
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Computed Stats ───
  const activeTenants = tenants.filter((t) => t.status === "active")
  const trialTenants = tenants.filter((t) => t.status === "trial")
  const suspendedTenants = tenants.filter((t) => t.status === "suspended")
  const totalUsers = tenants.reduce((s, t) => s + t.stats.users, 0)
  const totalClients = tenants.reduce((s, t) => s + t.stats.clients, 0)
  const totalProjects = tenants.reduce((s, t) => s + t.stats.projects, 0)

  // MRR estimate based on plans
  const planPrices: Record<string, number> = { starter: 0, pro: 149, enterprise: 499 }
  const mrr = activeTenants.reduce((s, t) => s + (planPrices[t.plan] || 0), 0)

  // AI cost this month
  const totalAiCost = tenants.reduce((s, t) => s + t.usage.monthCostUsd, 0)
  const totalAiCostRon = totalAiCost * 4.5

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-amber-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Se încarcă datele IntraConstruct...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <HardHat size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">IntraConstruct</h1>
              <p className="text-xs text-muted-foreground">Control Plane — Gestiune Tenanți ERP</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Reîmprospătează
          </button>
          <Link
            href="/intraconstruct/tenants"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-500 transition-colors"
          >
            <Building2 size={14} />
            Gestionare Tenanți
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Eroare la conexiunea cu IntraConstruct-ERP</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="ml-auto px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
          >
            Reîncearcă
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard
          label="Tenanți Activi"
          value={String(activeTenants.length)}
          subValue={`din ${tenants.length} total`}
          icon={<Building2 size={20} />}
          color="bg-amber-500/10 text-amber-500"
          href="/intraconstruct/tenants"
        />
        <StatCard
          label="Utilizatori Totali"
          value={String(totalUsers)}
          icon={<Users size={20} />}
          color="bg-primary/10 text-primary"
          href="/intraconstruct/tenants"
        />
        <StatCard
          label="Clienți Gestionați"
          value={String(totalClients)}
          icon={<UserPlus size={20} />}
          color="bg-info/10 text-info"
          href="/intraconstruct/tenants"
        />
        <StatCard
          label="Proiecte Active"
          value={String(totalProjects)}
          icon={<FolderKanban size={20} />}
          color="bg-accent/10 text-accent"
          href="/intraconstruct/tenants"
        />
        <StatCard
          label="MRR Subscripții"
          value={formatCurrency(mrr, false, "RON")}
          subValue={`${activeTenants.length} planuri active`}
          icon={<DollarSign size={20} />}
          color="bg-success/10 text-success"
          href="/intraconstruct/usage"
        />
        <StatCard
          label="Cost AI / Lună"
          value={formatCurrency(totalAiCostRon, false, "RON")}
          subValue={totalAiCost > 0 ? `$${totalAiCost.toFixed(2)} USD` : "Fără date"}
          icon={<Zap size={20} />}
          color="bg-violet-500/10 text-violet-400"
          href="/intraconstruct/usage"
        />
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plan Distribution */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield size={16} className="text-amber-500" />
            Distribuție Planuri
          </h3>
          <div className="space-y-3">
            {Object.entries(planConfig).map(([plan, cfg]) => {
              const count = tenants.filter((t) => t.plan === plan).length
              const pct = tenants.length > 0 ? Math.round((count / tenants.length) * 100) : 0
              return (
                <div key={plan} className="flex items-center gap-3">
                  <span className={cn("text-xs font-medium w-20", cfg.color)}>{cfg.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", cfg.bg.replace("/10", ""))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground tabular-nums w-12 text-right">
                    {count} ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Cards */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity size={16} className="text-amber-500" />
            Status Tenanți
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-xs text-foreground">Activi</span>
              </div>
              <span className="text-sm font-bold text-success tabular-nums">{activeTenants.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-xs text-foreground">Trial</span>
              </div>
              <span className="text-sm font-bold text-warning tabular-nums">{trialTenants.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-xs text-foreground">Suspendați</span>
              </div>
              <span className="text-sm font-bold text-destructive tabular-nums">{suspendedTenants.length}</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Boxes size={16} className="text-amber-500" />
            Acces Rapid
          </h3>
          <div className="space-y-2">
            <Link
              href="/intraconstruct/tenants"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
            >
              <Building2 size={16} className="text-amber-500" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground group-hover:text-amber-500 transition-colors">Tenant Manager</p>
                <p className="text-[10px] text-muted-foreground">CRUD, module, configurări</p>
              </div>
              <ArrowRight size={14} className="text-muted-foreground" />
            </Link>
            <Link
              href="/intraconstruct/usage"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group"
            >
              <Activity size={16} className="text-violet-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground group-hover:text-violet-400 transition-colors">AI Usage & Billing</p>
                <p className="text-[10px] text-muted-foreground">Consum, costuri, profit</p>
              </div>
              <ArrowRight size={14} className="text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Tenants */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            Tenanți Recenți
          </h3>
          <Link
            href="/intraconstruct/tenants"
            className="text-xs text-amber-500 hover:text-amber-400 font-medium transition-colors"
          >
            Vezi toți →
          </Link>
        </div>
        <div className="space-y-2">
          {tenants.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-8 text-center">
              <Building2 size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Niciun tenant înregistrat încă.</p>
              <Link
                href="/intraconstruct/tenants"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-500 transition-colors"
              >
                <UserPlus size={14} />
                Crează Primul Tenant
              </Link>
            </div>
          ) : (
            tenants.slice(0, 5).map((tenant) => (
              <TenantRow key={tenant.id} tenant={tenant} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
