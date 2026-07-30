"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { BusinessLineBadge } from "@/components/business-line-switcher"
import { ProjectView } from "@/components/project-views"
import { AddTaskModal, EditProjectModal, LogTimeModal, MoreActionsMenu } from "@/components/project-modals"
import { WidgetGrid, StatCardWidget, KeywordTable, CampaignTable, BarChartWidget } from "@/components/dashboard-widgets"
import { useProjectKPIs } from "@/lib/hooks/use-project-kpis"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Card, CardContent } from "@/components/ui/card"
import { ProjectFinancialTab } from "@/components/project-financial-tab"
import { ProjectAIContentTab } from "@/components/project-ai-content-tab"
import { ProjectSeoAuditTab } from "@/components/project-seo-audit-tab"
import { ProjectSeoContentTab } from "@/components/project-seo-content-tab"
import { ProjectSeoBacklinksTab } from "@/components/project-seo-backlinks-tab"
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
  BarChart3,
  Play,
  Pause,
  MoreHorizontal,
  Plus,
  ExternalLink,
  Timer,
  Target,
  Pencil,
  Loader2,
  Settings,
  Trash2,
  Save,
  Phone,
  Sparkles,
  Search,
  Link2,
  Globe
} from "lucide-react"

import { AIContentGenerator } from "@/components/ai-content-generator"

import { ProjectSeoImpactTab } from "@/components/project-seo-impact-tab"
import { ProjectContentSourcesTab } from "@/components/project-content-sources-tab"

type TabView = "overview" | "tasks" | "time" | "files" | "activity" | "performance" | "keywords" | "financial" | "analytics" | "settings" | "ai-content" | "seo-audit" | "seo-content" | "seo-backlinks" | "seo-impact" | "content-sources"

interface APIProject {
  id: string
  name: string
  status: string
  progress: number
  templateId: string
  currentPhase: string | null
  startDate: string | null
  dueDate: string | null
  budget: number | null
  assignedTo: string | null
  notes: string | null
  metadata: any
  businessLine: { slug: string; name: string; icon?: string; color?: string }
  client: { id: string; companyName: string; contactPerson?: string; email?: string; googleAdsCustomerId?: string; ga4PropertyId?: string; gscSiteUrl?: string }
  activities: any[]
}

const statusConfig: Record<string, { label: string; class: string; dot: string; bgFull: string }> = {
  planificare: { label: "Planificare", class: "bg-info/10 text-info", dot: "bg-info", bgFull: "bg-info" },
  in_lucru: { label: "În Lucru", class: "bg-primary/10 text-primary", dot: "bg-primary", bgFull: "bg-primary" },
  review: { label: "Review", class: "bg-warning/10 text-warning", dot: "bg-warning", bgFull: "bg-warning" },
  finalizat: { label: "Finalizat", class: "bg-success/10 text-success", dot: "bg-success", bgFull: "bg-success" },
  suspendat: { label: "Suspendat", class: "bg-destructive/10 text-destructive", dot: "bg-destructive", bgFull: "bg-destructive" },
}

const templateConfig: Record<string, { label: string; class: string }> = {
  seo_project: { label: "SEO", class: "bg-success/10 text-success" },
  seo_programmatic: { label: "SEO Programatic", class: "bg-accent/10 text-accent" },
  ads_campaign: { label: "Google Ads", class: "bg-warning/10 text-warning" },
  web_dev_project: { label: "Web Dev", class: "bg-primary/10 text-primary" },
  social_media: { label: "Social Media", class: "bg-pink-500/10 text-pink-500" },
  linkedin_campaign: { label: "LinkedIn Ads", class: "bg-blue-500/10 text-blue-500" },
  onboarding_restaurant: { label: "Onboarding", class: "bg-accent/10 text-accent" },
}

const taskStatusConfig: Record<string, { label: string; class: string; icon: any }> = {
  done: { label: "Făcut", class: "text-success", icon: CheckCircle2 },
  in_progress: { label: "În Lucru", class: "text-primary", icon: Play },
  todo: { label: "De Făcut", class: "text-muted-foreground", icon: Target },
}

