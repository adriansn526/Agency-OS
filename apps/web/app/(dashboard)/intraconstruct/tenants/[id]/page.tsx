"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { cn, formatCurrency } from "@/lib/utils"
import {
  ArrowLeft,
  Building2,
  Users,
  FolderKanban,
  Loader2,
  AlertTriangle,
  Check,
  X,
  HardHat,
  Shield,
  Activity,
  Package,
  Receipt,
  Boxes,
  Truck,
  UserCog,
  Save,
  RefreshCw,
  ExternalLink,
  Globe,
  Zap,
  ToggleLeft,
  ToggleRight,
  Mail,
  Clock,
  HardDrive,
  Download,
  RotateCcw,
  Trash2,
  Database,
  Cpu,
  Disc,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  Archive,
  Rocket,
  Server,
  Key,
  Wifi,
  WifiOff,
  Play,
  Terminal,
  CreditCard,
  Calendar,
} from "lucide-react"

/* ============================================================
   Types
   ============================================================ */

interface TenantDetail {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  domain: string | null
  logo: string | null
  color: string | null
  config: any
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
  stats: Record<string, number>
  modules: {
    id: string
    moduleId: string
    enabled: boolean
    plan: string
    config: any
  }[]
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
  }[]
}

interface ModuleInfo {
  moduleId: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  requiredPlan: string
  enabled: boolean
  config: any
}

/* ============================================================
   Helpers
   ============================================================ */

const planConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter:    { label: "Starter",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  pro:        { label: "Pro",        color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  enterprise: { label: "Enterprise", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: "Activ",     color: "text-success",     bg: "bg-success" },
  trial:     { label: "Trial",     color: "text-warning",     bg: "bg-warning" },
  suspended: { label: "Suspendat", color: "text-destructive", bg: "bg-destructive" },
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateShort(date: string | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/* ============================================================
   Tabs
   ============================================================ */

type Tab = "overview" | "modules" | "users" | "backups" | "migrate"

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Prezentare", icon: <Building2 size={14} /> },
  { id: "modules", label: "Module", icon: <Package size={14} /> },
  { id: "users", label: "Utilizatori", icon: <Users size={14} /> },
  { id: "backups", label: "Backups", icon: <Archive size={14} /> },
  { id: "migrate", label: "Migrare", icon: <Rocket size={14} /> },
]

/* ============================================================
   Main Page
   ============================================================ */

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string

  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [modules, setModules] = useState<ModuleInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [saving, setSaving] = useState(false)
  const [editPlan, setEditPlan] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string | null>(null)

  // Health & Backups state
  const [health, setHealth] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [backups, setBackups] = useState<any[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [backupRunning, setBackupRunning] = useState(false)
  const [restoreRunning, setRestoreRunning] = useState<string | null>(null)
  const [cronActive, setCronActive] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)

  // Migration state
  const [migrateData, setMigrateData] = useState<any>(null)
  const [migrateLoading, setMigrateLoading] = useState(false)
  const [sshTesting, setSshTesting] = useState(false)
  const [sshResult, setSshResult] = useState<any>(null)
  const [preflightChecks, setPreflightChecks] = useState<any[] | null>(null)
  const [preflightRunning, setPreflightRunning] = useState(false)
  const [migrationRunning, setMigrationRunning] = useState(false)
  const [serverConfig, setServerConfig] = useState({
    serverHost: "",
    sshUser: "deploy",
    sshPort: 22,
    sshPrivateKey: "",
    domain: "",
  })

  const fetchTenant = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [tenantRes, modulesRes] = await Promise.all([
        fetch(`/api/intraconstruct/tenants/${tenantId}`),
        fetch(`/api/intraconstruct/tenants/${tenantId}/modules`),
      ])

      if (!tenantRes.ok) throw new Error(`HTTP ${tenantRes.status}`)
      const tenantData = await tenantRes.json()
      setTenant(tenantData)

      if (modulesRes.ok) {
        const modulesData = await modulesRes.json()
        setModules(modulesData.modules || [])
      }
    } catch (err: any) {
      console.error("[TenantDetail] Fetch failed")
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchTenant()
  }, [fetchTenant])

  // ─── Fetch Health ───
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/health`)
      if (res.ok) setHealth(await res.json())
    } catch {} finally {
      setHealthLoading(false)
    }
  }, [tenantId])

  // ─── Fetch Backups ───
  const fetchBackups = useCallback(async () => {
    setBackupsLoading(true)
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/backups`)
      if (res.ok) {
        const data = await res.json()
        setBackups(data.backups || [])
        setCronActive(data.cronActive || false)
      }
    } catch {} finally {
      setBackupsLoading(false)
    }
  }, [tenantId])

  // Load health on overview tab + auto-refresh every 60s
  useEffect(() => {
    if (activeTab !== "overview") return
    fetchHealth()
    const interval = setInterval(fetchHealth, 60_000)
    return () => clearInterval(interval)
  }, [activeTab, fetchHealth])

  // Load backups on backups tab
  useEffect(() => {
    if (activeTab === "backups") fetchBackups()
  }, [activeTab, fetchBackups])

  // ─── Trigger Manual Backup ───
  const handleBackup = async () => {
    setBackupRunning(true)
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/backups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      })
      if (res.ok) {
        await fetchBackups()
        await fetchHealth()
      }
    } catch {} finally {
      setBackupRunning(false)
    }
  }

  // ─── Trigger Restore ───
  const handleRestore = async (filename: string) => {
    setRestoreRunning(filename)
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/backups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", filename, tenantSlug: tenant?.slug }),
      })
      if (res.ok) {
        await fetchTenant()
        await fetchHealth()
      }
    } catch {} finally {
      setRestoreRunning(null)
      setConfirmRestore(null)
    }
  }

  // ─── Delete Backup ───
  const handleDeleteBackup = async (filename: string) => {
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/backups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", filename }),
      })
      if (res.ok) await fetchBackups()
    } catch {}
  }

  // ─── Save Plan/Status Changes ───
  const handleSave = async (field: string, value: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error("Update failed")
      await fetchTenant()
      if (field === "plan") setEditPlan(null)
      if (field === "status") setEditStatus(null)
    } catch (err: any) {
      console.error("Save failed:", err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Toggle Module ───
  const handleToggleModule = async (moduleId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/modules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [{ moduleId, enabled }] }),
      })
      if (!res.ok) throw new Error("Module toggle failed")

      setModules((prev) =>
        prev.map((m) => (m.moduleId === moduleId ? { ...m, enabled } : m))
      )
    } catch (err: any) {
      console.error("Module toggle error:", err.message)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-amber-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Se încarcă detaliile tenant-ului...</p>
        </div>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
          <AlertTriangle size={32} className="text-destructive mx-auto mb-3" />
          <p className="text-sm font-medium text-destructive">{error || "Tenant-ul nu a fost găsit"}</p>
          <button
            onClick={() => router.push("/intraconstruct/tenants")}
            className="mt-3 px-4 py-2 text-xs font-medium bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            Înapoi la Tenanți
          </button>
        </div>
      </div>
    )
  }

  const plan = planConfig[tenant.plan] || planConfig.starter
  const status = statusConfig[tenant.status] || statusConfig.active

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <Link
          href="/intraconstruct/tenants"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Înapoi la Tenanți
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{
                background: tenant.color
                  ? `${tenant.color}20`
                  : "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.2))",
                color: tenant.color || "#f59e0b",
              }}
            >
              {tenant.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{tenant.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe size={12} />
                  {tenant.slug}.intraconstruct.ro
                </div>
                {tenant.domain && (
                  <div className="flex items-center gap-1 text-xs text-amber-500">
                    <ExternalLink size={12} />
                    {tenant.domain}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan + Status Inline Edit */}
          <div className="flex items-center gap-2">
            {/* Plan Selector */}
            {editPlan !== null ? (
              <div className="flex items-center gap-1">
                {Object.entries(planConfig).map(([p, cfg]) => (
                  <button
                    key={p}
                    onClick={() => handleSave("plan", p)}
                    disabled={saving}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all",
                      p === tenant.plan
                        ? cn(cfg.bg, cfg.border, cfg.color)
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
                <button onClick={() => setEditPlan(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditPlan(tenant.plan)}
                className={cn("px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all hover:opacity-80", plan.bg, plan.border, plan.color)}
              >
                {plan.label}
              </button>
            )}

            {/* Status Toggle */}
            {editStatus !== null ? (
              <div className="flex items-center gap-1">
                {Object.entries(statusConfig).map(([s, cfg]) => (
                  <button
                    key={s}
                    onClick={() => handleSave("status", s)}
                    disabled={saving}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all",
                      s === tenant.status
                        ? `${cfg.bg}/10 border-current ${cfg.color}`
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
                <button onClick={() => setEditStatus(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditStatus(tenant.status)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-xs hover:border-border transition-all"
              >
                <div className={cn("w-2 h-2 rounded-full", status.bg)} />
                <span className={cn("font-medium", status.color)}>{status.label}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px",
              activeTab === tab.id
                ? "border-amber-500 text-amber-500"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Utilizatori", value: tenant.stats.users, icon: <Users size={16} />, color: "text-primary" },
              { label: "Clienți", value: tenant.stats.clients, icon: <Building2 size={16} />, color: "text-info" },
              { label: "Proiecte", value: tenant.stats.projects, icon: <FolderKanban size={16} />, color: "text-accent" },
              { label: "Facturi", value: tenant.stats.invoices, icon: <Receipt size={16} />, color: "text-warning" },
              { label: "Furnizori", value: tenant.stats.suppliers, icon: <Truck size={16} />, color: "text-success" },
              { label: "Materiale", value: tenant.stats.materials, icon: <Boxes size={16} />, color: "text-violet-400" },
              { label: "Oferte", value: tenant.stats.offers, icon: <Receipt size={16} />, color: "text-amber-400" },
              { label: "Contracte", value: tenant.stats.contracts, icon: <Shield size={16} />, color: "text-blue-400" },
              { label: "Angajați", value: tenant.stats.employees, icon: <UserCog size={16} />, color: "text-pink-400" },
              { label: "Module Active", value: modules.filter((m) => m.enabled).length, icon: <Package size={16} />, color: "text-teal-400" },
            ].map((s) => (
              <div key={s.label} className="bg-surface rounded-xl border border-border/50 p-3">
                <div className={cn("mb-1.5", s.color)}>{s.icon}</div>
                <p className="text-xl font-bold text-foreground tabular-nums">{s.value ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield size={16} className="text-amber-500" />
                Detalii Tenant
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono text-foreground">{tenant.id.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-medium text-foreground">{tenant.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Domeniu custom</span>
                  <span className="text-foreground">{tenant.domain || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creat</span>
                  <span className="text-foreground">{formatDate(tenant.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ultima actualizare</span>
                  <span className="text-foreground">{formatDate(tenant.updatedAt)}</span>
                </div>
                {tenant.trialEndsAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trial expiră</span>
                    <span className="text-warning font-medium">{formatDateShort(tenant.trialEndsAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Business Lines */}
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <HardHat size={16} className="text-amber-500" />
                Informații Suplimentare
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business Lines</span>
                  <span className="text-foreground font-medium">
                    {tenant.businessLines.length > 0
                      ? tenant.businessLines.map((bl) => bl.name).join(", ")
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Culoare Brand</span>
                  <div className="flex items-center gap-2">
                    {tenant.color && (
                      <div className="w-4 h-4 rounded-md border border-border" style={{ backgroundColor: tenant.color }} />
                    )}
                    <span className="text-foreground">{tenant.color || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Health Monitor Widget */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                Monitorizare Sistem
              </h3>
              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
              >
                <RefreshCw size={10} className={healthLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {health ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* DB Status */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {health.database?.status === "healthy" ? (
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    ) : (
                      <XCircle size={12} className="text-destructive" />
                    )}
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Database</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {health.database?.status === "healthy" ? "Online" : "Error"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {health.database?.latencyMs}ms · {health.database?.size}
                  </p>
                </div>

                {/* PM2 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {health.pm2?.status === "online" ? (
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    ) : health.pm2?.status === "stopped" ? (
                      <AlertCircle size={12} className="text-amber-500" />
                    ) : (
                      <XCircle size={12} className="text-destructive" />
                    )}
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Frontend</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {health.pm2?.status || "N/A"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {health.pm2?.restarts || 0} restarts
                  </p>
                </div>

                {/* Disk */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <HardDrive size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Disk</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{health.disk || "N/A"}</p>
                </div>

                {/* Last Backup */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {health.backup?.last ? (
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={12} className="text-amber-500" />
                    )}
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Backup</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {health.backup?.last?.sizeHuman || "Niciun backup"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {health.backup?.last
                      ? formatDateShort(health.backup.last.date)
                      : "—"}
                    {health.backup?.cronActive && " · Cron activ"}
                  </p>
                </div>

                {/* Last Activity */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Timer size={12} className="text-violet-400" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Activitate</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {health.lastActivity ? formatDateShort(health.lastActivity) : "—"}
                  </p>
                </div>

                {/* Tables Summary */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Database size={12} className="text-amber-400" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Date</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {health.tables
                      ? Object.values(health.tables as Record<string, number>).reduce((a, b) => a + b, 0)
                      : 0} rânduri
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {health.tables ? Object.keys(health.tables).length : 0} tabele
                  </p>
                </div>
              </div>
            ) : healthLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="text-muted-foreground animate-spin" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Nu s-au putut încărca datele de sănătate.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "modules" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Activează sau dezactivează module ERP pentru acest tenant. Modificările se aplică instant.
          </p>

          {/* Group by category */}
          {["core", "construction", "ai", "operations", "marketing", "reporting"].map((cat) => {
            const catModules = modules.filter((m) => m.category === cat)
            if (catModules.length === 0) return null

            return (
              <div key={cat}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {cat === "core" ? "Core" : cat === "construction" ? "Construcții" : cat === "ai" ? "AI & Automatizare" : cat === "operations" ? "Operațiuni" : cat === "marketing" ? "Marketing" : "Raportare"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {catModules.map((mod) => (
                    <div
                      key={mod.moduleId}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                        mod.enabled
                          ? "bg-surface border-amber-500/20"
                          : "bg-muted/20 border-border/50 opacity-60"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{mod.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{mod.description}</p>
                      </div>
                      <button
                        onClick={() => handleToggleModule(mod.moduleId, !mod.enabled)}
                        className="flex-shrink-0 transition-colors"
                      >
                        {mod.enabled ? (
                          <ToggleRight size={28} className="text-amber-500" />
                        ) : (
                          <ToggleLeft size={28} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {tenant.users.length} utilizatori înregistrați în acest tenant.
          </p>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_1.5fr] gap-3 px-5 py-3 bg-muted/30 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Nume</span>
              <span>Email</span>
              <span>Rol</span>
              <span>Ultimul Login</span>
            </div>

            {tenant.users.length === 0 ? (
              <div className="p-8 text-center">
                <Users size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Niciun utilizator în acest tenant.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {tenant.users.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_1.5fr] gap-3 px-5 py-3.5 items-center hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                        {(user.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail size={12} />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">{user.role.replace("_", " ")}</span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>{user.lastLogin ? formatDate(user.lastLogin) : "Niciodată"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "backups" && (
        <div className="space-y-4">
          {/* Header + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {backups.length} backup{backups.length !== 1 ? "-uri" : ""} disponibil{backups.length !== 1 ? "e" : ""}.
                {cronActive && (
                  <span className="inline-flex items-center gap-1 ml-2 text-emerald-500">
                    <CheckCircle2 size={10} />
                    Cron activ (zilnic la 03:00)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchBackups}
                disabled={backupsLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium text-muted-foreground bg-muted/50 border border-border/50 rounded-lg hover:bg-muted transition-colors"
              >
                <RefreshCw size={10} className={backupsLoading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                onClick={handleBackup}
                disabled={backupRunning}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {backupRunning ? (
                  <><Loader2 size={10} className="animate-spin" /> Se creează...</>
                ) : (
                  <><Archive size={10} /> Backup Acum</>
                )}
              </button>
            </div>
          </div>

          {/* Backup List */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_2fr] gap-3 px-5 py-3 bg-muted/30 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Data</span>
              <span>Dimensiune</span>
              <span>Status</span>
              <span className="text-right">Acțiuni</span>
            </div>

            {backupsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-amber-500 animate-spin" />
              </div>
            ) : backups.length === 0 ? (
              <div className="p-8 text-center">
                <Archive size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Niciun backup disponibil.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Apasă "Backup Acum" pentru a crea primul.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {backups.map((bk, idx) => (
                  <div
                    key={bk.filename}
                    className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_2fr] gap-3 px-5 py-3.5 items-center hover:bg-muted/10 transition-colors"
                  >
                    {/* Date */}
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        idx === 0 ? "bg-emerald-500/10" : "bg-muted/50"
                      )}>
                        <Archive size={14} className={idx === 0 ? "text-emerald-500" : "text-muted-foreground"} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{formatDate(bk.date)}</p>
                        <p className="text-[9px] text-muted-foreground font-mono truncate">{bk.filename}</p>
                      </div>
                    </div>

                    {/* Size */}
                    <span className="text-xs text-foreground font-medium">{bk.sizeHuman}</span>

                    {/* Status */}
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      idx === 0 ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {idx === 0 ? "Cel mai recent" : "Arhivat"}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5">
                      {confirmRestore === bk.filename ? (
                        <div className="flex items-center gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-1.5">
                          <span className="text-[9px] text-destructive font-medium">Confirmi restaurarea?</span>
                          <button
                            onClick={() => handleRestore(bk.filename)}
                            disabled={!!restoreRunning}
                            className="px-2 py-0.5 text-[9px] font-bold bg-destructive text-white rounded hover:bg-destructive/90 transition-colors disabled:opacity-50"
                          >
                            {restoreRunning === bk.filename ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              "Da, restaurează"
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmRestore(null)}
                            className="px-2 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Anulează
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setConfirmRestore(bk.filename)}
                            className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
                          >
                            <RotateCcw size={10} />
                            Restaurează
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(bk.filename)}
                            className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-muted-foreground hover:text-destructive bg-muted/50 rounded-lg hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "migrate" && (
        <MigrateTab
          tenantId={tenantId}
          tenant={tenant}
          migrateData={migrateData}
          setMigrateData={setMigrateData}
          migrateLoading={migrateLoading}
          setMigrateLoading={setMigrateLoading}
          sshTesting={sshTesting}
          setSshTesting={setSshTesting}
          sshResult={sshResult}
          setSshResult={setSshResult}
          preflightChecks={preflightChecks}
          setPreflightChecks={setPreflightChecks}
          preflightRunning={preflightRunning}
          setPreflightRunning={setPreflightRunning}
          migrationRunning={migrationRunning}
          setMigrationRunning={setMigrationRunning}
          serverConfig={serverConfig}
          setServerConfig={setServerConfig}
        />
      )}
    </div>
  )
}

/* ============================================================
   Migrate Tab Component
   ============================================================ */

function MigrateTab({
  tenantId,
  tenant,
  migrateData,
  setMigrateData,
  migrateLoading,
  setMigrateLoading,
  sshTesting,
  setSshTesting,
  sshResult,
  setSshResult,
  preflightChecks,
  setPreflightChecks,
  preflightRunning,
  setPreflightRunning,
  migrationRunning,
  setMigrationRunning,
  serverConfig,
  setServerConfig,
  fetchMigrateStatus: refreshInstance // added prop or we just re-fetch in place
}: any) {
  // Allocate Package state
  const [showAllocateModal, setShowAllocateModal] = useState(false)
  const [creditPackages, setCreditPackages] = useState<any[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState<string>("")
  const [allocating, setAllocating] = useState(false)

  const fetchCreditPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/credit-packages")
      if (res.ok) setCreditPackages(await res.json())
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    if (showAllocateModal) fetchCreditPackages()
  }, [showAllocateModal, fetchCreditPackages])

  const handleAllocatePackage = async () => {
    if (!selectedPackageId) return
    setAllocating(true)
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackageId })
      })
      if (res.ok) {
        if (refreshInstance) await refreshInstance()
        setShowAllocateModal(false)
      } else {
        alert("A apărut o eroare la alocarea pachetului.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAllocating(false)
    }
  }
  // Fetch migration status
  const fetchMigrateStatus = useCallback(async () => {
    setMigrateLoading(true)
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/migrate`)
      if (res.ok) setMigrateData(await res.json())
    } catch {} finally {
      setMigrateLoading(false)
    }
  }, [tenantId, setMigrateData, setMigrateLoading])

  useEffect(() => {
    fetchMigrateStatus()
  }, [fetchMigrateStatus])

  // Pre-populate server config from saved instance
  useEffect(() => {
    if (migrateData?.instance) {
      const inst = migrateData.instance
      setServerConfig((prev: any) => ({
        ...prev,
        serverHost: inst.serverHost || prev.serverHost,
        sshUser: inst.sshUser || prev.sshUser,
        sshPort: inst.serverPort || prev.sshPort,
        domain: inst.apiEndpoint?.replace("https://", "") || prev.domain,
      }))
    }
  }, [migrateData?.instance, setServerConfig])

  // Poll migration progress when running
  useEffect(() => {
    if (!migrationRunning) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/migrate`)
      if (res.ok) {
        const data = await res.json()
        setMigrateData(data)
        if (data.migration?.status === "completed" || data.migration?.status === "failed") {
          setMigrationRunning(false)
        }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [migrationRunning, tenantId, setMigrateData, setMigrationRunning])

  // Save server config
  const handleSaveConfig = async () => {
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "configure",
          ...serverConfig,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSshResult({ success: true, info: `Configurat! License Key: ${data.licenseKey?.slice(0, 12)}...` })
        await fetchMigrateStatus()
      }
    } catch (err: any) {
      setSshResult({ success: false, error: err.message })
    }
  }

  // Test SSH
  const handleTestSSH = async () => {
    setSshTesting(true)
    setSshResult(null)
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-ssh" }),
      })
      if (res.ok) setSshResult(await res.json())
    } catch (err: any) {
      setSshResult({ success: false, error: err.message })
    } finally {
      setSshTesting(false)
    }
  }

  // Run pre-flight
  const handlePreflight = async () => {
    setPreflightRunning(true)
    setPreflightChecks(null)
    try {
      const res = await fetch(`/api/intraconstruct/tenants/${tenantId}/migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preflight" }),
      })
      if (res.ok) {
        const data = await res.json()
        setPreflightChecks(data.checks || [])
      }
    } catch {} finally {
      setPreflightRunning(false)
    }
  }

  // Start migration
  const handleStartMigration = async () => {
    if (!confirm("Ești sigur că vrei să pornești migrarea? Procesul poate dura câteva minute.")) return
    setMigrationRunning(true)
    try {
      await fetch(`/api/intraconstruct/tenants/${tenantId}/migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start-migration",
          domain: serverConfig.domain || migrateData?.instance?.apiEndpoint?.replace("https://", ""),
        }),
      })
    } catch {
      setMigrationRunning(false)
    }
  }

  const instance = migrateData?.instance
  const migration = migrateData?.migration
  const isConfigured = !!instance?.serverHost
  const isSingleTenant = instance?.deploymentType === "single-tenant"

  // ─── Already migrated: show management UI ───
  if (isSingleTenant && instance?.status === "active") {
    return (
      <div className="space-y-4">
        {/* Status Banner */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Server size={20} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-500">Single-Tenant — Activ</h3>
              <p className="text-[10px] text-muted-foreground">
                {instance.apiEndpoint} · v{instance.version || "?"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {instance.lastHeartbeat ? (
                <>
                  <Wifi size={12} className="text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-medium">Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-medium">Niciun heartbeat</span>
                </>
              )}
            </div>
          </div>

          {/* Credits Overview */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity size={14} className="text-amber-500" />
              Balanță Curentă
            </h3>
            <button
              onClick={() => setShowAllocateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Zap size={12} />
              Alocă Pachet
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "AI Credite", value: instance.creditsAi, icon: <Zap size={14} />, color: "text-violet-400" },
              { label: "SMS", value: instance.creditsSms, icon: <Mail size={14} />, color: "text-blue-400" },
              { label: "Voice (min)", value: instance.creditsVoice, icon: <Activity size={14} />, color: "text-amber-400" },
              { label: "Telefonie (min)", value: instance.creditsCalls, icon: <Globe size={14} />, color: "text-emerald-400" },
            ].map((c) => (
              <div key={c.label} className="bg-background/50 rounded-lg p-3">
                <div className={cn("mb-1", c.color)}>{c.icon}</div>
                <p className="text-lg font-bold text-foreground tabular-nums">{c.value?.toLocaleString() ?? 0}</p>
                <p className="text-[9px] text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Remote Actions */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Terminal size={16} className="text-amber-500" />
            Control Remote
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "License Key", value: instance.licenseKey?.slice(0, 16) + "...", icon: <Key size={12} /> },
              { label: "Plan", value: instance.plan?.toUpperCase(), icon: <CreditCard size={12} /> },
              { label: "Update Window", value: instance.updateWindow || "Not set", icon: <Calendar size={12} /> },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                  <p className="text-[11px] font-medium text-foreground truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Migration Setup UI ───
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Migrează acest tenant pe un server dedicat (Single-Tenant). Configurează serverul, verifică cerințele, și pornește migrarea.
      </p>

      {/* Step 1: Server Configuration */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Server size={16} className="text-amber-500" />
          1. Configurare Server
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground block mb-1">IP / Hostname</label>
            <input
              type="text"
              value={serverConfig.serverHost}
              onChange={(e) => setServerConfig({ ...serverConfig, serverHost: e.target.value })}
              placeholder="185.x.x.x"
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground block mb-1">Domeniu target</label>
            <input
              type="text"
              value={serverConfig.domain}
              onChange={(e) => setServerConfig({ ...serverConfig, domain: e.target.value })}
              placeholder="erp.aeroduct.ro"
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground block mb-1">SSH User</label>
            <input
              type="text"
              value={serverConfig.sshUser}
              onChange={(e) => setServerConfig({ ...serverConfig, sshUser: e.target.value })}
              placeholder="deploy"
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground block mb-1">SSH Port</label>
            <input
              type="number"
              value={serverConfig.sshPort}
              onChange={(e) => setServerConfig({ ...serverConfig, sshPort: parseInt(e.target.value) || 22 })}
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-muted-foreground block mb-1">
              SSH Private Key (PEM)
              {instance?.hasSSHKey && !serverConfig.sshPrivateKey && (
                <span className="ml-2 text-emerald-400">✓ Cheie configurată</span>
              )}
            </label>
            <textarea
              value={serverConfig.sshPrivateKey}
              onChange={(e) => setServerConfig({ ...serverConfig, sshPrivateKey: e.target.value })}
              placeholder={instance?.hasSSHKey ? "Cheie SSH deja salvată — lasă gol pentru a o păstra" : "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
              rows={4}
              className="w-full px-3 py-2 text-xs font-mono bg-background border border-border rounded-lg focus:border-amber-500 focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleSaveConfig}
            disabled={!serverConfig.serverHost}
            className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            <Save size={12} />
            Salvează Configurația
          </button>
          {isConfigured && (
            <button
              onClick={handleTestSSH}
              disabled={sshTesting}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-medium text-muted-foreground bg-muted/50 border border-border/50 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              {sshTesting ? <Loader2 size={12} className="animate-spin" /> : <Terminal size={12} />}
              Test SSH
            </button>
          )}
        </div>

        {/* SSH Result */}
        {sshResult && (
          <div className={cn(
            "mt-3 px-4 py-3 rounded-lg text-xs",
            sshResult.success
              ? "bg-emerald-500/5 border border-emerald-500/20 text-emerald-400"
              : "bg-destructive/5 border border-destructive/20 text-destructive"
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              {sshResult.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              <span className="font-medium">{sshResult.success ? "Conexiune reușită" : "Conexiune eșuată"}</span>
            </div>
            <p className="text-[10px] font-mono whitespace-pre-wrap">
              {sshResult.info || sshResult.error}
            </p>
          </div>
        )}
      </div>

      {/* Step 2: Pre-flight Checks */}
      {isConfigured && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield size={16} className="text-amber-500" />
              2. Verificări Pre-migrare
            </h3>
            <button
              onClick={handlePreflight}
              disabled={preflightRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground bg-muted/50 border border-border/50 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              {preflightRunning ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
              Rulează Verificări
            </button>
          </div>

          {preflightChecks && (
            <div className="space-y-2">
              {preflightChecks.map((check: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-muted/20 rounded-lg">
                  {check.status === "pass" ? (
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  ) : check.status === "warn" ? (
                    <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-destructive flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground">{check.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{check.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Start Migration */}
      {isConfigured && preflightChecks?.every((c: any) => c.status !== "fail") && preflightChecks !== null && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Rocket size={16} className="text-amber-500" />
            3. Pornește Migrarea
          </h3>

          {migration?.status === "running" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="text-amber-500 animate-spin" />
                <span className="text-xs font-medium text-foreground">
                  Pas {migration.currentStep}/{migration.totalSteps}: {migration.stepName}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${(migration.currentStep / migration.totalSteps) * 100}%` }}
                />
              </div>
              {/* Log */}
              <div className="max-h-32 overflow-y-auto bg-muted/10 rounded-lg p-3">
                {(migration.logs || []).map((log: string, i: number) => (
                  <p key={i} className="text-[9px] font-mono text-muted-foreground">{log}</p>
                ))}
              </div>
            </div>
          ) : migration?.status === "completed" ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 text-center">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-500">Migrare completă!</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Instanța este activă. Reîncarcă pagina pentru a vedea panoul de management.
              </p>
            </div>
          ) : migration?.status === "failed" ? (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <XCircle size={24} className="text-destructive mx-auto mb-2" />
              <p className="text-sm font-bold text-destructive text-center">Migrare eșuată</p>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                {migration.error}
              </p>
              <button
                onClick={handleStartMigration}
                className="mx-auto mt-3 flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <RotateCcw size={12} />
                Încearcă Din Nou
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-4">
                Toate verificările au trecut. Poți porni migrarea.
              </p>
              <button
                onClick={handleStartMigration}
                disabled={migrationRunning}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {migrationRunning ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                Pornește Migrarea
              </button>
            </div>
          )}
        </div>
      )}

      {/* Allocate Package Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Alocă Pachet de Credite</h3>
              <button onClick={() => setShowAllocateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Selectează Pachetul</label>
                <select
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                >
                  <option value="">-- Alege --</option>
                  {creditPackages.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.priceEur} EUR)</option>
                  ))}
                </select>
              </div>

              {selectedPackageId && (
                <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs space-y-2">
                  {(() => {
                    const p = creditPackages.find(x => x.id === selectedPackageId)
                    return p ? (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">AI Tokens:</span><span className="font-medium text-violet-400">+{p.tokensAi.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">SMS:</span><span className="font-medium text-blue-400">+{p.sms.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Voice Min:</span><span className="font-medium text-amber-400">+{p.voiceMin.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Telefonie Min:</span><span className="font-medium text-emerald-400">+{p.callsMin.toLocaleString()}</span></div>
                      </>
                    ) : null
                  })()}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
              <button onClick={() => setShowAllocateModal(false)} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                Anulează
              </button>
              <button
                onClick={handleAllocatePackage}
                disabled={!selectedPackageId || allocating}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {allocating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirmă Alocarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
