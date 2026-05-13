"use client"

import { useState, useEffect } from "react"
import { useBusinessLine } from "@/components/business-line-context"
import {
  LayoutDashboard, Users, Megaphone, Send, Target, Filter,
  TrendingUp, Eye, MousePointerClick, UserX, FileText,
  ArrowUpRight, ArrowDownRight, BarChart3, Activity,
} from "lucide-react"
import Link from "next/link"

interface DashboardData {
  kpis: {
    totalContacts: number
    optedOutContacts: number
    totalSegments: number
    totalTemplates: number
    activeCampaigns: number
    totalCampaigns: number
    totalSent: number
    totalOpened: number
    totalConverted: number
    openRate: number
    conversionRate: number
  }
  recentCampaigns: any[]
  pipelineStats: { status: string; count: number }[]
  recentActivity: any[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-cyan-100 text-cyan-700",
  opened: "bg-amber-100 text-amber-700",
  interested: "bg-green-100 text-green-700",
  converted: "bg-emerald-100 text-emerald-700",
  draft: "bg-gray-100 text-gray-600",
  running: "bg-blue-100 text-blue-700",
  scheduled: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
}

const CHANNEL_ICONS: Record<string, string> = {
  sms: "📱",
  email: "📧",
  linkedin: "💼",
  facebook: "📘",
  instagram: "📸",
  tiktok: "🎵",
}

export default function MarketingDashboardPage() {
  const { activeLineId, activeLine } = useBusinessLine()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = activeLineId !== "all" ? `?businessLine=${activeLineId}` : ""
    fetch(`/api/marketing/dashboard${params}`)
      .then(r => r.json())
      .then(res => {
        setData(res.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeLineId])

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const kpis = data?.kpis

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Marketing Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Campanii, segmente și tracking pentru {activeLine?.name || "toate BL-urile"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/marketing/campaigns"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" /> Campanie Nouă
          </Link>
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Users} label="Contacte Active"
          value={kpis?.totalContacts || 0}
          subtitle={`${kpis?.optedOutContacts || 0} opt-out`}
          color="text-blue-600" bg="bg-blue-50"
        />
        <KPICard
          icon={Megaphone} label="Campanii Active"
          value={kpis?.activeCampaigns || 0}
          subtitle={`${kpis?.totalCampaigns || 0} total`}
          color="text-purple-600" bg="bg-purple-50"
        />
        <KPICard
          icon={Filter} label="Segmente"
          value={kpis?.totalSegments || 0}
          color="text-indigo-600" bg="bg-indigo-50"
        />
        <KPICard
          icon={FileText} label="Șabloane"
          value={kpis?.totalTemplates || 0}
          color="text-cyan-600" bg="bg-cyan-50"
        />
      </div>

      {/* KPI Cards Row 2 — Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Send} label="Total Trimise"
          value={kpis?.totalSent || 0}
          color="text-blue-600" bg="bg-blue-50"
        />
        <KPICard
          icon={Eye} label="LP Deschise"
          value={kpis?.totalOpened || 0}
          subtitle={`${kpis?.openRate || 0}% open rate`}
          color="text-amber-600" bg="bg-amber-50"
          trend={kpis?.openRate ? (kpis.openRate > 15 ? "up" : "down") : undefined}
        />
        <KPICard
          icon={MousePointerClick} label="Conversii"
          value={kpis?.totalConverted || 0}
          subtitle={`${kpis?.conversionRate || 0}% conv. rate`}
          color="text-green-600" bg="bg-green-50"
          trend={kpis?.conversionRate ? (kpis.conversionRate > 5 ? "up" : "down") : undefined}
        />
        <KPICard
          icon={UserX} label="Opt-out"
          value={kpis?.optedOutContacts || 0}
          color="text-red-500" bg="bg-red-50"
        />
      </div>

      {/* Pipeline + Recent Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Distribution */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" /> Pipeline Marketing
          </h3>
          {data?.pipelineStats && data.pipelineStats.length > 0 ? (
            <div className="space-y-3">
              {data.pipelineStats.map(stat => {
                const total = data.pipelineStats.reduce((s, p) => s + p.count, 0)
                const pct = total > 0 ? ((stat.count / total) * 100).toFixed(0) : '0'
                return (
                  <div key={stat.status} className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${STATUS_COLORS[stat.status] || 'bg-gray-100 text-gray-600'}`}>
                      {stat.status}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-12 text-right">
                      {stat.count}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nicio campanie trimisă încă. Creează prima ta campanie!
            </p>
          )}
        </div>

        {/* Recent Campaigns */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" /> Campanii Recente
          </h3>
          {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
            <div className="space-y-2">
              {data.recentCampaigns.slice(0, 5).map(c => (
                <Link
                  key={c.id}
                  href={`/marketing/campaigns/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{CHANNEL_ICONS[c.channel] || '📢'}</span>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.totalSent} trimise · {c.totalOpened} deschise · {c.totalConverted} conversii
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${STATUS_COLORS[c.status] || ''}`}>
                    {c.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nicio campanie creată. <Link href="/marketing/campaigns" className="text-primary underline">Începe acum</Link>
            </p>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" /> Activitate Recentă
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {data.recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${STATUS_COLORS[a.status] || ''}`}>
                  {a.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.lead?.companyName}</p>
                  <p className="text-[11px] text-muted-foreground">{a.campaign?.name} · {a.campaign?.channel}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(a.createdAt).toLocaleDateString('ro-RO')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          href="/marketing/segments"
          icon={Filter} title="Creează Segment"
          description="Definește un grup de lead-uri pe baza filtrelor"
          color="from-indigo-500 to-blue-600"
        />
        <QuickAction
          href="/marketing/campaigns"
          icon={Send} title="Lansează Campanie"
          description="Trimite SMS sau Email către un segment"
          color="from-purple-500 to-indigo-600"
        />
        <QuickAction
          href="/marketing/pipeline"
          icon={Target} title="Pipeline Marketing"
          description="Urmărește lead-urile prin funnel-ul de conversie"
          color="from-green-500 to-emerald-600"
        />
      </div>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, subtitle, color, bg, trend }: {
  icon: any; label: string; value: number | string; subtitle?: string;
  color: string; bg: string; trend?: "up" | "down"
}) {
  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {trend && (
          trend === "up"
            ? <ArrowUpRight className="w-4 h-4 text-green-500 mb-1" />
            : <ArrowDownRight className="w-4 h-4 text-red-400 mb-1" />
        )}
      </div>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}

function QuickAction({ href, icon: Icon, title, description, color }: {
  href: string; icon: any; title: string; description: string; color: string
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden bg-card border rounded-xl p-5 hover:shadow-lg transition-all"
    >
      <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </Link>
  )
}