export default function ProjectSinglePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string
  const [activeTab, setActiveTab] = useState<TabView>("overview")
  const [project, setProject] = useState<APIProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Modal states
  const [showAddTask, setShowAddTask] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)
  const [showLogTime, setShowLogTime] = useState(false)
  
  const [keywordVolumes, setKeywordVolumes] = useState<Record<string, number>>({})
  const [loadingVolumes, setLoadingVolumes] = useState(false)

  // Load saved tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem(`agencyos_tab_${projectId}`)
      if (savedTab) setActiveTab(savedTab as TabView)
    }
  }, [projectId])

  const handleTabChange = (tab: TabView) => {
    setActiveTab(tab)
    localStorage.setItem(`agencyos_tab_${projectId}`, tab)
  }

  // Fetch project data
  useEffect(() => {
    setLoading(true)
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(j => {
        if (j.data) setProject(j.data)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [projectId])

  // Date range state (default: last 30 days)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  // Live KPI data from Google Ads / GSC API
  const { data: liveKPIs, loading: kpiLoading } = useProjectKPIs(projectId, dateFrom, dateTo)
  
  // Auto-fetch volumes
  useEffect(() => {
    if (liveKPIs?.pageKeywords && liveKPIs.pageKeywords.length > 0) {
      const keywords = Array.from(new Set(liveKPIs.pageKeywords.map((pk: any) => pk.query)))
      setLoadingVolumes(true)
      fetch('/api/seo/keyword-volumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, keywords })
      })
      .then(r => r.json())
      .then(json => { if (json.data) setKeywordVolumes(json.data) })
      .catch(console.error)
      .finally(() => setLoadingVolumes(false))
    }
  }, [liveKPIs?.pageKeywords, projectId])

  const metadata = project?.metadata || {}
  const phases = metadata.phases || []
  const checklist = metadata.checklist || []
  const kpiDefs = metadata.kpis || []

  // Auto-populate KPI values from live Google Ads data
  const enrichedKpis = useMemo(() => {
    if (!liveKPIs?.googleAds || 'error' in liveKPIs.googleAds) return kpiDefs;
    const ads = liveKPIs.googleAds;
    const liveMap: Record<string, string> = {
      'Spend lunar': `${(ads.spend ?? 0).toLocaleString('ro-RO')} RON`,
      'Conversii': `${ads.conversions ?? 0}`,
      'ROAS': `${ads.roas ?? 0}x`,
      'CPC mediu': `${ads.cpc ?? 0} RON`,
    };
    return kpiDefs.map((k: any) => ({
      ...k,
      value: liveMap[k.label] || k.value,
    }));
  }, [kpiDefs, liveKPIs])

  const [checklistState, setChecklistState] = useState<boolean[]>([])
  useEffect(() => {
    if (checklist.length > 0) {
      setChecklistState(checklist.map((c: any) => c.done || false))
    }
  }, [project?.id])

  // Sort state for tables
  const [stSort, setStSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'clicks', dir: 'desc' })
  const [convSort, setConvSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'allConversions', dir: 'desc' })

  const sortedSearchTerms = useMemo(() => {
    const items = liveKPIs?.searchTerms || []
    return [...items].sort((a: any, b: any) => {
      const av = a[stSort.key] ?? 0, bv = b[stSort.key] ?? 0
      return stSort.dir === 'asc' ? av - bv : bv - av
    })
  }, [liveKPIs?.searchTerms, stSort])

  const sortedConversions = useMemo(() => {
    const items = liveKPIs?.conversionBreakdown || []
    return [...items].sort((a: any, b: any) => {
      const av = a[convSort.key] ?? 0, bv = b[convSort.key] ?? 0
      return convSort.dir === 'asc' ? av - bv : bv - av
    })
  }, [liveKPIs?.conversionBreakdown, convSort])

  const SortHeader = ({ label, sortKey, current, onSort }: { label: string; sortKey: string; current: { key: string; dir: 'asc' | 'desc' }; onSort: (s: any) => void }) => (
    <th
      className="py-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => onSort({ key: sortKey, dir: current.key === sortKey && current.dir === 'desc' ? 'asc' : 'desc' })}
    >
      {label} {current.key === sortKey ? (current.dir === 'desc' ? '▼' : '▲') : ''}
    </th>
  )

  // Determine project type capabilities
  const isSeoProject = ['seo_project', 'seo_programmatic'].includes(project?.templateId || '')
  const isAdsProject = ['ads_campaign', 'linkedin_campaign', 'instagram_campaign', 'facebook_campaign', 'tiktok_campaign'].includes(project?.templateId || '')
  const isMarketingProject = isSeoProject || isAdsProject || ['social_media'].includes(project?.templateId || '')
  const hasDashboard = isSeoProject || isAdsProject

  // Local tasks and time entries from metadata
  const localTasks = metadata.tasks || []
  const localTimeEntries = metadata.timeEntries || []

  const doneTasks = localTasks.filter((t: any) => t.status === 'done').length
  const inProgressTasks = localTasks.filter((t: any) => t.status === 'in_progress').length
  const todoTasks = localTasks.filter((t: any) => t.status === 'todo').length

  // Time per member
  const memberHours = localTimeEntries.reduce((acc: Record<string, number>, te: any) => {
    acc[te.member] = (acc[te.member] || 0) + te.hours
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-4 md:p-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Proiect negăsit</h2>
          <p className="text-sm text-muted-foreground mb-4">Proiectul cu ID-ul „{projectId}" nu există.</p>
          <Link href="/projects" className="text-sm font-medium text-primary hover:underline">← Înapoi la Proiecte</Link>
        </div>
      </div>
    )
  }

  const sc = statusConfig[project.status]
  const tc = templateConfig[project.templateId] || { label: project.templateId, class: "bg-muted text-muted-foreground" }
  const daysUntilDeadline = project.dueDate ? Math.ceil((new Date(project.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0

  const tabs: { value: TabView; label: string; icon: any; count?: number }[] = [
    { value: "overview", label: "Overview", icon: BarChart3 },
    ...(hasDashboard ? [{ value: "performance" as TabView, label: "Performance", icon: TrendingUp }] : []),
    ...(isSeoProject ? [{ value: "keywords" as TabView, label: "Keywords", icon: Target }] : []),
    ...(isSeoProject ? [{ value: "seo-audit" as TabView, label: "Audit SEO", icon: Search }] : []),
    ...(isSeoProject ? [{ value: "seo-content" as TabView, label: "SEO Content", icon: FileText }] : []),
    ...(isSeoProject ? [{ value: "seo-backlinks" as TabView, label: "Backlinks", icon: Link2 }] : []),
    ...(isSeoProject ? [{ value: "seo-impact" as TabView, label: "Impact Analysis", icon: BarChart3 }] : []),
    ...(isSeoProject ? [{ value: "content-sources" as TabView, label: "Surse Content", icon: Globe }] : []),
    ...(isAdsProject ? [{ value: "keywords" as TabView, label: "Campaigns", icon: Target }] : []),
    ...(liveKPIs?.posthog && !('error' in (liveKPIs.posthog || {})) ? [{ value: "analytics" as TabView, label: "Analytics", icon: BarChart3 }] : []),
    { value: "tasks", label: "Tasks", icon: CheckCircle2, count: localTasks.length },
    { value: "financial", label: "Financial", icon: DollarSign },
    { value: "activity", label: "Activitate", icon: MessageSquare, count: project.activities?.length },
    ...(isMarketingProject ? [{ value: "ai-content" as TabView, label: "AI Content", icon: Sparkles }] : []),
    { value: "settings" as TabView, label: "Setări", icon: Settings },
  ]

  return (
    <>
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/projects")} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors">Proiecte</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium truncate max-w-48">{project.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEditProject(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors">
            <Pencil size={12} /> Editează
          </button>
          <MoreActionsMenu onAction={(action) => {
            if (action === 'delete') {
              if (confirm('Sigur vrei să arhivezi acest proiect?')) {
                fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
                  .then(() => router.push('/projects'))
              }
            }
          }} />
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="h-1.5 bg-muted">
          <div
            className={cn("h-full rounded-r-full transition-all duration-700", sc?.bgFull || "bg-primary")}
            style={{ width: `${project.progress}%` }}
          />
        </div>

        <div className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("px-2.5 py-0.5 text-[11px] font-semibold rounded-full", sc?.class)}>
                  {sc?.label || project.status}
                </span>
                <span className={cn("px-2 py-0.5 text-[10px] font-medium rounded-md", tc?.class)}>
                  {tc?.label}
                </span>
                <BusinessLineBadge lineId={project.businessLine?.slug} />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">{project.name}</h1>
              {project.client && (
                <Link href={`/crm/clienti/${project.client.id}`} className="text-sm text-muted-foreground flex items-center gap-1.5 hover:text-primary transition-colors">
                  Client: <span className="font-medium text-foreground">{project.client.companyName}</span>
                  <ExternalLink size={12} className="text-muted-foreground" />
                </Link>
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 flex-shrink-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{project.progress}%</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progres</p>
              </div>
              {daysUntilDeadline !== null && (
                <div className="text-center">
                  <p className={cn("text-2xl font-bold", isOverdue ? "text-destructive" : "text-foreground")}>
                    {isOverdue ? `${Math.abs(daysUntilDeadline)}z` : `${daysUntilDeadline}z`}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {isOverdue ? "Depășit" : "Deadline"}
                  </p>
                </div>
              )}
              {project.budget && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(project.budget)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Buget</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Date Range Picker */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 w-fit border border-border/50 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value as TabView)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-surface text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                )}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn("text-[10px] px-1 rounded-full", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{tab.count}</span>
                )}
              </button>
            )
          })}
        </div>
        {hasDashboard && (
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
          />
        )}
      </div>

      {/* ─── Tab Content ─── */}

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Google Ads KPI Cards */}
            {isAdsProject && liveKPIs?.googleAds && !('error' in liveKPIs.googleAds) && (
              <div className="bg-gradient-to-r from-primary/5 to-success/5 rounded-xl border border-primary/20 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">📊 Google Ads KPIs</h3>
                  <button onClick={() => setActiveTab("performance")} className="text-[11px] text-primary hover:underline font-medium">
                    Detalii →
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Spend', value: `${(liveKPIs.googleAds.spend ?? 0).toLocaleString('ro-RO')} RON`, color: 'text-warning' },
                    { label: 'Clicks', value: (liveKPIs.googleAds.clicks ?? 0).toLocaleString('ro-RO'), color: 'text-primary' },
                    { label: 'Impressions', value: (liveKPIs.googleAds.impressions ?? 0).toLocaleString('ro-RO'), color: 'text-info' },
                    { label: 'Conversii', value: (liveKPIs.googleAds.conversions ?? 0).toLocaleString('ro-RO'), color: 'text-success' },
                    { label: 'CTR', value: `${liveKPIs.googleAds.ctr ?? 0}%`, color: 'text-primary' },
                    { label: 'CPC', value: `${liveKPIs.googleAds.cpc ?? 0} RON`, color: 'text-warning' },
                    { label: 'Conv. Rate', value: `${liveKPIs.googleAds.conversionRate ?? 0}%`, color: 'text-success' },
                    { label: 'ROAS', value: `${liveKPIs.googleAds.roas ?? 0}x`, color: 'text-accent' },
                  ].map((kpi, i) => (
                    <div key={i} className="text-center p-2 bg-background/50 rounded-lg">
                      <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GSC KPI Cards for SEO projects */}
            {isSeoProject && liveKPIs?.gsc && !('error' in liveKPIs.gsc) && (
              <div className="bg-gradient-to-r from-success/5 to-primary/5 rounded-xl border border-success/20 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">🔍 SEO — Google Search Console</h3>
                  <button onClick={() => setActiveTab("performance")} className="text-[11px] text-primary hover:underline font-medium">Detalii →</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-primary">{(liveKPIs.gsc.clicks ?? 0).toLocaleString('ro-RO')}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Clicks</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-info">{(liveKPIs.gsc.impressions ?? 0).toLocaleString('ro-RO')}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Impressions</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-success">{liveKPIs.gsc.ctr}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">CTR</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-warning">{liveKPIs.gsc.position}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Avg Position</p>
                  </div>
                </div>
              </div>
            )}

            {/* SEO Overview quick metrics */}
            {isSeoProject && liveKPIs?.gscQueries && liveKPIs.gscQueries.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">🔑 Top Keywords</h3>
                  <button onClick={() => setActiveTab("keywords")} className="text-[11px] text-primary hover:underline font-medium">Toate →</button>
                </div>
                <div className="space-y-1.5">
                  {liveKPIs.gscQueries.slice(0, 5).map((q: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-background/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-4">{i + 1}.</span>
                        <span className="text-foreground font-medium">{q.query}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-semibold">{q.clicks} clicks</span>
                        <span className={cn('font-medium', q.position <= 3 ? 'text-green-400' : q.position <= 10 ? 'text-yellow-400' : 'text-red-400')}>
                          #{(q.position ?? 0).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organic Clicks Zilnic (SEO) */}
            {isSeoProject && liveKPIs?.gscDaily && liveKPIs.gscDaily.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-4">
                <h4 className="text-xs font-semibold text-foreground mb-3">📈 Clicks Organic Zilnic</h4>
                <div className="flex items-end gap-0.5 h-24">
                  {liveKPIs.gscDaily.map((d: any, i: number) => {
                    const maxClicks = Math.max(...liveKPIs.gscDaily!.map((x: any) => x.clicks));
                    const height = maxClicks > 0 ? (d.clicks / maxClicks) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 group relative">
                        <div
                          className="bg-success/60 hover:bg-success rounded-t transition-colors"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${d.date}: ${d.clicks} clicks | ${d.impressions} impr`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  <span>{liveKPIs.gscDaily[0]?.date}</span>
                  <span>{liveKPIs.gscDaily[liveKPIs.gscDaily.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {kpiLoading && (
              <div className="bg-surface rounded-xl border border-border p-5 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary mr-2" size={16} />
                <span className="text-xs text-muted-foreground">Se încarcă datele...</span>
              </div>
            )}

            {/* Non-Ads KPI metadata cards */}
            {!isAdsProject && !isSeoProject && enrichedKpis.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">KPI-uri Proiect</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {enrichedKpis.map((k: any, i: number) => (
                    <div key={i} className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-lg font-bold text-foreground">{k.value || '—'}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                      {k.target && k.target !== '—' && <p className="text-[9px] text-primary mt-0.5">Target: {k.target}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Conversion Breakdown Table (Ads only) ─── */}
            {isAdsProject && liveKPIs?.conversionBreakdown && liveKPIs.conversionBreakdown.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">🎯 Conversii — Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium">Acțiune Conversie</th>
                        <SortHeader label="Conv." sortKey="conversions" current={convSort} onSort={setConvSort} />
                        <SortHeader label="All Conv." sortKey="allConversions" current={convSort} onSort={setConvSort} />
                        <SortHeader label="Valoare" sortKey="value" current={convSort} onSort={setConvSort} />
                        <th className="text-left py-2 text-muted-foreground font-medium pl-3">Campanie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedConversions.map((conv: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2 text-foreground font-medium">{conv.actionName}</td>
                          <td className="py-2 text-right text-success font-semibold">{conv.conversions}</td>
                          <td className="py-2 text-right text-primary">{conv.allConversions}</td>
                          <td className="py-2 text-right text-warning">{conv.value > 0 ? `${conv.value} RON` : '—'}</td>
                          <td className="py-2 text-left text-muted-foreground pl-3 max-w-[150px] truncate">{conv.campaigns?.join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── Landing Page Conversions (which pages convert) ─── */}
            {liveKPIs?.landingPageConversions && liveKPIs.landingPageConversions.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">📄 Conversii per Pagină (Landing Pages)</h3>
                <p className="text-[10px] text-muted-foreground mb-3">De pe ce pagini vin conversiile din Google Ads</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium">Pagină</th>
                        <th className="py-2 text-right text-muted-foreground font-medium">Conversii</th>
                        <th className="py-2 text-right text-muted-foreground font-medium">Valoare</th>
                        <th className="text-left py-2 pl-4 text-muted-foreground font-medium">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveKPIs.landingPageConversions.slice(0, 15).map((lp: any, i: number) => {
                        // Extract path from URL
                        let path = lp.landingPage
                        try { path = new URL(lp.landingPage).pathname } catch {}
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2 text-foreground font-medium max-w-[260px] truncate" title={lp.landingPage}>
                              {path || '/'}
                            </td>
                            <td className="py-2 text-right text-success font-bold">{lp.totalConversions}</td>
                            <td className="py-2 text-right text-warning">{lp.totalValue > 0 ? `${lp.totalValue} RON` : '—'}</td>
                            <td className="py-2 pl-4">
                              <div className="flex flex-wrap gap-1">
                                {(lp.topActions || []).slice(0, 3).map((a: any, j: number) => (
                                  <span key={j} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                                    {a.count}× {a.name.length > 25 ? a.name.slice(0, 25) + '…' : a.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── PostHog Form Submissions per Page ─── */}
            {liveKPIs?.conversionsByPage && liveKPIs.conversionsByPage.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">📝 Conversii per Pagină (PostHog)</h3>
                <p className="text-[10px] text-muted-foreground mb-3">Form submissions, click-uri telefon și email — de pe care pagini vin</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium">Pagină</th>
                        <th className="py-2 text-right text-muted-foreground font-medium">Total</th>
                        <th className="py-2 text-right text-muted-foreground font-medium">📝 Forms</th>
                        <th className="py-2 text-right text-muted-foreground font-medium">📞 Telefon</th>
                        <th className="py-2 text-right text-muted-foreground font-medium">📧 Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveKPIs.conversionsByPage.slice(0, 20).map((cp: any, i: number) => {
                        let path = cp.pageUrl
                        try { path = new URL(cp.pageUrl).pathname } catch {}
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2 text-foreground font-medium max-w-[300px] truncate" title={cp.pageUrl}>
                              {path || '/'}
                            </td>
                            <td className="py-2 text-right text-success font-bold">{cp.totalConversions}</td>
                            <td className="py-2 text-right text-primary">{cp.formSubmissions || '—'}</td>
                            <td className="py-2 text-right text-green-400">{cp.phoneClicks || '—'}</td>
                            <td className="py-2 text-right text-blue-400">{cp.emailClicks || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── Search Terms Table (Ads only) ─── */}
            {isAdsProject && liveKPIs?.searchTerms && liveKPIs.searchTerms.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">🔍 Top Termeni de Căutare</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium">Termen</th>
                        <SortHeader label="Clicks" sortKey="clicks" current={stSort} onSort={setStSort} />
                        <SortHeader label="Impr." sortKey="impressions" current={stSort} onSort={setStSort} />
                        <SortHeader label="CTR" sortKey="ctr" current={stSort} onSort={setStSort} />
                        <SortHeader label="CPC" sortKey="cpc" current={stSort} onSort={setStSort} />
                        <SortHeader label="Cost" sortKey="cost" current={stSort} onSort={setStSort} />
                        <SortHeader label="Conv." sortKey="conversions" current={stSort} onSort={setStSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSearchTerms.map((st: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2 text-foreground font-medium">{st.term}</td>
                          <td className="py-2 text-right text-primary font-semibold">{st.clicks}</td>
                          <td className="py-2 text-right text-muted-foreground">{(st.impressions ?? 0).toLocaleString('ro-RO')}</td>
                          <td className="py-2 text-right text-info">{st.ctr}%</td>
                          <td className="py-2 text-right text-warning">{st.cpc} RON</td>
                          <td className="py-2 text-right text-foreground">{st.cost} RON</td>
                          <td className="py-2 text-right text-success font-semibold">{st.conversions > 0 ? st.conversions : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── PostHog Analytics ─── */}
            {liveKPIs?.posthog && !('error' in liveKPIs.posthog) && (
              <div className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl border border-purple-500/20 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">📊 PostHog Analytics</h3>

                {/* Sessions + Health Score row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-purple-400">{(liveKPIs.posthog as any).sessions?.totalSessions ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Sesiuni</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-pink-400">{(liveKPIs.posthog as any).sessions?.avgDuration ?? 0}s</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Durată Medie</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    {(() => {
                      const score = (liveKPIs.posthog as any).health?.healthScore ?? -1;
                      const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : score >= 0 ? 'text-red-400' : 'text-muted-foreground';
                      return <>
                        <p className={`text-lg font-bold ${color}`}>{score >= 0 ? score : '—'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Scor Sănătate</p>
                      </>;
                    })()}
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-orange-400">{(liveKPIs.posthog as any).health?.rageClicks ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Rage Clicks</p>
                  </div>
                </div>

                {/* Web Vitals */}
                {(liveKPIs.posthog as any).webVitals && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Core Web Vitals</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'LCP', value: `${(((liveKPIs.posthog as any).webVitals.lcp ?? 0) / 1000).toFixed(1)}s`, status: (liveKPIs.posthog as any).webVitals.lcpStatus },
                        { label: 'CLS', value: (liveKPIs.posthog as any).webVitals.cls ?? 0, status: (liveKPIs.posthog as any).webVitals.clsStatus },
                        { label: 'INP', value: `${(liveKPIs.posthog as any).webVitals.inp ?? 0}ms`, status: (liveKPIs.posthog as any).webVitals.inpStatus },
                        { label: 'FCP', value: `${(((liveKPIs.posthog as any).webVitals.fcp ?? 0) / 1000).toFixed(1)}s`, status: (liveKPIs.posthog as any).webVitals.fcpStatus },
                      ].map((v, i) => (
                        <div key={i} className="text-center p-2 bg-background/30 rounded-lg">
                          <span className="text-[10px]">{v.status === 'good' ? '🟢' : v.status === 'needs-improvement' ? '🟡' : '🔴'}</span>
                          <p className="text-sm font-bold text-foreground">{v.value}</p>
                          <p className="text-[10px] text-muted-foreground">{v.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Health details */}
                {(liveKPIs.posthog as any).health?.topErrorPages?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1.5">Top Pagini cu Probleme</p>
                    {(liveKPIs.posthog as any).health.topErrorPages.slice(0, 3).map((p: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs bg-background/30 rounded px-3 py-1.5 mb-1">
                        <span className="truncate max-w-[70%] text-foreground">{p.page?.replace(/https?:\/\/[^/]+/, '') || '/'}</span>
                        <span className="text-red-400 font-medium">{p.count} erori</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent Sessions */}
                {(liveKPIs.posthog as any).sessions?.recentSessions?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1.5">Ultime Sesiuni</p>
                    {(liveKPIs.posthog as any).sessions.recentSessions.slice(0, 3).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-background/30 rounded px-3 py-1.5 mb-1">
                        <span className="text-foreground truncate max-w-[60%]" title={s.startUrl}>{s.startUrl?.replace(/https?:\/\/[^/]+/, '') || '/'}</span>
                        <div className="flex gap-3 text-muted-foreground">
                          <span>{s.duration}s</span>
                          <span>{s.clicks} clicks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Telnyx Call Tracking (DNI) ─── */}
            {liveKPIs?.telnyx && !('error' in liveKPIs.telnyx) && (
              <div className="bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-xl border border-green-500/20 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">📞 Apeluri Telefonice</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-green-400">{liveKPIs.telnyx.totalCalls}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Total Apeluri</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-emerald-400">{liveKPIs.telnyx.avgDuration}s</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Durată Medie</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-green-300">{Math.round(liveKPIs.telnyx.totalDuration / 60)}m</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Total Minute</p>
                  </div>
                </div>

                {/* By Source Breakdown (DNI) */}
                {(liveKPIs.telnyx as any).bySource?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Apeluri per Sursă</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(liveKPIs.telnyx as any).bySource.map((s: any, i: number) => (
                        <div key={i} className={cn(
                          "text-center p-2 rounded-lg border",
                          s.source === 'google_ads' ? 'bg-blue-500/5 border-blue-500/20' :
                          s.source === 'organic' || s.source === 'seo' ? 'bg-green-500/5 border-green-500/20' :
                          s.source === 'facebook' ? 'bg-purple-500/5 border-purple-500/20' :
                          s.source === 'direct' ? 'bg-yellow-500/5 border-yellow-500/20' :
                          'bg-muted/30 border-border'
                        )}>
                          <p className="text-lg font-bold text-foreground">{s.count}</p>
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">~{s.avgDuration}s medie</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {liveKPIs.telnyx.calls?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Ultimele Apeluri</p>
                    {liveKPIs.telnyx.calls.slice(0, 8).map((call: any, i: number) => (
                      <div key={i} className="bg-background/30 rounded px-3 py-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Source badge */}
                            {call.sourceLabel && call.source !== 'unknown' && (
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0",
                                call.source === 'google_ads' ? 'bg-blue-500/10 text-blue-400' :
                                call.source === 'organic' || call.source === 'seo' ? 'bg-green-500/10 text-green-400' :
                                call.source === 'facebook' ? 'bg-purple-500/10 text-purple-400' :
                                call.source === 'direct' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-muted text-muted-foreground'
                              )}>{call.sourceLabel}</span>
                            )}
                            <span className="text-foreground font-medium">{call.from}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-muted-foreground truncate">{call.to}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground flex-shrink-0">
                            <span>{new Date(call.createdAt).toLocaleDateString('ro-RO')}</span>
                            <span className="font-medium">{call.duration >= 60 ? `${Math.floor(call.duration/60)}m${call.duration%60}s` : `${call.duration}s`}</span>
                          </div>
                        </div>
                        {call.downloadUrl && (
                          <audio
                            controls
                            preload="none"
                            className="w-full mt-2 h-8"
                            style={{ filter: 'hue-rotate(100deg) saturate(1.5)' }}
                          >
                            <source src={call.downloadUrl} type="audio/mpeg" />
                          </audio>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Spend Zilnic Chart (Ads only) */}
            {isAdsProject && liveKPIs?.dailyPerformance && liveKPIs.dailyPerformance.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-4">
                <h4 className="text-xs font-semibold text-foreground mb-3">📊 Spend Zilnic</h4>
                <div className="flex items-end gap-0.5 h-24">
                  {liveKPIs.dailyPerformance.map((d: any, i: number) => {
                    const maxSpend = Math.max(...liveKPIs.dailyPerformance!.map((x: any) => x.spend));
                    const height = maxSpend > 0 ? (d.spend / maxSpend) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 group relative">
                        <div
                          className="bg-primary/60 hover:bg-primary rounded-t transition-colors"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${d.date}: ${d.spend} RON | ${d.clicks} clicks | ${d.conversions} conv`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  <span>{liveKPIs.dailyPerformance[0]?.date}</span>
                  <span>{liveKPIs.dailyPerformance[liveKPIs.dailyPerformance.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* Tasks summary */}
            {localTasks.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
                  <button onClick={() => setActiveTab("tasks")} className="text-[11px] text-primary hover:underline font-medium">Vezi toate →</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-success/5 rounded-lg p-3 text-center border border-success/10">
                    <p className="text-xl font-bold text-success">{doneTasks}</p>
                    <p className="text-[10px] text-muted-foreground">Făcute</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/10">
                    <p className="text-xl font-bold text-primary">{inProgressTasks}</p>
                    <p className="text-[10px] text-muted-foreground">În lucru</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center border border-border">
                    <p className="text-xl font-bold text-muted-foreground">{todoTasks}</p>
                    <p className="text-[10px] text-muted-foreground">De făcut</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Project details */}
            <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Detalii</h3>
              {[
                { label: "Status", value: sc?.label || project.status },
                { label: "Client", value: project.client?.companyName },
                { label: "Fază curentă", value: project.currentPhase || "—" },
                { label: "Data start", value: project.startDate ? formatDate(project.startDate) : "—" },
                { label: "Deadline", value: project.dueDate ? formatDate(project.dueDate) : "—" },
                { label: "Buget", value: project.budget ? formatCurrency(project.budget) : "—" },
                { label: "Asignat", value: project.assignedTo || "—" },
              ].map((d) => (
                <div key={d.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{d.label}</span>
                  <span className="text-xs font-medium text-foreground text-right max-w-[60%] truncate">{d.value}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Note</h3>
              <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">
                {project.notes || "Nicio notă adăugată."}
              </p>
            </div>

            {/* Phases — moved from body */}
            {phases.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Faze Proiect</h3>
                <div className="space-y-1.5">
                  {phases.map((phase: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                        phase.status === 'completed' ? "bg-success text-white" :
                        phase.name === project.currentPhase ? "bg-primary text-white" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {phase.status === 'completed' ? '✓' : i + 1}
                      </div>
                      <span className={cn("text-xs",
                        phase.status === 'completed' ? "text-foreground line-through" :
                        phase.name === project.currentPhase ? "text-foreground font-semibold" :
                        "text-muted-foreground"
                      )}>
                        {phase.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist — moved from body */}
            {checklist.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Checklist</h3>
                <div className="space-y-1">
                  {checklist.map((item: any, i: number) => (
                    <label key={i} className="flex items-center gap-2 py-0.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checklistState[i] || false}
                        onChange={() => {
                          const next = [...checklistState]
                          next[i] = !next[i]
                          setChecklistState(next)
                          const updatedChecklist = checklist.map((c: any, j: number) => ({ ...c, done: next[j] || false }))
                          fetch(`/api/projects/${projectId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ metadata: { ...metadata, checklist: updatedChecklist } }),
                          }).catch(console.error)
                        }}
                        className="w-3.5 h-3.5 rounded border-border accent-primary"
                      />
                      <span className={cn("text-xs transition-colors",
                        checklistState[i] ? "text-muted-foreground line-through" : "text-foreground group-hover:text-primary"
                      )}>
                        {typeof item === 'string' ? item : item.item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERFORMANCE TAB — LIVE DATA */}
      {activeTab === "performance" && (
        <div className="space-y-4">
          {kpiLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="ml-2 text-sm text-muted-foreground">Se încarcă datele...</span>
            </div>
          ) : (
            <>
              {/* ─── GOOGLE ADS PERFORMANCE (Ads projects) ─── */}
              {isAdsProject && liveKPIs?.googleAds && !('error' in liveKPIs.googleAds) && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">📊 Google Ads — Date Reale</h3>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {liveKPIs.dateRange.from} → {liveKPIs.dateRange.to}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Spend', value: `${(liveKPIs.googleAds.spend ?? 0).toLocaleString('ro-RO')} RON`, icon: '💰', color: 'text-warning' },
                      { label: 'Clicks', value: (liveKPIs.googleAds.clicks ?? 0).toLocaleString('ro-RO'), icon: '🖱️', color: 'text-primary' },
                      { label: 'Impressions', value: (liveKPIs.googleAds.impressions ?? 0).toLocaleString('ro-RO'), icon: '👁️', color: 'text-info' },
                      { label: 'Conversii', value: (liveKPIs.googleAds.conversions ?? 0).toLocaleString('ro-RO'), icon: '🎯', color: 'text-success' },
                      { label: 'CTR', value: `${liveKPIs.googleAds.ctr ?? 0}%`, icon: '📈', color: 'text-primary' },
                      { label: 'CPC', value: `${liveKPIs.googleAds.cpc ?? 0} RON`, icon: '💵', color: 'text-warning' },
                      { label: 'Conv. Rate', value: `${liveKPIs.googleAds.conversionRate ?? 0}%`, icon: '🔄', color: 'text-success' },
                      { label: 'ROAS', value: `${liveKPIs.googleAds.roas ?? 0}x`, icon: '🚀', color: 'text-accent' },
                    ].map((kpi, i) => (
                      <div key={i} className="bg-surface rounded-xl border border-border p-4 text-center hover:border-primary/30 transition-colors">
                        <span className="text-lg">{kpi.icon}</span>
                        <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{kpi.label}</p>
                      </div>
                    ))}
                  </div>
                  {liveKPIs.dailyPerformance && liveKPIs.dailyPerformance.length > 0 && (
                    <div className="bg-surface rounded-xl border border-border p-4">
                      <h4 className="text-xs font-semibold text-foreground mb-3">Spend Zilnic</h4>
                      <div className="flex items-end gap-0.5 h-24">
                        {liveKPIs.dailyPerformance.map((d: any, i: number) => {
                          const maxSpend = Math.max(...liveKPIs.dailyPerformance!.map((x: any) => x.spend));
                          const height = maxSpend > 0 ? (d.spend / maxSpend) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 group relative">
                              <div
                                className="bg-primary/60 hover:bg-primary rounded-t transition-colors"
                                style={{ height: `${Math.max(height, 2)}%` }}
                                title={`${d.date}: ${d.spend} RON | ${d.clicks} clicks | ${d.conversions} conv`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                        <span>{liveKPIs.dailyPerformance[0]?.date}</span>
                        <span>{liveKPIs.dailyPerformance[liveKPIs.dailyPerformance.length - 1]?.date}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── GSC PERFORMANCE (SEO projects) ─── */}
              {isSeoProject && liveKPIs?.gsc && !('error' in liveKPIs.gsc) && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">🔍 Google Search Console — Date Reale</h3>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {liveKPIs.dateRange.from} → {liveKPIs.dateRange.to}
                    </span>
                  </div>

                  {/* GSC KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Organic Clicks', value: (liveKPIs.gsc.clicks ?? 0).toLocaleString('ro-RO'), icon: '🖱️', color: 'text-primary' },
                      { label: 'Impressions', value: (liveKPIs.gsc.impressions ?? 0).toLocaleString('ro-RO'), icon: '👁️', color: 'text-info' },
                      { label: 'CTR', value: `${liveKPIs.gsc.ctr ?? 0}%`, icon: '📈', color: 'text-success' },
                      { label: 'Avg. Position', value: (liveKPIs.gsc.position ?? 0).toFixed(1), icon: '📊', color: 'text-warning' },
                    ].map((kpi, i) => (
                      <div key={i} className="bg-surface rounded-xl border border-border p-4 text-center hover:border-primary/30 transition-colors">
                        <span className="text-lg">{kpi.icon}</span>
                        <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{kpi.label}</p>
                      </div>
                    ))}
                  </div>


                  {/* Top Keywords Table */}
                  {liveKPIs.gscQueries && liveKPIs.gscQueries.length > 0 && (
                    <div className="bg-surface rounded-xl border border-border p-4 overflow-x-auto">
                      <h4 className="text-xs font-semibold text-foreground mb-3">🔑 Top Keywords</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left py-2 font-medium">Keyword</th>
                            <th className="text-right py-2 font-medium">Clicks</th>
                            <th className="text-right py-2 font-medium">Impr.</th>
                            <th className="text-right py-2 font-medium">CTR</th>
                            <th className="text-right py-2 font-medium">Poziție</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveKPIs.gscQueries.map((q: any, i: number) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-2 text-foreground font-medium max-w-[200px] truncate">{q.query}</td>
                              <td className="py-2 text-right text-primary font-semibold">{q.clicks}</td>
                              <td className="py-2 text-right text-muted-foreground">{(q.impressions ?? 0).toLocaleString('ro-RO')}</td>
                              <td className="py-2 text-right text-success">{((q.ctr ?? 0) * 100).toFixed(1)}%</td>
                              <td className="py-2 text-right">
                                <span className={(q.position ?? 99) <= 3 ? 'text-success font-bold' : (q.position ?? 99) <= 10 ? 'text-warning' : 'text-muted-foreground'}>
                                  {(q.position ?? 0).toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Top Pages Table */}
                  {liveKPIs.gscPages && liveKPIs.gscPages.length > 0 && (
                    <div className="bg-surface rounded-xl border border-border p-4 overflow-x-auto">
                      <h4 className="text-xs font-semibold text-foreground mb-3">📄 Top Pagini</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left py-2 font-medium">Pagină</th>
                            <th className="text-right py-2 font-medium">Clicks</th>
                            <th className="text-right py-2 font-medium">Impr.</th>
                            <th className="text-right py-2 font-medium">CTR</th>
                            <th className="text-right py-2 font-medium">Poziție</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveKPIs.gscPages.map((p: any, i: number) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-2 text-foreground font-medium max-w-[250px] truncate">{p.page.replace(/^https?:\/\/[^/]+/, '')}</td>
                              <td className="py-2 text-right text-primary font-semibold">{p.clicks}</td>
                              <td className="py-2 text-right text-muted-foreground">{(p.impressions ?? 0).toLocaleString('ro-RO')}</td>
                              <td className="py-2 text-right text-success">{((p.ctr ?? 0) * 100).toFixed(1)}%</td>
                              <td className="py-2 text-right">
                                <span className={(p.position ?? 99) <= 3 ? 'text-success font-bold' : (p.position ?? 99) <= 10 ? 'text-warning' : 'text-muted-foreground'}>
                                  {(p.position ?? 0).toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Fallback — no data */}
              {!isAdsProject && !isSeoProject && (
                <div className="bg-surface rounded-xl border border-border p-5 text-center">
                  <p className="text-sm text-muted-foreground">⚠️ Nu sunt configurate integrări de performanță pentru acest tip de proiect.</p>
                </div>
              )}
              {isAdsProject && (!liveKPIs?.googleAds || ('error' in (liveKPIs?.googleAds || {}))) && (
                <div className="bg-surface rounded-xl border border-border p-5 text-center">
                  <p className="text-sm text-muted-foreground">⚠️ {(liveKPIs?.googleAds as any)?.error || 'Nu sunt configurate integrări Google Ads.'}</p>
                </div>
              )}
              {isSeoProject && (!liveKPIs?.gsc || ('error' in (liveKPIs?.gsc || {}))) && (
                <div className="bg-surface rounded-xl border border-border p-5 text-center">
                  <p className="text-sm text-muted-foreground">⚠️ {(liveKPIs?.gsc as any)?.error || 'Nu sunt configurate integrări GSC.'}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* KEYWORDS / CAMPAIGNS TAB */}
      {activeTab === "keywords" && (
        <div className="space-y-4">
          {isSeoProject && (
            <div className="space-y-4">
              {/* Top Queries */}
              {liveKPIs?.gscQueries && liveKPIs.gscQueries.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">🔑 Top Keywords (GSC)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="py-2 pr-3 text-muted-foreground font-medium">#</th>
                          <th className="py-2 pr-3 text-muted-foreground font-medium">Keyword</th>
                          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Clicks</th>
                          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Impr.</th>
                          <th className="py-2 px-2 text-right text-muted-foreground font-medium">CTR</th>
                          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Pozi&#x021B;ie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveKPIs.gscQueries.map((q: any, i: number) => (
                          <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                            <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 pr-3 font-medium text-foreground">{q.query}</td>
                            <td className="py-2 px-2 text-right text-primary">{q.clicks}</td>
                            <td className="py-2 px-2 text-right text-muted-foreground">{(q.impressions ?? 0).toLocaleString()}</td>
                            <td className="py-2 px-2 text-right">{((q.ctr ?? 0) * 100).toFixed(1)}%</td>
                            <td className={cn("py-2 px-2 text-right font-medium", (q.position ?? 99) <= 3 ? 'text-green-400' : (q.position ?? 99) <= 10 ? 'text-yellow-400' : 'text-red-400')}>{(q.position ?? 0).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Page ↔ Keyword Cross-Reference */}
              {(liveKPIs as any)?.pageKeywords && (liveKPIs as any).pageKeywords.length > 0 && (() => {
                // Group keywords by page
                const byPage = new Map<string, Array<{ query: string; clicks: number; impressions: number; position: number }>>();
                for (const pk of (liveKPIs as any).pageKeywords) {
                  const short = pk.page?.replace(/https?:\/\/[^/]+/, '') || '/';
                  if (!byPage.has(short)) byPage.set(short, []);
                  byPage.get(short)!.push({ query: pk.query, clicks: pk.clicks, impressions: pk.impressions, position: pk.position });
                }
                // Sort pages by total clicks
                const sorted = [...byPage.entries()].sort((a, b) => {
                  const totalA = a[1].reduce((s, k) => s + k.clicks, 0);
                  const totalB = b[1].reduce((s, k) => s + k.clicks, 0);
                  return totalB - totalA;
                });

                return (
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-4">🔗 Pagini ↔ Keywords</h3>
                    <div className="space-y-3">
                      {sorted.map(([page, keywords], i) => (
                        <div key={i} className="border border-border/50 rounded-lg overflow-hidden">
                          <div className="bg-background/50 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground truncate" title={page}>{page}</span>
                            <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{keywords.length} keywords • {keywords.reduce((s, k) => s + k.clicks, 0)} clicks</span>
                          </div>
                          <div className="px-4 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              {keywords.sort((a, b) => b.clicks - a.clicks).map((kw, j) => {
                                const vol = keywordVolumes[kw.query]
                                const volStr = vol !== undefined ? ` | Vol: ${vol}` : ''
                                return (
                                  <span key={j} className={cn(
                                    "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border",
                                    kw.position <= 3 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    kw.position <= 10 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                    'bg-muted text-muted-foreground border-border'
                                  )} title={`Poz: ${(kw.position ?? 0).toFixed(1)} | Clicks: ${kw.clicks} | Impr: ${kw.impressions}${volStr}`}>
                                    {kw.query}
                                    <span className="opacity-60">#{(kw.position ?? 0).toFixed(0)}</span>
                                    {vol !== undefined && (
                                      <span className="ml-1 text-[9px] text-blue-400 font-bold bg-blue-500/10 px-1 rounded">
                                        V:{vol >= 1000 ? (vol/1000).toFixed(1)+'k' : vol}
                                      </span>
                                    )}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* SEO Recommendations */}
              {(liveKPIs as any)?.pageKeywords && (liveKPIs as any).pageKeywords.length > 0 && (() => {
                // Dynamic import workaround — inline analysis
                const pageKeywords = (liveKPIs as any).pageKeywords as Array<{ page: string; query: string; clicks: number; impressions: number; ctr: number; position: number }>

                // Quick analysis inline
                const byQuery = new Map<string, typeof pageKeywords>()
                for (const pk of pageKeywords) {
                  const q = pk.query.toLowerCase().trim()
                  if (!byQuery.has(q)) byQuery.set(q, [])
                  byQuery.get(q)!.push(pk)
                }

                // Cannibalization
                const cannibalized = [...byQuery.entries()].filter(([, entries]) => entries.length >= 2 && entries.reduce((s, e) => s + e.impressions, 0) > 10)

                // Low-hanging fruit
                const lowHanging = pageKeywords
                  .filter(pk => pk.position >= 4 && pk.position <= 20 && pk.impressions >= 20)
                  .sort((a, b) => (b.impressions / b.position) - (a.impressions / a.position))
                  .slice(0, 8)

                if (cannibalized.length === 0 && lowHanging.length === 0) return null

                return (
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-4">💡 Recomandări SEO</h3>
                    <div className="space-y-3">
                      {/* Cannibalization alerts */}
                      {cannibalized.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">🔴 Canibalizare Keywords ({cannibalized.length})</p>
                          {cannibalized.slice(0, 5).map(([query, entries], i) => {
                            const sorted = entries.sort((a, b) => a.position - b.position)
                            return (
                              <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                <p className="text-xs font-medium text-foreground mb-1">"{query}"</p>
                                <div className="flex flex-wrap gap-1">
                                  {sorted.map((e, j) => (
                                    <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                      {e.page.replace(/https?:\/\/[^/]+/, '') || '/'} <span className="font-bold">#{e.position.toFixed(0)}</span>
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">Consolidează conținutul sau diferențiază intent-ul</p>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Low-hanging fruit */}
                      {lowHanging.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">🟡 Oportunități Rapide ({lowHanging.length})</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                  <th className="text-left py-2 font-medium">Keyword</th>
                                  <th className="text-left py-2 font-medium">Pagină</th>
                                  <th className="text-right py-2 font-medium">Poz.</th>
                                  <th className="text-right py-2 font-medium">Impresii</th>
                                  <th className="text-right py-2 font-medium">Clicks</th>
                                  <th className="text-right py-2 font-medium">Potențial</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lowHanging.map((pk, i) => (
                                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                                    <td className="py-2 font-medium text-foreground">{pk.query}</td>
                                    <td className="py-2 text-muted-foreground truncate max-w-[200px]">{pk.page.replace(/https?:\/\/[^/]+/, '')}</td>
                                    <td className={cn("py-2 text-right font-bold", pk.position <= 10 ? 'text-yellow-400' : 'text-orange-400')}>{pk.position.toFixed(1)}</td>
                                    <td className="py-2 text-right text-muted-foreground">{pk.impressions.toLocaleString()}</td>
                                    <td className="py-2 text-right text-primary">{pk.clicks}</td>
                                    <td className="py-2 text-right text-green-400 font-medium">~{Math.round(pk.impressions * 0.25)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[10px] text-muted-foreground">* Potențial = click-uri estimate la poziția #1 (~25% CTR)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Top Pages */}
              {liveKPIs?.gscPages && liveKPIs.gscPages.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">📄 Top Pagini (GSC)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="py-2 pr-3 text-muted-foreground font-medium">#</th>
                          <th className="py-2 pr-3 text-muted-foreground font-medium">Pagin&#x0103;</th>
                          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Clicks</th>
                          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Impr.</th>
                          <th className="py-2 px-2 text-right text-muted-foreground font-medium">CTR</th>
                          <th className="py-2 px-2 text-right text-muted-foreground font-medium">Pozi&#x021B;ie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveKPIs.gscPages.map((p: any, i: number) => (
                          <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                            <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 pr-3 font-medium text-foreground truncate max-w-[300px]" title={p.page}>{p.page?.replace(/https?:\/\/[^/]+/, '') || '/'}</td>
                            <td className="py-2 px-2 text-right text-primary">{p.clicks}</td>
                            <td className="py-2 px-2 text-right text-muted-foreground">{(p.impressions ?? 0).toLocaleString()}</td>
                            <td className="py-2 px-2 text-right">{((p.ctr ?? 0) * 100).toFixed(1)}%</td>
                            <td className={cn("py-2 px-2 text-right font-medium", (p.position ?? 99) <= 3 ? 'text-green-400' : (p.position ?? 99) <= 10 ? 'text-yellow-400' : 'text-red-400')}>{(p.position ?? 0).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {(!liveKPIs?.gscQueries || liveKPIs.gscQueries.length === 0) && (!liveKPIs?.gscPages || liveKPIs.gscPages.length === 0) && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">🔑 Keyword Rankings</h3>
                  {kpiLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-primary" size={20} /></div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-8">Nu sunt date GSC disponibile. Verifica&#x021B;i configurarea gscSiteUrl pe proiect.</p>
                  )}
                </div>
              )}
            </div>
          )}
          {isAdsProject && liveKPIs?.campaigns && liveKPIs.campaigns.length > 0 ? (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">📢 Campanii Google Ads — Date Reale</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-3 text-muted-foreground font-medium">Campanie</th>
                      <th className="py-2 px-2 text-muted-foreground font-medium text-right">Status</th>
                      <th className="py-2 px-2 text-muted-foreground font-medium text-right">Spend</th>
                      <th className="py-2 px-2 text-muted-foreground font-medium text-right">Clicks</th>
                      <th className="py-2 px-2 text-muted-foreground font-medium text-right">Impr.</th>
                      <th className="py-2 px-2 text-muted-foreground font-medium text-right">CTR</th>
                      <th className="py-2 px-2 text-muted-foreground font-medium text-right">Conv.</th>
                      <th className="py-2 px-2 text-muted-foreground font-medium text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveKPIs.campaigns.map((c: any) => (
                      <tr key={c.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="py-2 pr-3 font-medium text-foreground">{c.name}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            c.status === 'ENABLED' ? 'bg-success/10 text-success' :
                            c.status === 'PAUSED' ? 'bg-warning/10 text-warning' :
                            'bg-muted text-muted-foreground'
                          }`}>{c.status}</span>
                        </td>
                        <td className="py-2 px-2 text-right text-warning font-medium">{(c.metrics?.spend ?? 0).toLocaleString('ro-RO')} RON</td>
                        <td className="py-2 px-2 text-right">{(c.metrics?.clicks ?? 0).toLocaleString('ro-RO')}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{(c.metrics?.impressions ?? 0).toLocaleString('ro-RO')}</td>
                        <td className="py-2 px-2 text-right">{c.metrics.ctr}%</td>
                        <td className="py-2 px-2 text-right text-success font-medium">{c.metrics.conversions}</td>
                        <td className="py-2 px-2 text-right font-medium">{c.metrics.roas}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isAdsProject ? (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">📢 Campaign Performance</h3>
              {kpiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-primary" size={20} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nu sunt date de campanie disponibile.</p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* SEO AUDIT TAB */}
      {activeTab === "seo-audit" && isSeoProject && (() => {
        const projectGscUrl = metadata.gscSiteUrl || project.client?.gscSiteUrl || ''
        const projectDomain = projectGscUrl.replace('sc-domain:', '').replace(/^https?:\/\//, '').replace(/\/$/, '')
        return (
          <ProjectSeoAuditTab
            domain={projectDomain}
            gscUrl={projectGscUrl}
          />
        )
      })()}

      {/* SEO CONTENT TAB */}
      {activeTab === "seo-content" && isSeoProject && (
        <ProjectSeoContentTab 
          projectId={project.id} 
          metadata={metadata} 
          gscQueries={liveKPIs?.gscQueries || []}
          gscPages={liveKPIs?.gscPages || []}
          gscPageKeywords={liveKPIs?.pageKeywords || []}
          backlinksPages={liveKPIs?.backlinksPages || []}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}

      {/* BACKLINKS TAB */}
      {activeTab === "seo-backlinks" && isSeoProject && (() => {
        const projectGscUrl = metadata.gscSiteUrl || project.client?.gscSiteUrl || ''
        const projectDomain = projectGscUrl.replace('sc-domain:', '').replace(/^https?:\/\//, '').replace(/\/$/, '')
        
        // Extract competitors from content sources
        const sources = metadata.contentSources || [];
        const competitors = sources.map((s: any) => {
          try {
            return new URL(s.url).hostname.replace(/^www\./, '');
          } catch {
            return s.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
          }
        }).filter((d: string) => d && d !== projectDomain);
        
        const uniqueCompetitors = Array.from(new Set(competitors)) as string[];

        return <ProjectSeoBacklinksTab 
          domain={projectDomain} 
          competitors={uniqueCompetitors}
          summary={liveKPIs?.backlinksSummary}
          backlinks={liveKPIs?.backlinksDetail || []}
        />
      })()}

      {/* SEO IMPACT TAB */}
      {activeTab === "seo-impact" && isSeoProject && (() => {
        const projectGscUrl = metadata.gscSiteUrl || project.client?.gscSiteUrl || ''
        const projectDomain = projectGscUrl.replace('sc-domain:', '').replace(/^https?:\/\//, '').replace(/\/$/, '')
        return <ProjectSeoImpactTab 
          projectId={project.id}
          domain={projectDomain} 
          gscPages={liveKPIs?.gscPages || []} 
          gscDaily={liveKPIs?.gscDaily || []}
          dfsPages={liveKPIs?.backlinksPages || []}
          metadata={metadata} 
        />
      })()}

      {/* CONTENT SOURCES TAB */}
      {activeTab === "content-sources" && (
        <ProjectContentSourcesTab projectId={projectId} metadata={metadata} />
      )}

      {/* TASKS TAB */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Tasks ({localTasks.length})</h3>
            <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors">
              <Plus size={12} /> Adaugă Task
            </button>
          </div>
          {localTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Niciun task adăugat.</div>
          ) : (
            <div className="space-y-2">
              {localTasks.map((task: any) => {
                const tsc = taskStatusConfig[task.status]
                const StatusIcon = tsc?.icon || Target
                return (
                  <div key={task.id} className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon size={16} className={tsc?.class} />
                      <div>
                        <p className={cn("text-sm font-medium", task.status === 'done' && "line-through text-muted-foreground")}>{task.title}</p>
                        <p className="text-[11px] text-muted-foreground">{task.assignee} • {task.dueDate}</p>
                      </div>
                    </div>
                    {task.hours && <span className="text-xs text-muted-foreground">{task.hours}h</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* FINANCIAL TAB */}
      {activeTab === "financial" && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">💰 Financiar</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-success/5 rounded-xl border border-success/10">
                <p className="text-2xl font-bold text-success">{formatCurrency(project.budget || 0)}</p>
                <p className="text-xs text-muted-foreground">Buget proiect</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-2xl font-bold text-primary">{project.progress}%</p>
                <p className="text-xs text-muted-foreground">Progres</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl border border-border">
                <p className="text-2xl font-bold text-foreground">{project.dueDate ? formatDate(project.dueDate) : '—'}</p>
                <p className="text-xs text-muted-foreground">Deadline</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS TAB (PostHog deep dive) */}
      {activeTab === "analytics" && liveKPIs?.posthog && !('error' in liveKPIs.posthog) && (
        <div className="space-y-4">
          {/* Health Score Card */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">🏥 Sănătate Site</h3>
            {(() => {
              const ph = liveKPIs.posthog as any;
              const h = ph.health;
              const score = h?.healthScore ?? -1;
              const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : score >= 0 ? 'text-red-400' : 'text-muted-foreground';
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className={`text-4xl font-bold ${color}`}>{score >= 0 ? score : '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Scor Sănătate</p>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div className="bg-background/50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-red-400">{h?.exceptions ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Excepții JS</p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-orange-400">{h?.rageClicks ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Rage Clicks</p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-yellow-400">{h?.deadClicks ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Dead Clicks</p>
                      </div>
                    </div>
                  </div>
                  {/* Top error pages */}
                  {h?.topErrorPages?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">Pagini cu Cele Mai Multe Probleme</p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 text-muted-foreground font-medium">Pagină</th>
                            <th className="text-right py-2 text-muted-foreground font-medium">Erori</th>
                          </tr>
                        </thead>
                        <tbody>
                          {h.topErrorPages.map((p: any, i: number) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2 text-foreground truncate max-w-[300px]" title={p.page}>{p.page?.replace(/https?:\/\/[^/]+/, '') || '/'}</td>
                              <td className="py-2 text-right text-red-400 font-medium">{p.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Web Vitals Detailed */}
          {(liveKPIs.posthog as any).webVitals && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">⚡ Core Web Vitals — Detalii</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'LCP', label: 'Largest Contentful Paint', value: (liveKPIs.posthog as any).webVitals.lcp, unit: 'ms', thresholds: [2500, 4000], status: (liveKPIs.posthog as any).webVitals.lcpStatus, desc: 'Timpul până la afișarea celui mai mare element vizibil' },
                  { key: 'FCP', label: 'First Contentful Paint', value: (liveKPIs.posthog as any).webVitals.fcp, unit: 'ms', thresholds: [1800, 3000], status: (liveKPIs.posthog as any).webVitals.fcpStatus, desc: 'Timpul până la primul conținut vizibil' },
                  { key: 'INP', label: 'Interaction to Next Paint', value: (liveKPIs.posthog as any).webVitals.inp, unit: 'ms', thresholds: [200, 500], status: (liveKPIs.posthog as any).webVitals.inpStatus, desc: 'Câte ms durează răspunsul la interacțiune' },
                  { key: 'CLS', label: 'Cumulative Layout Shift', value: (liveKPIs.posthog as any).webVitals.cls, unit: '', thresholds: [0.1, 0.25], status: (liveKPIs.posthog as any).webVitals.clsStatus, desc: 'Cât de mult se mișcă layoutul paginii (0 = perfect)' },
                ].map((v, i) => (
                  <div key={i} className="bg-background/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-foreground">{v.key}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{v.label}</span>
                      </div>
                      <span className="text-xs">{v.status === 'good' ? '🟢 Bun' : v.status === 'needs-improvement' ? '🟡 De îmbunătățit' : '🔴 Slab'}</span>
                    </div>
                    <p className={`text-2xl font-bold ${v.status === 'good' ? 'text-green-400' : v.status === 'needs-improvement' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {v.unit === 'ms' ? `${((v.value ?? 0) / 1000).toFixed(2)}s` : (v.value ?? 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{v.desc}</p>
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span className="text-green-400">Bun: &lt;{v.thresholds[0]}{v.unit}</span>
                      <span>•</span>
                      <span className="text-yellow-400">Mediu: &lt;{v.thresholds[1]}{v.unit}</span>
                      <span>•</span>
                      <span className="text-red-400">Slab: ≥{v.thresholds[1]}{v.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traffic by Source */}
          {(liveKPIs.posthog as any).trafficBySource?.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">🌐 Trafic per Sursă</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Sursă</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Medium</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Pagini vizualizate</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Utilizatori</th>
                  </tr>
                </thead>
                <tbody>
                  {(liveKPIs.posthog as any).trafficBySource.map((t: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 text-foreground font-medium">{t.source}</td>
                      <td className="py-2 text-muted-foreground">{t.medium}</td>
                      <td className="py-2 text-right text-foreground">{(t.pageviews ?? 0).toLocaleString()}</td>
                      <td className="py-2 text-right text-primary">{(t.uniqueUsers ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top Pages */}
          {(liveKPIs.posthog as any).topPages?.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">📄 Top Pagini</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium w-8">#</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Pagină</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Vizualizări</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Utilizatori</th>
                  </tr>
                </thead>
                <tbody>
                  {(liveKPIs.posthog as any).topPages.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 text-foreground truncate max-w-[300px]" title={p.page}>{p.page?.replace(/https?:\/\/[^/]+/, '') || '/'}</td>
                      <td className="py-2 text-right text-foreground">{(p.views ?? 0).toLocaleString()}</td>
                      <td className="py-2 text-right text-primary">{(p.users ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sessions List */}
          {(liveKPIs.posthog as any).sessions?.recentSessions?.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">📹 Sesiuni Recente</h3>
              <div className="space-y-2">
                {(liveKPIs.posthog as any).sessions.recentSessions.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-background/50 rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate" title={s.startUrl}>{s.startUrl?.replace(/https?:\/\/[^/]+/, '') || '/'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(s.startTime).toLocaleString('ro-RO')}</p>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground flex-shrink-0 ml-4">
                      <span>{s.duration}s</span>
                      <span>{s.clicks} clicks</span>
                      <span>{s.keypresses} keys</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIVITY TAB */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Activitate recentă</h3>
            {project.activities && project.activities.length > 0 ? (
              <div className="space-y-3">
                {project.activities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                      {a.userName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <span className="font-semibold text-foreground">{a.userName || 'System'}</span>{' '}
                        <span className="text-muted-foreground">{a.action}</span>{' '}
                        <span className="font-medium text-foreground">{a.entityName}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Nicio activitate înregistrată.</p>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <SettingsTab project={project} projectId={projectId} onProjectUpdate={(p: any) => setProject(p)} />
      )}

      {/* AI CONTENT TAB */}
      {activeTab === "ai-content" && project.client && (
        <AIContentGenerator
          clientId={project.client.id}
          templateId={project.templateId}
        />
      )}
    </div>

    {/* Modals */}
    <AddTaskModal
      open={showAddTask}
      onClose={() => setShowAddTask(false)}
      teamMembers={project.assignedTo ? [project.assignedTo] : ['Neasignat']}
      onAdd={(task: any) => {
        const newTask = {
          id: Math.random().toString(36).substring(7),
          ...task,
          status: 'todo',
          createdAt: new Date().toISOString()
        }
        const updatedMetadata = {
          ...project.metadata,
          tasks: [...(project.metadata?.tasks || []), newTask]
        }
        
        fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: updatedMetadata }),
        }).then(r => r.json()).then(j => {
          if (j.data) setProject(j.data)
          setShowAddTask(false)
          toast.success("Task adăugat cu succes!")
        }).catch(e => {
          console.error(e)
          toast.error("Eroare la adăugarea taskului")
        })
      }}
    />
    <EditProjectModal
      open={showEditProject}
      onClose={() => setShowEditProject(false)}
      project={{
        name: project.name,
        status: project.status,
        startDate: project.startDate ? (new Date(project.startDate).toISOString().split('T')[0] ?? '') : '',
        deadline: project.dueDate ? (new Date(project.dueDate).toISOString().split('T')[0] ?? '') : '',
        budget: project.budget || 0,
      }}
      onSave={(data: any) => {
        const patchData: any = { name: data.name, status: data.status, budget: data.budget }
        if (data.startDate) patchData.startDate = new Date(data.startDate).toISOString()
        if (data.deadline) patchData.dueDate = new Date(data.deadline).toISOString()
        fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchData),
        }).then(r => r.json()).then(j => {
          if (j.data) setProject(j.data)
          setShowEditProject(false)
        }).catch(console.error)
      }}
    />
    <LogTimeModal
      open={showLogTime}
      onClose={() => setShowLogTime(false)}
      teamMembers={project.assignedTo ? [project.assignedTo] : ['Neasignat']}
      tasks={localTasks.length > 0 ? localTasks.map((t: any) => t.title || 'Task') : ['General']}
      onLog={(entry: any) => {
        setShowLogTime(false)
      }}
    />
    </>
  )
}

// ─── Settings Tab Component ───

const SOURCE_OPTIONS = [
  { value: 'google_ads', label: 'Google Ads', emoji: '📢' },
  { value: 'organic', label: 'Organic', emoji: '🌱' },
  { value: 'seo', label: 'SEO', emoji: '🔍' },
  { value: 'direct', label: 'Direct', emoji: '📱' },
  { value: 'facebook', label: 'Facebook', emoji: '👤' },
  { value: 'referral', label: 'Referral', emoji: '🔗' },
  { value: 'email', label: 'Email', emoji: '✉️' },
  { value: 'unknown', label: 'Necunoscut', emoji: '❓' },
]

function SettingsTab({ project, projectId, onProjectUpdate }: { project: APIProject; projectId: string; onProjectUpdate: (p: any) => void }) {
  const meta = (project.metadata || {}) as any
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // Project metadata fields
  const [posthogId, setPosthogId] = useState(meta.posthogProjectId || '')
  const [gscUrl, setGscUrl] = useState(project.client?.gscSiteUrl || meta.gscSiteUrl || '')
  const [adsCustomerId, setAdsCustomerId] = useState(project.client?.googleAdsCustomerId || '')
  const [ga4PropertyId, setGa4PropertyId] = useState(project.client?.ga4PropertyId || '')
  
  // WordPress SEO settings
  const [wpUrl, setWpUrl] = useState(meta.wpUrl || '')
  const [wpUsername, setWpUsername] = useState(meta.wpUsername || '')
  const [wpAppPassword, setWpAppPassword] = useState(meta.wpAppPassword || '')

  // Telnyx phones with DNI
  const [phones, setPhones] = useState<Array<{ number: string; source: string; label: string }>>(() => {
    const raw = meta.telnyxPhoneNumbers || []
    return raw.map((p: any) =>
      typeof p === 'string'
        ? { number: p, source: 'unknown', label: 'Necunoscut' }
        : { number: p.number || '', source: p.source || 'unknown', label: p.label || '' }
    )
  })

  const addPhone = () => setPhones([...phones, { number: '', source: 'unknown', label: '' }])
  const removePhone = (i: number) => setPhones(phones.filter((_, j) => j !== i))
  const updatePhone = (i: number, field: string, value: string) => {
    const next = [...phones]
    ;(next[i] as any)[field] = value
    // Auto-set label from source
    if (field === 'source') {
      const opt = SOURCE_OPTIONS.find(o => o.value === value)
      if (opt) next[i].label = opt.label
    }
    setPhones(next)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus(null)
    try {
      // 1. Save project metadata
      const updatedMeta = {
        ...meta,
        posthogProjectId: posthogId || undefined,
        gscSiteUrl: gscUrl || undefined,
        telnyxPhoneNumbers: phones.filter(p => p.number.trim()),
        wpUrl: wpUrl || undefined,
        wpUsername: wpUsername || undefined,
        wpAppPassword: wpAppPassword || undefined,
      }
      const projRes = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: updatedMeta }),
      })
      const projData = await projRes.json()

      // 2. Save client fields (Google Ads ID, GA4, GSC)
      if (project.client?.id) {
        await fetch(`/api/clients/${project.client.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleAdsCustomerId: adsCustomerId || null,
            ga4PropertyId: ga4PropertyId || null,
            gscSiteUrl: gscUrl || null,
          }),
        })
      }

      if (projData.data) onProjectUpdate(projData.data)
      setSaveStatus('✅ Salvat cu succes!')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err) {
      setSaveStatus('❌ Eroare la salvare')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">⚙️ Setări Integrări</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configurează conexiunile cu serviciile externe</p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus && <span className="text-xs text-muted-foreground">{saveStatus}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {saving ? 'Se salvează...' : 'Salvează'}
          </button>
        </div>
      </div>

      {/* PostHog */}
      <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <h3 className="text-sm font-semibold text-foreground">PostHog</h3>
          <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">Analytics</span>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Project ID</label>
          <input
            type="text"
            value={posthogId}
            onChange={e => setPosthogId(e.target.value)}
            placeholder="ex: 118671"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <p className="text-[10px] text-muted-foreground mt-1">ID-ul proiectului din PostHog (Settings → Project → Project API Key)</p>
        </div>
      </div>

      {/* Google Search Console */}
      <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🔍</span>
          <h3 className="text-sm font-semibold text-foreground">Google Search Console</h3>
          <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">SEO</span>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Site URL</label>
          <input
            type="text"
            value={gscUrl}
            onChange={e => setGscUrl(e.target.value)}
            placeholder="ex: sc-domain:debitare-plasma.ro"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Format: <code className="bg-muted/50 px-1 rounded">sc-domain:exemplu.ro</code> sau <code className="bg-muted/50 px-1 rounded">https://exemplu.ro/</code></p>
        </div>
      </div>

      {/* WordPress */}
      <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📝</span>
          <h3 className="text-sm font-semibold text-foreground">WordPress</h3>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">CMS</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Site URL</label>
            <input
              type="text"
              value={wpUrl}
              onChange={e => setWpUrl(e.target.value)}
              placeholder="ex: https://domeniu.ro"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Username</label>
              <input
                type="text"
                value={wpUsername}
                onChange={e => setWpUsername(e.target.value)}
                placeholder="ex: admin"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Application Password</label>
              <input
                type="password"
                value={wpAppPassword}
                onChange={e => setWpAppPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Generată din Users → Profile → Application Passwords</p>
            </div>
          </div>
        </div>
      </div>

      {/* Google Ads */}
      <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📢</span>
          <h3 className="text-sm font-semibold text-foreground">Google Ads</h3>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">Ads</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Customer ID</label>
            <input
              type="text"
              value={adsCustomerId}
              onChange={e => setAdsCustomerId(e.target.value)}
              placeholder="ex: 4111955891"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Fără cratime (10 cifre)</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">GA4 Property ID</label>
            <input
              type="text"
              value={ga4PropertyId}
              onChange={e => setGa4PropertyId(e.target.value)}
              placeholder="ex: properties/123456789"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Opțional — pentru integrare viitoare GA4</p>
          </div>
        </div>
      </div>

      {/* Telnyx Call Tracking */}
      <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📞</span>
            <h3 className="text-sm font-semibold text-foreground">Telnyx — Call Tracking</h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Apeluri</span>
          </div>
          <button
            onClick={addPhone}
            className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Plus size={12} /> Adaugă Număr
          </button>
        </div>

        {phones.length === 0 ? (
          <div className="text-center py-6">
            <Phone className="mx-auto mb-2 text-muted-foreground" size={24} />
            <p className="text-xs text-muted-foreground">Niciun număr configureat.</p>
            <p className="text-[10px] text-muted-foreground mt-1">Adaugă numere Telnyx pentru a activa call tracking.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_150px_auto] gap-2 text-[10px] text-muted-foreground uppercase font-medium px-1">
              <span>Număr Telefon</span>
              <span>Sursă Trafic (DNI)</span>
              <span className="w-8"></span>
            </div>
            {phones.map((phone, i) => (
              <div key={i} className="grid grid-cols-[1fr_150px_auto] gap-2 items-center">
                <input
                  type="text"
                  value={phone.number}
                  onChange={e => updatePhone(i, 'number', e.target.value)}
                  placeholder="+40316060024"
                  className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <select
                  value={phone.source}
                  onChange={e => updatePhone(i, 'source', e.target.value)}
                  className="px-2 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none"
                >
                  {SOURCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => removePhone(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <strong>💡 DNI (Dynamic Number Insertion):</strong> Asignează numere diferite per sursă de trafic. 
            Exemplu: un număr pentru Google Ads, altul pentru trafic organic. Agency OS va atribui automat 
            fiecare apel la sursa corespunzătoare.
          </p>
        </div>
      </div>

      {/* Current metadata preview */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <details>
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            🔧 Metadata JSON (debug)
          </summary>
          <pre className="mt-3 text-[10px] text-muted-foreground bg-background rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
