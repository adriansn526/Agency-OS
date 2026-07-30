"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Building2,
  Users,
  FolderKanban,
  Plus,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  ArrowRight,
  X,
  Check,
  HardHat,
  Eye,
  Pencil,
  ChevronDown,
  Package,
  RefreshCw,
} from "lucide-react"

/* ============================================================
   Types
   ============================================================ */

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  domain: string | null
  logo: string | null
  color: string | null
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
   Helpers
   ============================================================ */

const planConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter:    { label: "Starter",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  pro:        { label: "Pro",        color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  enterprise: { label: "Enterprise", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active:    { label: "Activ",     color: "text-success",     dot: "bg-success" },
  trial:     { label: "Trial",     color: "text-warning",     dot: "bg-warning" },
  suspended: { label: "Suspendat", color: "text-destructive", dot: "bg-destructive" },
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/* ============================================================
   Create Tenant Modal
   ============================================================ */

function CreateTenantModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    domain: "",
    plan: "pro",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSlugFromName = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50)
    setForm((prev) => ({ ...prev, name, slug }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/intraconstruct/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      onCreated()
      onClose()
      setForm({
        name: "",
        slug: "",
        domain: "",
        plan: "pro",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Plus size={16} className="text-white" />
            </div>
            <h2 className="text-base font-bold text-foreground">Tenant Nou</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Company Name */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Nume Companie <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleSlugFromName(e.target.value)}
              placeholder="Ex: HidroTech SRL"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Subdomeniu (slug) <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-0">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                placeholder="hidro-tech"
                className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-l-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              <span className="px-3 py-2 bg-muted border border-l-0 border-border rounded-r-lg text-xs text-muted-foreground">
                .intraconstruct.ro
              </span>
            </div>
          </div>

          {/* Domain */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Domeniu Custom (opțional)</label>
            <input
              type="text"
              value={form.domain}
              onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))}
              placeholder="erp.hidrotech.ro"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(planConfig).map(([plan, cfg]) => (
                <button
                  key={plan}
                  onClick={() => setForm((prev) => ({ ...prev, plan }))}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border text-xs font-medium transition-all",
                    form.plan === plan
                      ? cn(cfg.bg, cfg.border, cfg.color)
                      : "border-border text-muted-foreground hover:border-border/80"
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Administrator Tenant (opțional)</p>
          </div>

          {/* Admin Name */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Nume Admin</label>
            <input
              type="text"
              value={form.adminName}
              onChange={(e) => setForm((prev) => ({ ...prev, adminName: e.target.value }))}
              placeholder="Ion Popescu"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Admin Email */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Email Admin</label>
            <input
              type="email"
              value={form.adminEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, adminEmail: e.target.value }))}
              placeholder="ion@hidrotech.ro"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Admin Password */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Parolă Admin</label>
            <input
              type="password"
              value={form.adminPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
              placeholder="Minim 8 caractere"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <AlertTriangle size={14} className="text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.slug}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Creează Tenant
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Main Page
   ============================================================ */

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTenants = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/intraconstruct/tenants")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setTenants(json.tenants || [])
    } catch (err: any) {
      console.error("[Tenants] Fetch failed")
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  // Filtered tenants
  const filtered = tenants.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
    const matchPlan = planFilter === "all" || t.plan === planFilter
    const matchStatus = statusFilter === "all" || t.status === statusFilter
    return matchSearch && matchPlan && matchStatus
  })

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-amber-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Se încarcă tenanții...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Create Modal */}
      <CreateTenantModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => fetchTenants(true)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <HardHat size={22} className="text-amber-500" />
            Tenant Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tenants.length} tenanți înregistrați • {tenants.filter((t) => t.status === "active").length} activi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTenants(true)}
            disabled={refreshing}
            className="p-2 bg-surface border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-500 transition-colors shadow-lg shadow-amber-600/20"
          >
            <Plus size={14} />
            Tenant Nou
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după nume sau slug..."
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Plan Filter */}
        <div className="relative">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 bg-surface border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="all">Toate Planurile</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 bg-surface border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="all">Toate Statusurile</option>
            <option value="active">Activ</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspendat</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} din {tenants.length} tenanți
        </span>
      </div>

      {/* Tenant Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_60px] gap-3 px-5 py-3 bg-muted/30 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Tenant</span>
          <span>Plan</span>
          <span>Status</span>
          <span>Utilizatori</span>
          <span>Proiecte</span>
          <span>Creat</span>
          <span />
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search || planFilter !== "all" || statusFilter !== "all"
                ? "Niciun tenant nu corespunde filtrelor."
                : "Niciun tenant înregistrat."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((tenant) => {
              const plan = planConfig[tenant.plan] || planConfig.starter
              const status = statusConfig[tenant.status] || statusConfig.active
              const enabledModules = tenant.modules.filter((m) => m.enabled).length

              return (
                <Link
                  key={tenant.id}
                  href={`/intraconstruct/tenants/${tenant.id}`}
                  className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_60px] gap-3 px-5 py-4 hover:bg-muted/20 transition-colors group items-center"
                >
                  {/* Tenant */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{
                        background: tenant.color
                          ? `${tenant.color}15`
                          : "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.15))",
                        color: tenant.color || "#f59e0b",
                      }}
                    >
                      {tenant.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-amber-500 transition-colors">
                        {tenant.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {tenant.slug}.intraconstruct.ro
                      </p>
                    </div>
                  </div>

                  {/* Plan */}
                  <div>
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider",
                        plan.bg,
                        plan.color
                      )}
                    >
                      {plan.label}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", status.dot)} />
                    <span className={cn("text-xs font-medium", status.color)}>{status.label}</span>
                  </div>

                  {/* Users */}
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground tabular-nums">{tenant.stats.users}</span>
                  </div>

                  {/* Projects */}
                  <div className="flex items-center gap-1.5">
                    <FolderKanban size={14} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground tabular-nums">{tenant.stats.projects}</span>
                  </div>

                  {/* Created */}
                  <div>
                    <span className="text-xs text-muted-foreground">{formatDate(tenant.createdAt)}</span>
                  </div>

                  {/* Action */}
                  <div className="flex justify-end">
                    <ArrowRight
                      size={16}
                      className="text-muted-foreground group-hover:text-amber-500 transition-colors"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
