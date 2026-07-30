"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Activity,
  Globe,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Search,
  BarChart3,
  Gauge,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  Server,
  Shield,
  Smartphone,
  Monitor,
  Bell,
  ExternalLink,
  HardDrive,
  Cpu,
  Lock,
  Mail,
  Container,
  TerminalSquare,
} from "lucide-react"

/* ============================================================
   Types
   ============================================================ */

interface UptimeDomain {
  domain: string
  clientId: string
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

interface Incident {
  domain: string
  startedAt: string
  resolvedAt: string | null
  durationMin: number | null
  cause: string
  clientName: string
}

interface MonitoringData {
  uptime: {
    domains: UptimeDomain[]
    total: number
    up: number
    down: number
    slow: number
    uptimePercent: number
  }
  incidents: Incident[]
  system?: {
    disk: { filesystem: string; size: string; used: string; available: string; usedPercent: number }
    ram: { totalGb: number; usedGb: number; availableGb: number; usedPercent: number; swapUsedPercent: number }
    ssl: Array<{ domain: string; validUntil: string; daysRemaining: number; isExpiring: boolean; isExpired: boolean; error?: string }>
    docker: { total: number; running: number; unhealthy: Array<{ name: string; status: string; isHealthy: boolean }> }
    pm2: Array<{ name: string; id: number; status: string; restarts: number; memory: string; cpu: string; uptime: string }>
    email: { smtpResponsive: boolean; imapResponsive: boolean; webmailResponsive: boolean; mailcowApiResponsive: boolean; queueSize: number }
  }
}

interface PageSpeedData {
  domain: string
  performance: number
  accessibility: number
  seo: number
  bestPractices: number
  lcp: number
  cls: string
  tbt: number
  error?: string
}

/* ============================================================
   Score helpers
   ============================================================ */

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-400"
  if (score >= 50) return "text-amber-400"
  return "text-red-400"
}

function scoreBg(score: number): string {
  if (score >= 90) return "bg-emerald-500/20 border-emerald-500/30"
  if (score >= 50) return "bg-amber-500/20 border-amber-500/30"
  return "bg-red-500/20 border-red-500/30"
}

function scoreRing(score: number): string {
  if (score >= 90) return "stroke-emerald-400"
  if (score >= 50) return "stroke-amber-400"
  return "stroke-red-400"
}

function responseColor(ms: number): string {
  if (ms <= 500) return "text-emerald-400"
  if (ms <= 2000) return "text-amber-400"
  return "text-red-400"
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "acum"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

/* ============================================================
   Score Ring SVG (Circular Progress)
   ============================================================ */

function ScoreRing({ score, size = 64, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className="text-border/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          className={scoreRing(score)}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-sm font-bold tabular-nums", scoreColor(score))}>{score}</span>
        {label && <span className="text-[8px] text-muted-foreground leading-none">{label}</span>}
      </div>
    </div>
  )
}

/* ============================================================
   Status Badge
   ============================================================ */

function StatusBadge({ isUp, responseMs }: { isUp: boolean; responseMs: number }) {
  if (!isUp) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
        <WifiOff size={10} /> DOWN
      </span>
    )
  }
  if (responseMs > 3000) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <Clock size={10} /> SLOW
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 size={10} /> UP
    </span>
  )
}

/* ============================================================
   Hero Stats Row
   ============================================================ */

