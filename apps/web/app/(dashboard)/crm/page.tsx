"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Users,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  KanbanSquare,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Target,
  Contact,
  UtensilsCrossed,
  Loader2,
} from "lucide-react"
import { businessLines } from "@repo/mock-data"
import { cn, formatCurrency } from "@/lib/utils"
import { NewLeadModal, NewClientModal } from "@/components/entity-forms"
import { useBusinessLine } from "@/components/business-line-context"
import { BusinessLineBadge } from "@/components/business-line-switcher"

interface DashboardData {
  stats: {
    activeClients: number
    totalClients: number
    monthlyRevenue: number
    openLeads: number
    activeProjects: number
    pipelineValue: number
    conversionRate: number
    clientsTrend: number
    revenueTrend: number
    leadsTrend: number
  }
  pipeline: Record<string, { count: number; value: number }>
  projects: Array<{
    id: string; name: string; status: string; progress: number
    hoursLogged: number; hoursEstimated: number
    businessLine: { slug: string; name: string }
  }>
}

export default function CRMDashboard() {
  const [showNewLead, setShowNewLead] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const { activeLineId, activeLine, isAll, activeEntityTypeId } = useBusinessLine()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const blParam = activeLineId === "all" ? "" : `?businessLine=${activeLineId}`
      const res = await fetch(`/api/dashboard/crm${blParam}`)
      const json = await res.json()
      if (json.data) setData(json.data)
    } catch (err) {
      console.error("[CRM Dashboard] Failed to fetch:", err)
    } finally {
      setLoading(false)
    }
  }, [activeLineId])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Dynamic pipeline stages from business line config (still from mock for UI labels/colors)
  const pipelineStages = useMemo(() => {
    const closedKeys = ["castigat", "pierdut", "churned", "inactiv_fz", "suspendat_inst"]
    if (activeLine) {
      const et = activeLine.entityTypes.find((et) => et.id === activeEntityTypeId) || activeLine.entityTypes[0]
      if (!et) return []
      return et.pipeline.filter((s) => !closedKeys.includes(s.key))
    }
    const agencyLine = businessLines.find((bl) => bl.id === "agency")
    const agencyEt = agencyLine?.entityTypes[0]
    return agencyEt?.pipeline.filter((s) => !closedKeys.includes(s.key)) || []
  }, [activeLine, activeEntityTypeId])

  const stageColors: Record<string, { bar: string; text: string }> = {
    contactat: { bar: "bg-info", text: "text-info" },
    calificat: { bar: "bg-warning", text: "text-warning" },
    oferta_trimisa: { bar: "bg-accent", text: "text-accent" },
    negociere: { bar: "bg-primary", text: "text-primary" },
    trial: { bar: "bg-info", text: "text-info" },
    onboarding: { bar: "bg-warning", text: "text-warning" },
    activ_fudly: { bar: "bg-success", text: "text-success" },
    churn_risk: { bar: "bg-destructive", text: "text-destructive" },
  }

  const lineLabel = activeLine?.entityTypes[0]?.namePlural || "Clienți"

  // Stats from API data
  const stats = data?.stats
  const pipeline = data?.pipeline || {}
  const activeProjects = data?.projects || []

  const statCards = stats ? [
    {
      label: `${lineLabel} Activi`,
      value: stats.activeClients.toString(),
      trend: stats.clientsTrend,
      icon: activeLineId === "fudly" ? <UtensilsCrossed size={20} /> : <Users size={20} />,
      color: activeLineId === "fudly" ? "text-orange-500" : "text-primary",
      bgColor: activeLineId === "fudly" ? "bg-orange-500/10" : "bg-primary/10",
      href: "/crm/clienti",
    },
    {
      label: "Venituri Lunare",
      value: formatCurrency(stats.monthlyRevenue),
      trend: stats.revenueTrend,
      icon: <DollarSign size={20} />,
      color: "text-success",
      bgColor: "bg-success/10",
      href: "/finance",
    },
    {
      label: "Lead-uri Deschise",
      value: stats.openLeads.toString(),
      trend: stats.leadsTrend,
      icon: <KanbanSquare size={20} />,
      color: "text-warning",
      bgColor: "bg-warning/10",
      href: "/crm/lead-uri",
    },
    {
      label: "Proiecte Active",
      value: stats.activeProjects.toString(),
      trend: null,
      icon: <FolderKanban size={20} />,
      color: "text-accent",
      bgColor: "bg-accent/10",
      href: "/projects",
    },
  ] : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={28} className="text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Se încarcă dashboard-ul...</span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Modals */}
      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <NewClientModal open={showNewClient} onClose={() => setShowNewClient(false)} />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Dashboard CRM
            {activeLine && (
              <span className={cn("ml-2 text-base font-normal", activeLine.textClass)}>
                {activeLine.icon} {activeLine.name}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAll ? "Vizualizare consolidată" : `${activeLine?.name} — ${(activeLine?.entityTypes[0]?.namePlural || "entități").toLowerCase()}, lead-uri, pipeline`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewLead(true)} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors"><Plus size={14} /> Lead Nou</button>
          <button onClick={() => setShowNewClient(true)} className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-colors"><Plus size={14} /> Client Nou</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-surface rounded-xl border border-border p-4 hover:border-primary/20 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor, stat.color)}>
                {stat.icon}
              </div>
              {stat.trend !== null && stat.trend !== 0 && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full",
                    stat.trend > 0
                      ? "text-success bg-success/10"
                      : "text-destructive bg-destructive/10"
                  )}
                >
                  {stat.trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(stat.trend)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Pipeline + Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Summary */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Pipeline de Vânzări</h2>
            <Link href="/crm/lead-uri" className="text-[11px] text-primary hover:text-primary-hover font-medium">Vezi tot →</Link>
          </div>
          <div className="space-y-3">
            {pipelineStages.map((stage: any) => {
              const stageData = pipeline[stage.key] || { count: 0, value: 0 }
              const maxValue = stats?.pipelineValue || 1
              const percent = Math.round((stageData.value / maxValue) * 100)
              const colors = stageColors[stage.key] || { bar: "bg-muted", text: "text-muted-foreground" }

              return (
                <div key={stage.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">{stageData.count} leads</span>
                      <span className={cn("text-xs font-semibold", colors.text)}>
                        {formatCurrency(stageData.value)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Pipeline</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(stats?.pipelineValue || 0)}</span>
            </div>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Proiecte Active</h2>
            <Link href="/projects" className="text-[11px] text-primary hover:text-primary-hover font-medium">Vezi tot →</Link>
          </div>
          <div className="space-y-3">
            {activeProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Niciun proiect activ.</p>
            ) : (
              activeProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      project.progress >= 70 ? "bg-success" : project.progress >= 40 ? "bg-warning" : "bg-info"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-foreground truncate">{project.name}</p>
                      {isAll && <BusinessLineBadge lineId={project.businessLine.slug} />}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {project.hoursLogged}h / {project.hoursEstimated}h
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground w-8 text-right">
                      {project.progress}%
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/crm/clienti" className="bg-surface rounded-xl border border-border p-5 hover:border-primary/20 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", activeLineId === "fudly" ? "bg-orange-500/10 text-orange-500" : "bg-primary/10 text-primary")}>
              {activeLineId === "fudly" ? <UtensilsCrossed size={20} /> : <Contact size={20} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Lista {lineLabel}</p>
              <p className="text-xs text-muted-foreground">{stats?.activeClients || 0} activi • DataTable cu filtre și sortare</p>
            </div>
          </div>
        </Link>
        <Link href="/crm/lead-uri" className="bg-surface rounded-xl border border-border p-5 hover:border-primary/20 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
              <Target size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Pipeline Lead-uri</p>
              <p className="text-xs text-muted-foreground">{stats?.openLeads || 0} deschise • Kanban, Tabel, Pipeline views</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Conversion Rate */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Rată de Conversie</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Lead-uri finalizate cu succes</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-foreground">{stats?.conversionRate || 0}%</span>
            {stats && stats.conversionRate > 0 && (
              <div className="flex items-center text-success text-xs font-semibold">
                <TrendingUp size={14} />
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
            style={{ width: `${stats?.conversionRate || 0}%` }}
          />
        </div>
      </div>
    </div>
  )
}
