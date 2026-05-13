"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  Users,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Plus,
  Receipt,
  UserPlus,
  FileSignature,
  AlertTriangle,
  Clock,
  Zap,
  BarChart3,
  UtensilsCrossed,
  Globe,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { NewLeadModal, NewClientModal, NewProjectModal } from "@/components/entity-forms"
import { useBusinessLine } from "@/components/business-line-context"
import { BusinessLineBadge } from "@/components/business-line-switcher"

/* ============================================================
   Types
   ============================================================ */

interface DashboardData {
  stats: {
    activeClients: number
    totalClients: number
    monthlyRevenue: number
    mrr: number
    openLeads: number
    activeProjects: number
    pipelineValue: number
    conversionRate: number
    clientsTrend: number
    revenueTrend: number
    leadsTrend: number
  }
  pipeline: Record<string, { count: number; value: number }>
  recentActivities: {
    id: string
    type: string
    title: string
    description: string
    timestamp: string
    businessLine: string
  }[]
  overdueInvoices: {
    id: string
    number: string
    amount: number
    currency: string
    dueDate: string
    clientName: string
    businessLine: string
  }[]
  topClients: {
    id: string
    companyName: string
    businessLine: string
    monthlyRevenue: number
    services: string[]
    invoiceCount: number
    projectCount: number
  }[]
  revenueHistory: {
    month: string
    revenue: number
    agency: number
    fudly: number
  }[]
}

/* ============================================================
   Helpers
   ============================================================ */

const activityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  lead_nou: { icon: <UserPlus size={14} />, color: "text-info bg-info/10" },
  client_nou: { icon: <Users size={14} />, color: "text-success bg-success/10" },
  proiect_start: { icon: <FolderKanban size={14} />, color: "text-primary bg-primary/10" },
  factura_emisa: { icon: <Receipt size={14} />, color: "text-warning bg-warning/10" },
  factura_platita: { icon: <DollarSign size={14} />, color: "text-success bg-success/10" },
  contract_semnat: { icon: <FileSignature size={14} />, color: "text-accent bg-accent/10" },
  lead_pierdut: { icon: <AlertTriangle size={14} />, color: "text-destructive bg-destructive/10" },
  restaurant_onboarded: { icon: <UtensilsCrossed size={14} />, color: "text-orange-500 bg-orange-500/10" },
  churn_alert: { icon: <AlertTriangle size={14} />, color: "text-destructive bg-destructive/10" },
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "recent"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/* ============================================================
   Stat Card
   ============================================================ */