function HeroStat({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 bg-surface/50 backdrop-blur rounded-xl border border-border px-4 py-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/* ============================================================
   Main Page
   ============================================================ */

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [pageSpeed, setPageSpeed] = useState<PageSpeedData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [psiLoading, setPsiLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<"uptime" | "system" | "performance" | "marketing">("uptime")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/monitoring/overview")
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastRefresh(new Date())
      }
    } catch (err) {
      console.error("Failed to fetch monitoring data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPageSpeed = useCallback(async () => {
    setPsiLoading(true)
    try {
      const secret = "asns-uptime-2026"
      const res = await fetch(`/api/monitoring/pagespeed?secret=${secret}&strategy=mobile`)
      if (res.ok) {
        const json = await res.json()
        setPageSpeed(json.results || [])
      }
    } catch (err) {
      console.error("Failed to fetch PageSpeed:", err)
    } finally {
      setPsiLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchData, 120000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Se încarcă datele de monitorizare...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const tabs = [
    { id: "uptime" as const, label: "Infrastructure", icon: <Server size={14} /> },
    { id: "system" as const, label: "System", icon: <HardDrive size={14} /> },
    { id: "performance" as const, label: "Performance", icon: <Gauge size={14} /> },
    { id: "marketing" as const, label: "Marketing", icon: <BarChart3 size={14} /> },
  ]

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="text-primary" size={24} />
            Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Infrastructure, performance & marketing — real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-muted-foreground">
              Actualizat {timeAgo(lastRefresh.toISOString())}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:bg-surface transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Hero Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HeroStat
          icon={<Globe size={20} />}
          value={data.uptime.total}
          label="Site-uri monitorizate"
          color="bg-primary/10 text-primary"
        />
        <HeroStat
          icon={<CheckCircle2 size={20} />}
          value={`${data.uptime.uptimePercent}%`}
          label="Uptime global"
          color={data.uptime.uptimePercent >= 99 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}
        />
        <HeroStat
          icon={data.uptime.down > 0 ? <AlertTriangle size={20} /> : <Shield size={20} />}
          value={data.uptime.down}
          label={data.uptime.down > 0 ? "Site-uri DOWN" : "Toate online"}
          color={data.uptime.down > 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}
        />
        <HeroStat
          icon={<Bell size={20} />}
          value={data.incidents.filter(i => !i.resolvedAt).length}
          label="Incidente active"
          color={data.incidents.some(i => !i.resolvedAt) ? "bg-red-500/10 text-red-400" : "bg-muted/50 text-muted-foreground"}
        />
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 bg-surface/50 p-1 rounded-xl border border-border w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "uptime" && <UptimeTab data={data} />}
      {activeTab === "system" && <SystemTab system={data.system} />}
      {activeTab === "performance" && (
        <PerformanceTab
          pageSpeed={pageSpeed}
          loading={psiLoading}
          onRunCheck={fetchPageSpeed}
        />
      )}
      {activeTab === "marketing" && <MarketingTab />}
    </div>
  )
}

/* ============================================================
   TAB 1: Infrastructure / Uptime
   ============================================================ */

function UptimeTab({ data }: { data: MonitoringData }) {
  return (
    <div className="space-y-4">
      {/* Domain Grid */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe size={16} className="text-primary" />
            Status Site-uri
          </h2>
          <span className="text-[10px] text-muted-foreground">
            {data.uptime.up}/{data.uptime.total} online
          </span>
        </div>

        <div className="divide-y divide-border">
          {data.uptime.domains.map(domain => (
            <div
              key={domain.domain}
              className={cn(
                "px-4 py-3 flex items-center justify-between gap-3 transition-colors",
                !domain.isUp && "bg-red-500/5"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  domain.isUp ? (domain.responseMs > 3000 ? "bg-amber-400" : "bg-emerald-400") : "bg-red-400 animate-pulse"
                )} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://${domain.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                    >
                      {domain.domain}
                    </a>
                    <ExternalLink size={10} className="text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{domain.clientName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className={cn("text-sm font-mono font-semibold tabular-nums", responseColor(domain.responseMs))}>
                    {domain.responseMs < 1000
                      ? `${domain.responseMs}ms`
                      : `${(domain.responseMs / 1000).toFixed(1)}s`}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    avg {domain.avgResponseMs < 1000
                      ? `${domain.avgResponseMs}ms`
                      : `${(domain.avgResponseMs / 1000).toFixed(1)}s`}
                  </p>
                </div>

                {domain.uptimePercent24h !== null && (
                  <div className="text-right w-12">
                    <p className={cn(
                      "text-xs font-semibold tabular-nums",
                      domain.uptimePercent24h >= 99.5 ? "text-emerald-400" : domain.uptimePercent24h >= 95 ? "text-amber-400" : "text-red-400"
                    )}>
                      {domain.uptimePercent24h}%
                    </p>
                    <p className="text-[9px] text-muted-foreground">24h</p>
                  </div>
                )}

                <StatusBadge isUp={domain.isUp} responseMs={domain.responseMs} />
              </div>
            </div>
          ))}

          {data.uptime.domains.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Niciun domeniu monitorizat. Adaugă website-uri la clienți în CRM.
            </div>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Incidente recente
          </h2>
        </div>

        <div className="divide-y divide-border">
          {data.incidents.slice(0, 10).map((inc, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                  inc.resolvedAt ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                )}>
                  {inc.resolvedAt ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{inc.domain}</p>
                  <p className="text-[10px] text-muted-foreground">{inc.cause}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">{timeAgo(inc.startedAt)}</p>
                {inc.resolvedAt && inc.durationMin !== null && (
                  <p className="text-[10px] text-muted-foreground/60">{inc.durationMin} min downtime</p>
                )}
                {!inc.resolvedAt && (
                  <p className="text-[10px] text-red-400 font-semibold">ACTIV</p>
                )}
              </div>
            </div>
          ))}

          {data.incidents.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              ✨ Niciun incident înregistrat — totul funcționează perfect!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   TAB 2: Performance (PageSpeed)
   ============================================================ */

function PerformanceTab({
  pageSpeed,
  loading,
  onRunCheck,
}: {
  pageSpeed: PageSpeedData[] | null
  loading: boolean
  onRunCheck: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Run PageSpeed Button */}
      <div className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Gauge size={16} className="text-primary" />
            PageSpeed Insights
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Core Web Vitals & scor de performanță — Google Lighthouse
          </p>
        </div>
        <button
          onClick={onRunCheck}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {loading ? "Se verifică..." : "Rulează PageSpeed"}
        </button>
      </div>

      {/* Results */}
      {loading && !pageSpeed && (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Se analizează site-urile... (poate dura 1-2 min)</p>
        </div>
      )}

      {pageSpeed && pageSpeed.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pageSpeed.map(ps => (
            <div key={ps.domain} className={cn(
              "bg-surface rounded-xl border p-4 transition-all",
              ps.error ? "border-red-500/20" : "border-border hover:border-primary/20"
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <a
                    href={`https://${ps.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate flex items-center gap-1"
                  >
                    {ps.domain} <ExternalLink size={10} className="text-muted-foreground" />
                  </a>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Smartphone size={10} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Mobile</span>
                  </div>
                </div>
                <ScoreRing score={ps.performance} size={56} />
              </div>

              {ps.error ? (
                <p className="text-xs text-red-400">⚠ {ps.error}</p>
              ) : (
                <>
                  {/* Category scores */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "A11y", score: ps.accessibility },
                      { label: "SEO", score: ps.seo },
                      { label: "Best P.", score: ps.bestPractices },
                    ].map(cat => (
                      <div key={cat.label} className="text-center">
                        <p className={cn("text-xs font-bold tabular-nums", scoreColor(cat.score))}>
                          {cat.score}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{cat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Core Web Vitals */}
                  <div className="border-t border-border pt-2 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Core Web Vitals</p>
                    <div className="grid grid-cols-3 gap-2">
                      <VitalPill label="LCP" value={`${(ps.lcp / 1000).toFixed(1)}s`} thresholds={[2500, 4000]} raw={ps.lcp} />
                      <VitalPill label="CLS" value={ps.cls} thresholds={[0.1, 0.25]} raw={parseFloat(ps.cls)} />
                      <VitalPill label="TBT" value={`${ps.tbt}ms`} thresholds={[200, 600]} raw={ps.tbt} />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!pageSpeed && !loading && (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <Gauge size={32} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Apasă "Rulează PageSpeed" pentru a analiza site-urile</p>
        </div>
      )}
    </div>
  )
}

function VitalPill({ label, value, thresholds, raw }: {
  label: string
  value: string
  thresholds: [number, number]
  raw: number
}) {
  const color = raw <= thresholds[0] ? "text-emerald-400" : raw <= thresholds[1] ? "text-amber-400" : "text-red-400"
  const bg = raw <= thresholds[0] ? "bg-emerald-500/10" : raw <= thresholds[1] ? "bg-amber-500/10" : "bg-red-500/10"

  return (
    <div className={cn("rounded-lg px-2 py-1.5 text-center", bg)}>
      <p className={cn("text-xs font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  )
}

/* ============================================================
   TAB 3: Marketing KPIs
   ============================================================ */

function MarketingTab() {
  const [gscData, setGscData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Will load GSC/Ads/PostHog data via APIs
    // For now, show placeholder with instructions
  }, [])

  return (
    <div className="space-y-4">
      {/* GSC Section */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Search size={16} className="text-blue-400" />
          Google Search Console
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MarketingMetric icon={<MousePointerClick size={14} />} label="Clicks" value="—" change={null} color="text-blue-400" />
          <MarketingMetric icon={<Eye size={14} />} label="Impressions" value="—" change={null} color="text-purple-400" />
          <MarketingMetric icon={<ArrowUpRight size={14} />} label="CTR" value="—" change={null} color="text-emerald-400" />
          <MarketingMetric icon={<BarChart3 size={14} />} label="Avg Position" value="—" change={null} color="text-amber-400" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Date disponibile per client în pagina de proiect → KPIs
        </p>
      </div>

      {/* Google Ads Section */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-green-400" />
          Google Ads
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MarketingMetric icon={<BarChart3 size={14} />} label="Spend" value="—" change={null} color="text-green-400" />
          <MarketingMetric icon={<MousePointerClick size={14} />} label="Clicks" value="—" change={null} color="text-blue-400" />
          <MarketingMetric icon={<TrendingUp size={14} />} label="Conversions" value="—" change={null} color="text-emerald-400" />
          <MarketingMetric icon={<Gauge size={14} />} label="CPC" value="—" change={null} color="text-amber-400" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Date agregate din toate conturile de Ads active
        </p>
      </div>

      {/* PostHog Section */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Activity size={16} className="text-orange-400" />
          PostHog Analytics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MarketingMetric icon={<Eye size={14} />} label="Sessions" value="—" change={null} color="text-orange-400" />
          <MarketingMetric icon={<Clock size={14} />} label="Avg Duration" value="—" change={null} color="text-purple-400" />
          <MarketingMetric icon={<AlertTriangle size={14} />} label="Errors" value="—" change={null} color="text-red-400" />
          <MarketingMetric icon={<Gauge size={14} />} label="Health Score" value="—" change={null} color="text-emerald-400" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Date agregate din proiectele PostHog configurate
        </p>
      </div>
    </div>
  )
}

function MarketingMetric({
  icon,
  label,
  value,
  change,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  change: number | null
  color: string
}) {
  return (
    <div className="bg-muted/30 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
      {change !== null && (
        <p className={cn("text-[10px] font-semibold", change >= 0 ? "text-emerald-400" : "text-red-400")}>
          {change >= 0 ? "+" : ""}{change}%
        </p>
      )}
    </div>
  )
}

/* ============================================================
   TAB: System Health
   ============================================================ */

function SystemTab({ system }: { system: MonitoringData["system"] }) {
  if (!system) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center">
        <Server size={32} className="text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Datele de sistem se încarcă...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Disk & RAM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Disk */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <HardDrive size={16} className="text-blue-400" />
            Disk
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">{system.disk.used} / {system.disk.size}</span>
                <span className={cn("text-xs font-bold tabular-nums",
                  system.disk.usedPercent >= 95 ? "text-red-400" : system.disk.usedPercent >= 85 ? "text-amber-400" : "text-emerald-400"
                )}>{system.disk.usedPercent}%</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all",
                    system.disk.usedPercent >= 95 ? "bg-red-500" : system.disk.usedPercent >= 85 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${system.disk.usedPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Disponibil: {system.disk.available}</p>
            </div>
          </div>
        </div>

        {/* RAM */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Cpu size={16} className="text-purple-400" />
            RAM
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">{system.ram.usedGb}Gi / {system.ram.totalGb}Gi</span>
                <span className={cn("text-xs font-bold tabular-nums",
                  system.ram.usedPercent >= 90 ? "text-red-400" : system.ram.usedPercent >= 75 ? "text-amber-400" : "text-emerald-400"
                )}>{system.ram.usedPercent}%</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all",
                    system.ram.usedPercent >= 90 ? "bg-red-500" : system.ram.usedPercent >= 75 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${system.ram.usedPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Disponibil: {system.ram.availableGb}Gi • Swap: {system.ram.swapUsedPercent}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Email Health */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Mail size={16} className="text-cyan-400" />
          Email (mail.asns.ro)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <ServicePill label="SMTP" isUp={system.email.smtpResponsive} />
          <ServicePill label="IMAP" isUp={system.email.imapResponsive} />
          <ServicePill label="Webmail" isUp={system.email.webmailResponsive} />
          <ServicePill label="API" isUp={system.email.mailcowApiResponsive} />
          <div className={cn("rounded-lg px-3 py-2 text-center",
            system.email.queueSize > 50 ? "bg-red-500/10" : "bg-emerald-500/10"
          )}>
            <p className={cn("text-xs font-bold tabular-nums",
              system.email.queueSize > 50 ? "text-red-400" : "text-emerald-400"
            )}>{system.email.queueSize}</p>
            <p className="text-[9px] text-muted-foreground">Queue</p>
          </div>
        </div>
      </div>

      {/* SSL Certificates */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lock size={16} className="text-green-400" />
            Certificate SSL
          </h3>
        </div>
        <div className="divide-y divide-border">
          {system.ssl.map(cert => (
            <div key={cert.domain} className={cn(
              "px-4 py-2.5 flex items-center justify-between",
              cert.isExpired && "bg-red-500/5",
              cert.isExpiring && !cert.isExpired && "bg-amber-500/5"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full",
                  cert.isExpired ? "bg-red-400" : cert.isExpiring ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                )} />
                <span className="text-xs font-medium text-foreground">{cert.domain}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground">{cert.validUntil}</span>
                <span className={cn("text-xs font-semibold tabular-nums",
                  cert.isExpired ? "text-red-400" : cert.daysRemaining < 14 ? "text-amber-400" : cert.daysRemaining < 30 ? "text-blue-400" : "text-emerald-400"
                )}>
                  {cert.isExpired ? "EXPIRAT" : `${cert.daysRemaining}d`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Docker & PM2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Docker */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Container size={16} className="text-blue-400" />
            Docker
            <span className="text-[10px] text-muted-foreground font-normal ml-auto">
              {system.docker.running}/{system.docker.total} running
            </span>
          </h3>
          {system.docker.unhealthy.length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> Toate containerele sunt sănătoase
            </p>
          ) : (
            <div className="space-y-1">
              {system.docker.unhealthy.slice(0, 5).map(c => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-foreground font-mono text-[10px] truncate">{c.name}</span>
                  <span className="text-muted-foreground text-[9px] ml-auto">{c.status.substring(0, 20)}</span>
                </div>
              ))}
              {system.docker.unhealthy.length > 5 && (
                <p className="text-[10px] text-muted-foreground">+{system.docker.unhealthy.length - 5} altele</p>
              )}
            </div>
          )}
        </div>

        {/* PM2 */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <TerminalSquare size={16} className="text-green-400" />
            PM2 Processes
          </h3>
          <div className="space-y-1.5">
            {system.pm2.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <div className={cn("w-1.5 h-1.5 rounded-full",
                  p.status === "online" ? "bg-emerald-400" : p.status === "stopped" ? "bg-gray-400" : "bg-red-400"
                )} />
                <span className="text-foreground truncate flex-1">{p.name}</span>
                <span className="text-muted-foreground text-[10px] tabular-nums">{p.memory}</span>
                <span className={cn("text-[10px] font-semibold tabular-nums",
                  p.status === "online" ? "text-emerald-400" : p.status === "stopped" ? "text-gray-400" : "text-red-400"
                )}>{p.status}</span>
              </div>
            ))}
            {system.pm2.length === 0 && (
              <p className="text-xs text-muted-foreground">Nu sunt procese PM2</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ServicePill({ label, isUp }: { label: string; isUp: boolean }) {
  return (
    <div className={cn("rounded-lg px-3 py-2 text-center",
      isUp ? "bg-emerald-500/10" : "bg-red-500/10"
    )}>
      <p className={cn("text-xs font-bold", isUp ? "text-emerald-400" : "text-red-400")}>
        {isUp ? "✓" : "✗"}
      </p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  )
}