function StatCard({
  label,
  value,
  trend,
  icon,
  color,
  href,
}: {
  label: string
  value: string
  trend: number
  icon: React.ReactNode
  color: string
  href: string
}) {
  const isPositive = trend >= 0
  return (
    <Link href={href} className="bg-surface rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>{icon}</div>
        <div className={cn("flex items-center gap-0.5 text-xs font-semibold", isPositive ? "text-success" : "text-destructive")}>
          {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {isPositive && "+"}{trend}%
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Link>
  )
}

/* ============================================================
   Revenue Chart — stacked per business line (LIVE)
   ============================================================ */

function RevenueChart({ lineId, data }: { lineId: string | "all"; data: DashboardData["revenueHistory"] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-5 flex items-center justify-center h-52">
        <p className="text-sm text-muted-foreground">Nu sunt date de venituri disponibile.</p>
      </div>
    )
  }

  const max = Math.max(...data.map((r) => r.revenue), 1)

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Venituri — Ultimele 6 Luni</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatCurrency(data[data.length - 1]?.revenue ?? 0)} luna curentă
          </p>
        </div>
        <BarChart3 size={18} className="text-muted-foreground" />
      </div>
      <div className="flex items-end gap-3 h-36">
        {data.map((entry, i) => {
          const isLast = i === data.length - 1
          const agencyH = Math.round((entry.agency / max) * 100)
          const fudlyH = Math.round((entry.fudly / max) * 100)

          if (lineId === "all") {
            return (
              <div key={entry.month} className="flex-1 flex flex-col items-center gap-1.5">
                <span className={cn("text-[10px] font-semibold tabular-nums", isLast ? "text-primary" : "text-muted-foreground")}>
                  {formatCurrency(entry.revenue, true)}
                </span>
                <div className="w-full flex flex-col">
                  <div
                    className={cn("w-full rounded-t-md transition-all duration-500", isLast ? "bg-orange-500" : "bg-orange-500/40")}
                    style={{ height: `${fudlyH}px` }}
                  />
                  <div
                    className={cn("w-full transition-all duration-500", isLast ? "bg-primary" : "bg-muted hover:bg-primary/30")}
                    style={{ height: `${agencyH}px` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{entry.month.replace(/\s+\d{4}/, "")}</span>
              </div>
            )
          }

          const val = lineId === "agency" ? entry.agency : entry.fudly
          const barH = lineId === "agency" ? agencyH : fudlyH
          const barColor = lineId === "agency" ? "bg-primary" : "bg-orange-500"

          return (
            <div key={entry.month} className="flex-1 flex flex-col items-center gap-1.5">
              <span className={cn("text-[10px] font-semibold tabular-nums", isLast ? "text-primary" : "text-muted-foreground")}>
                {formatCurrency(val, true)}
              </span>
              <div className="w-full relative">
                <div
                  className={cn("w-full rounded-t-md transition-all duration-500", isLast ? barColor : `${barColor}/40`)}
                  style={{ height: `${barH}px` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{entry.month.replace(/\s+\d{4}/, "")}</span>
            </div>
          )
        })}
      </div>
      {/* Legend for stacked */}
      {lineId === "all" && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="text-[10px] text-muted-foreground">🏢 Agenție</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-orange-500" />
            <span className="text-[10px] text-muted-foreground">🍕 Fudly</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Uptime Monitor Widget
   ============================================================ */

interface UptimeDomain {
  domain: string
  clientId: string | null
  clientName: string
  isUp: boolean
  statusCode: number
  responseMs: number
  error: string | null
  lastCheck: string
  uptimePercent24h: number | null
  avgResponseMs: number
  activeIncident: { since: string; cause: string } | null
}

function UptimeWidget() {
  const [data, setData] = useState<{ domains: UptimeDomain[]; allUp: boolean; monitoredCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/uptime/status')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('[Uptime Widget] Fetch failed:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchStatus(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formatMs = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-muted-foreground animate-pulse" />
          <span className="text-sm text-muted-foreground">Se încarcă monitorizarea...</span>
        </div>
      </div>
    )
  }

  if (!data || data.domains.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Nicio verificare uptime disponibilă. Rulați primul check.</span>
        </div>
      </div>
    )
  }

  const downCount = data.domains.filter(d => !d.isUp).length

  return (
    <div className={cn(
      "rounded-xl border p-5 transition-colors",
      downCount > 0
        ? "bg-destructive/5 border-destructive/30"
        : "bg-surface border-border"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            downCount > 0 ? "bg-destructive/10" : "bg-success/10"
          )}>
            {downCount > 0 ? <WifiOff size={16} className="text-destructive" /> : <Wifi size={16} className="text-success" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Monitorizare Site-uri
              {downCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-destructive/10 text-destructive">
                  {downCount} DOWN
                </span>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {data.monitoredCount} domenii monitorizate • {data.domains.filter(d => d.isUp).length} online
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Reîmprospătează"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {data.domains
          .sort((a, b) => (a.isUp === b.isUp ? 0 : a.isUp ? 1 : -1)) // down first
          .map((d) => (
            <div
              key={d.domain}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
                d.isUp
                  ? "bg-muted/30 border-border/50 hover:border-success/30"
                  : "bg-destructive/5 border-destructive/20 animate-pulse"
              )}
            >
              {/* Status dot */}
              <div className={cn(
                "w-2.5 h-2.5 rounded-full flex-shrink-0",
                d.isUp ? "bg-success shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.4)]"
              )} />
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{d.domain}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{d.clientName}</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="text-right flex-shrink-0">
                <p className={cn("text-xs font-semibold tabular-nums", d.isUp ? "text-foreground" : "text-destructive")}>
                  {d.isUp ? formatMs(d.responseMs) : 'DOWN'}
                </p>
                {d.uptimePercent24h !== null && (
                  <p className={cn(
                    "text-[10px] tabular-nums",
                    d.uptimePercent24h >= 99 ? "text-success" :
                    d.uptimePercent24h >= 95 ? "text-warning" : "text-destructive"
                  )}>
                    {d.uptimePercent24h}%
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

/* ============================================================
   Loading Skeleton
   ============================================================ */

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Se încarcă dashboard-ul...</p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Main
   ============================================================ */

export default function DashboardOverview() {
  const [showNewLead, setShowNewLead] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const { activeLineId, isAll, activeLine } = useBusinessLine()

  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/crm?businessLine=${activeLineId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setDashData(json.data)
    } catch (err: any) {
      console.error('[Dashboard] Fetch failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeLineId])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const lineLabel = activeLine?.entityTypes[0]?.namePlural || "Clienți"

  if (loading || !dashData) return <DashboardSkeleton />

  const { stats, recentActivities, overdueInvoices, topClients, revenueHistory } = dashData

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Modals */}
      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <NewClientModal open={showNewClient} onClose={() => setShowNewClient(false)} />
      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} />

      {/* Welcome + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Dashboard
            {activeLine && (
              <span className={cn("ml-2 text-base font-normal", activeLine.textClass)}>
                {activeLine.icon} {activeLine.name}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAll ? "Vizualizare consolidată — toate liniile de business" : `Focus pe ${activeLine?.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewLead(true)} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors"><Plus size={14} /> Lead Nou</button>
          <button onClick={() => setShowNewClient(true)} className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-colors"><Plus size={14} /> Client Nou</button>
          <button onClick={() => setShowNewProject(true)} className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-colors"><Plus size={14} /> Proiect</button>
        </div>
      </div>

      {/* Stat Cards — LIVE DATA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={`${lineLabel} Activi`}
          value={String(stats.activeClients)}
          trend={stats.clientsTrend}
          icon={activeLineId === "fudly" ? <UtensilsCrossed size={20} /> : <Users size={20} />}
          color={activeLineId === "fudly" ? "bg-orange-500/10 text-orange-500" : "bg-primary/10 text-primary"}
          href="/crm/clienti"
        />
        <StatCard label="MRR" value={formatCurrency(stats.mrr)} trend={stats.revenueTrend} icon={<DollarSign size={20} />} color="bg-success/10 text-success" href="/finance" />
        <StatCard label="Lead-uri Deschise" value={String(stats.openLeads)} trend={stats.leadsTrend} icon={<Target size={20} />} color="bg-warning/10 text-warning" href="/crm/lead-uri" />
        <StatCard label="Proiecte Active" value={String(stats.activeProjects)} trend={12} icon={<FolderKanban size={20} />} color="bg-accent/10 text-accent" href="/projects" />
      </div>

      {/* Revenue Chart + Activity Timeline — LIVE DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RevenueChart lineId={activeLineId} data={revenueHistory} />
        </div>

        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Activitate Recentă</h3>
            <Clock size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nicio activitate recentă.</p>
            ) : (
              recentActivities.slice(0, 6).map((act) => {
                const config = activityIcons[act.type]
                return (
                  <div key={act.id} className="flex items-start gap-3 group">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", config?.color || "text-muted-foreground bg-muted")}>
                      {config?.icon || <Clock size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-foreground truncate">{act.title}</p>
                        {isAll && <BusinessLineBadge lineId={act.businessLine} />}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{act.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0" suppressHydrationWarning>{timeAgo(act.timestamp)}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Uptime Monitor */}
      <UptimeWidget />

      {/* Overdue Warning + Top Clients — LIVE DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {overdueInvoices.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">Facturi Restante ({overdueInvoices.length})</h3>
            </div>
            <div className="space-y-2">
              {overdueInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-destructive/10 last:border-0">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">{inv.clientName}</p>
                      <p className="text-[11px] text-muted-foreground">{inv.number} • Scadentă {formatDate(inv.dueDate)}</p>
                    </div>
                    {isAll && <BusinessLineBadge lineId={inv.businessLine} />}
                  </div>
                  <span className="text-sm font-bold text-destructive">{formatCurrency(inv.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Top 5 {lineLabel} (MRR)</h3>
            <Zap size={16} className="text-warning" />
          </div>
          <div className="space-y-2">
            {topClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nu sunt clienți activi cu retainere.</p>
            ) : (
              topClients.map((client, i) => (
                <div key={client.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    {client.companyName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-foreground truncate">{client.companyName}</p>
                      {isAll && <BusinessLineBadge lineId={client.businessLine} />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{client.services.join(", ") || "—"}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(client.monthlyRevenue)}/mo</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
