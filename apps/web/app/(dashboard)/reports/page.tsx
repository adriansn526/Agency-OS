"use client"

import { useEffect, useState, useCallback } from "react"
import {
  BarChart3, Plus, Copy, Send, Sparkles, ExternalLink, Eye,
  Loader2, RefreshCcw, Link2, ChevronDown, Trophy, Megaphone,
  Search, Activity, Shield, Globe, TrendingUp, X, Mail, Users,
  FileText, Paperclip, Settings2, Calendar, Phone
} from "lucide-react"
import type { DomainReportData } from "@/lib/reports/aggregator"
import { cn } from "@/lib/utils"
import {
  AdsDeviceBreakdown,
  AdsImpressionShare,
  AdsKeywordQuality,
  AdsTimeAnalysis,
  AdsAdGroupPerformance,
} from "@/components/report/report-ads-extended"

// ─── Inline Report Widgets (Admin-only, render aggregated data) ───

function HeroKpis({ data }: { data: DomainReportData }) {
  const s = data.summary
  const ads = data.googleAds?.kpis
  const seo = data.seo?.kpis
  const analytics = data.analytics?.traffic

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <KpiCard
        icon={<Trophy size={16} className="text-amber-500" />}
        label="Conversii"
        value={ads?.conversions?.toLocaleString("ro-RO") || "0"}
        sublabel={ads ? `ROAS: ${ads.roas}x` : undefined}
        color="text-amber-600"
      />
      <KpiCard
        icon={<Megaphone size={16} className="text-blue-500" />}
        label="Click-uri Totale"
        value={((ads?.clicks || 0) + (seo?.clicks || 0)).toLocaleString("ro-RO")}
        sublabel={`Ads: ${ads?.clicks?.toLocaleString("ro-RO") || "0"} · SEO: ${seo?.clicks?.toLocaleString("ro-RO") || "0"}`}
        color="text-blue-600"
      />
      <KpiCard
        icon={<Globe size={16} className="text-violet-500" />}
        label="Sesiuni"
        value={analytics?.sessions?.toLocaleString("ro-RO") || s.totalSessions.toLocaleString("ro-RO")}
        sublabel={analytics ? `Bounce: ${analytics.bounceRate}%` : undefined}
        color="text-violet-600"
      />
      <KpiCard
        icon={<Phone size={16} className="text-orange-500" />}
        label="Apeluri"
        value={data.telnyx?.totalCalls?.toLocaleString("ro-RO") || "—"}
        sublabel={data.telnyx ? `Durată medie: ${data.telnyx.avgDuration}s` : undefined}
        color="text-orange-600"
      />
      <KpiCard
        icon={<Shield size={16} className="text-emerald-500" />}
        label="Uptime"
        value={data.uptime ? `${data.uptime.percent}%` : "—"}
        sublabel={data.uptime ? `Resp: ${data.uptime.avgResponseMs}ms` : undefined}
        color="text-emerald-600"
      />
    </div>
  )
}

function KpiCard({ icon, label, value, sublabel, color }: {
  icon: React.ReactNode; label: string; value: string | number; sublabel?: string; color?: string
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-extrabold ${color || "text-foreground"} tracking-tight`}>{value}</p>
      {sublabel && <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>}
    </div>
  )
}

// ─── Google Ads Section ───

function AdsSection({ data, showCost = true }: { data: NonNullable<DomainReportData["googleAds"]>; showCost?: boolean }) {
  const k = data.kpis
  return (
    <details open className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
      <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors select-none">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Megaphone size={16} className="text-blue-500" />
        </div>
        <span className="font-bold text-sm text-foreground">Google Ads</span>
        <span className="ml-auto text-xs text-muted-foreground">{k.conversions} conversii · {k.clicks.toLocaleString("ro-RO")} click-uri</span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </summary>
      <div className="border-t border-border">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-5">
          <MiniKpi label="Impresii" value={k.impressions.toLocaleString("ro-RO")} />
          <MiniKpi label="Click-uri" value={k.clicks.toLocaleString("ro-RO")} />
          <MiniKpi label="CTR" value={`${k.ctr}%`} />
          {showCost && <MiniKpi label="Spend" value={`€${k.spend.toLocaleString("ro-RO")}`} />}
          {showCost && <MiniKpi label="CPC" value={`€${k.cpc}`} />}
          <MiniKpi label="Conversii" value={k.conversions.toLocaleString("ro-RO")} />
          <MiniKpi label="Valoare Conv." value={`€${k.conversionsValue.toLocaleString("ro-RO")}`} />
          <MiniKpi label="Rată Conversie" value={`${k.conversionRate}%`} />
          <MiniKpi label="ROAS" value={`${k.roas}x`} />
        </div>

        {/* Campaigns Table */}
        {data.campaigns.length > 0 && (
          <div className="border-t border-border/50">
            <p className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Campanii</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-5 py-2 text-muted-foreground font-semibold">Campanie</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Click</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Conv.</th>
                    {showCost && <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Spend</th>}
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.slice(0, 10).map((c, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-5 py-2 font-medium text-foreground">{c.name}</td>
                      <td className="text-right px-3 py-2 text-foreground">{c.metrics.clicks?.toLocaleString("ro-RO")}</td>
                      <td className="text-right px-3 py-2 text-foreground">{c.metrics.conversions}</td>
                      {showCost && <td className="text-right px-3 py-2 text-foreground">€{c.metrics.spend?.toLocaleString("ro-RO")}</td>}
                      <td className="text-right px-3 py-2 text-foreground">{c.metrics.roas}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Conversion Breakdown */}
        {data.conversions.length > 0 && (
          <div className="border-t border-border/50">
            <p className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tip Conversii</p>
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              {data.conversions.slice(0, 8).map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 rounded-lg text-xs font-medium text-foreground border border-border/50">
                  {c.actionName}: <span className="font-bold">{c.allConversions}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  )
}

// ─── SEO Section ───

function SeoSection({ data }: { data: NonNullable<DomainReportData["seo"]> }) {
  const k = data.kpis
  const [seoTab, setSeoTab] = useState<'keywords' | 'recommendations' | 'pages'>('keywords')
  const analysis = data.seoAnalysis
  const pageKeywords = data.pageKeywords || []

  // Build page↔keyword map for pages tab
  const byPage = new Map<string, Array<{ query: string; clicks: number; impressions: number; position: number }>>()
  for (const pk of pageKeywords) {
    const short = pk.page?.replace(/https?:\/\/[^/]+/, '') || '/'
    if (!byPage.has(short)) byPage.set(short, [])
    byPage.get(short)!.push({ query: pk.query, clicks: pk.clicks, impressions: pk.impressions, position: pk.position })
  }
  const sortedPages = [...byPage.entries()].sort((a, b) => {
    const totalA = a[1].reduce((s, k) => s + k.clicks, 0)
    const totalB = b[1].reduce((s, k) => s + k.clicks, 0)
    return totalB - totalA
  })

  return (
    <details open className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
      <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors select-none">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
          <Search size={16} className="text-green-600" />
        </div>
        <span className="font-bold text-sm text-foreground">SEO (Search Console)</span>
        <span className="ml-auto text-xs text-muted-foreground">{k.clicks.toLocaleString("ro-RO")} click-uri · Poz. {k.position.toFixed(1)}</span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </summary>
      <div className="border-t border-border">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
          <MiniKpi label="Clickuri Organice" value={k.clicks.toLocaleString("ro-RO")} />
          <MiniKpi label="Impresii" value={k.impressions.toLocaleString("ro-RO")} />
          <MiniKpi label="CTR" value={`${(k.ctr * 100).toFixed(1)}%`} />
          <MiniKpi label="Poziție Medie" value={k.position.toFixed(1)} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 border-t border-border/50">
          {[
            { key: 'keywords' as const, label: '🔑 Top Keywords', count: data.topQueries.length },
            { key: 'recommendations' as const, label: '💡 Recomandări', count: analysis?.recommendations.length || 0 },
            { key: 'pages' as const, label: '🔗 Pagini ↔ Keywords', count: sortedPages.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={(e) => { e.preventDefault(); setSeoTab(t.key) }}
              className={cn(
                "px-4 py-2.5 text-[11px] font-semibold transition-colors border-b-2",
                seoTab === t.key
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {t.label} <span className="opacity-50 ml-1">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Tab: Top Keywords */}
        {seoTab === 'keywords' && data.topQueries.length > 0 && (
          <div className="border-t border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-5 py-2 text-muted-foreground font-semibold">Keyword</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Clickuri</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Impresii</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Poziție</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topQueries.slice(0, 15).map((q, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-5 py-2 font-medium text-foreground">{q.query}</td>
                      <td className="text-right px-3 py-2 text-foreground">{q.clicks}</td>
                      <td className="text-right px-3 py-2 text-muted-foreground">{q.impressions.toLocaleString("ro-RO")}</td>
                      <td className={cn("text-right px-3 py-2 font-medium",
                        q.position <= 3 ? 'text-green-400' : q.position <= 10 ? 'text-yellow-400' : 'text-red-400'
                      )}>{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: SEO Recommendations */}
        {seoTab === 'recommendations' && (
          <div className="border-t border-border/50 p-5 space-y-3">
            {!analysis || analysis.recommendations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nu sunt suficiente date pentru recomandări.</p>
            ) : (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <MiniKpi label="Pagini" value={String(analysis.summary.totalPages)} />
                  <MiniKpi label="Keywords" value={String(analysis.summary.totalKeywords)} />
                  <MiniKpi label="Canibalizare" value={String(analysis.summary.cannibalizationCount)} />
                  <MiniKpi label="Oportunități" value={String(analysis.summary.lowHangingFruitCount)} />
                </div>

                {analysis.recommendations.slice(0, 12).map((rec, i) => {
                  const isHigh = rec.severity === 'high'
                  const isMedium = rec.severity === 'medium'
                  return (
                    <div key={i} className={cn(
                      "rounded-lg p-3 border",
                      isHigh ? "bg-red-500/5 border-red-500/10" :
                      isMedium ? "bg-yellow-500/5 border-yellow-500/10" :
                      "bg-green-500/5 border-green-500/10"
                    )}>
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5",
                          isHigh ? "bg-red-500/10 text-red-400" :
                          isMedium ? "bg-yellow-500/10 text-yellow-400" :
                          "bg-green-500/10 text-green-400"
                        )}>
                          {isHigh ? 'Urgent' : isMedium ? 'Recomandat' : 'Sugestie'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{rec.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{rec.description}</p>
                          {rec.metrics && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(rec.metrics).map(([key, val]) => (
                                <span key={key} className="text-[9px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  {key}: <strong className="text-foreground">{val}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* Tab: Pages ↔ Keywords */}
        {seoTab === 'pages' && (
          <div className="border-t border-border/50 p-5 space-y-2">
            {sortedPages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nu sunt date de pagini ↔ keywords.</p>
            ) : (
              sortedPages.map(([page, keywords], i) => {
                const totalClicks = keywords.reduce((s, k) => s + k.clicks, 0)
                return (
                  <details key={i} className="border border-border/50 rounded-lg overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors">
                      <span className="text-xs font-medium text-foreground truncate max-w-[60%]" title={page}>{page}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                        {keywords.length} kw · <span className="text-primary font-medium">{totalClicks}</span> clicks
                      </span>
                    </summary>
                    <div className="px-4 py-2 bg-muted/10 border-t border-border/30">
                      <div className="flex flex-wrap gap-1.5">
                        {keywords.sort((a, b) => b.clicks - a.clicks).map((kw, j) => (
                          <span key={j} className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border",
                            kw.position <= 3 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            kw.position <= 10 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            'bg-muted text-muted-foreground border-border'
                          )} title={`Clicks: ${kw.clicks} | Impresii: ${kw.impressions}`}>
                            {kw.query}
                            <span className="opacity-60">#{kw.position.toFixed(0)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </details>
                )
              })
            )}
          </div>
        )}
      </div>
    </details>
  )
}

// ─── Analytics Section ───

function AnalyticsSection({ data }: { data: NonNullable<DomainReportData["analytics"]> }) {
  const t = data.traffic
  const maxPv = Math.max(...(data.dailyTraffic || []).map(d => d.pageviews), 1)

  return (
    <details open className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
      <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors select-none">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <BarChart3 size={16} className="text-violet-500" />
        </div>
        <span className="font-bold text-sm text-foreground">Website Analytics (PostHog)</span>
        <span className="ml-auto text-xs text-muted-foreground">{t.sessions.toLocaleString("ro-RO")} sesiuni · {t.uniqueVisitors.toLocaleString("ro-RO")} vizitatori</span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </summary>
      <div className="border-t border-border">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
          <MiniKpi label="Sesiuni" value={t.sessions.toLocaleString("ro-RO")} />
          <MiniKpi label="Vizitatori Unici" value={t.uniqueVisitors.toLocaleString("ro-RO")} />
          <MiniKpi label="Pageviews" value={t.pageviews.toLocaleString("ro-RO")} />
          <MiniKpi label="Bounce Rate" value={`${t.bounceRate}%`} />
        </div>

        {/* Daily Chart */}
        {data.dailyTraffic.length > 0 && (
          <div className="px-5 pb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trafic Zilnic</p>
            <div className="flex items-end gap-[2px] h-16">
              {data.dailyTraffic.map((d, i) => (
                <div
                  key={i}
                  title={`${d.date}: ${d.pageviews} pv`}
                  className="flex-1 rounded-t bg-gradient-to-t from-violet-500 to-violet-400 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ height: `${Math.max((d.pageviews / maxPv) * 100, 3)}%`, minHeight: 2 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Web Vitals */}
        {data.webVitals && (
          <div className="border-t border-border/50 p-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Core Web Vitals</p>
            <div className="flex gap-3 flex-wrap">
              <VitalBadge label="LCP" value={`${(data.webVitals.lcp / 1000).toFixed(1)}s`} status={data.webVitals.lcpStatus} />
              <VitalBadge label="CLS" value={data.webVitals.cls.toFixed(3)} status={data.webVitals.clsStatus} />
              <VitalBadge label="INP" value={`${data.webVitals.inp}ms`} status={data.webVitals.inpStatus} />
              <VitalBadge label="FCP" value={`${(data.webVitals.fcp / 1000).toFixed(1)}s`} status={data.webVitals.fcpStatus} />
            </div>
          </div>
        )}

        {/* Health Score */}
        {data.health.healthScore >= 0 && (
          <div className="border-t border-border/50 p-5 flex items-center gap-4">
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-14 h-14">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={data.health.healthScore >= 80 ? "#059669" : data.health.healthScore >= 50 ? "#f59e0b" : "#dc2626"}
                  strokeWidth="3"
                  strokeDasharray={`${data.health.healthScore}, 100`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-foreground">{data.health.healthScore}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Health Score</p>
              <p className="text-[11px] text-muted-foreground">
                {data.health.exceptions} excepții · {data.health.rageClicks} rage clicks · {data.health.deadClicks} dead clicks
              </p>
            </div>
          </div>
        )}
      </div>
    </details>
  )
}

// ─── Uptime Section ───

function UptimeSection({ data }: { data: NonNullable<DomainReportData["uptime"]> }) {
  const color = data.percent >= 99.5 ? "text-emerald-600" : data.percent >= 98 ? "text-amber-500" : "text-red-500"
  return (
    <details className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
      <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors select-none">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Shield size={16} className="text-emerald-500" />
        </div>
        <span className="font-bold text-sm text-foreground">Uptime</span>
        <span className={`ml-auto text-xs font-bold ${color}`}>{data.percent}%</span>
        <span className="text-xs text-muted-foreground">{data.avgResponseMs}ms · {data.incidents.length} incidente</span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </summary>
      <div className="border-t border-border p-5">
        <div className="grid grid-cols-3 gap-3">
          <MiniKpi label="Uptime" value={`${data.percent}%`} />
          <MiniKpi label="Timp Răspuns" value={`${data.avgResponseMs}ms`} />
          <MiniKpi label="Incidente" value={data.incidents.length.toString()} />
        </div>
      </div>
    </details>
  )
}

// ─── Telnyx Call Tracking Section ───

function TelnyxSection({ data }: { data: NonNullable<DomainReportData["telnyx"]> }) {
  const formatDuration = (s: number) => {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const sec = s % 60
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`
  }

  return (
    <details open className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
      <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors select-none">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <Phone size={16} className="text-orange-500" />
        </div>
        <span className="font-bold text-sm text-foreground">Apeluri Telefonice</span>
        <span className="ml-auto text-xs font-bold text-orange-600">{data.totalCalls} apeluri</span>
        <span className="text-xs text-muted-foreground">Durată medie: {formatDuration(data.avgDuration)}</span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </summary>
      <div className="border-t border-border">
        <div className="grid grid-cols-3 gap-3 p-5">
          <MiniKpi label="Total Apeluri" value={data.totalCalls.toString()} />
          <MiniKpi label="Durată Medie" value={formatDuration(data.avgDuration)} />
          <MiniKpi label="Total Minute" value={formatDuration(data.totalDuration)} />
        </div>

        {data.bySource.length > 0 && (
          <div className="border-t border-border/50">
            <p className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Apeluri per Sursă</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-5 py-2 text-muted-foreground font-semibold">Sursă</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Apeluri</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Durată Medie</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySource.map((s, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-5 py-2 font-medium text-foreground">{s.label}</td>
                      <td className="text-right px-3 py-2 font-bold text-foreground">{s.count}</td>
                      <td className="text-right px-3 py-2 text-muted-foreground">{formatDuration(s.avgDuration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.calls.length > 0 && (
          <div className="border-t border-border/50">
            <p className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Apeluri Recente</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-5 py-2 text-muted-foreground font-semibold">Data</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">De la</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Sursă</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Durată</th>
                  </tr>
                </thead>
                <tbody>
                  {data.calls.slice(0, 10).map((call, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-5 py-2 text-foreground">
                        {new Date(call.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 font-mono text-foreground">{call.from}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          call.source === 'google_ads' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          call.source === 'organic' || call.source === 'seo' ? 'bg-green-50 text-green-700 border border-green-200' :
                          call.source === 'direct' ? 'bg-gray-50 text-gray-700 border border-gray-200' :
                          'bg-muted/30 text-muted-foreground border border-border/50'
                        }`}>
                          {call.sourceLabel}
                        </span>
                      </td>
                      <td className="text-right px-3 py-2 text-foreground font-medium">{formatDuration(call.duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </details>
  )
}

// ─── Sub-components ───

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/20 rounded-lg px-3 py-2.5 border border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-base font-extrabold text-foreground mt-0.5 tracking-tight">{value}</p>
    </div>
  )
}

function VitalBadge({ label, value, status }: { label: string; value: string; status: string }) {
  const colors: Record<string, string> = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "needs-improvement": "bg-amber-50 text-amber-700 border-amber-200",
    poor: "bg-red-50 text-red-700 border-red-200",
  }
  return (
    <div className={`px-3 py-2 rounded-lg border text-center ${colors[status] || "bg-muted text-foreground border-border"}`}>
      <p className="text-[10px] font-semibold uppercase">{label}</p>
      <p className="text-sm font-extrabold mt-0.5">{value}</p>
    </div>
  )
}

// ─── Send Report Modal (kept from original) ───

function SendReportModal({ reportId, clientEmail, clientName, reportTitle, publicUrl, onClose, onSuccess }: {
  reportId: string; clientEmail: string; clientName: string; reportTitle: string; publicUrl: string
  onClose: () => void; onSuccess: (msg: string) => void
}) {
  const [to, setTo] = useState(clientEmail || "")
  const [cc, setCc] = useState("")
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const fileRef = { current: null as HTMLInputElement | null }

  async function handleSend() {
    if (!to.trim()) return
    setSending(true)
    try {
      const formData = new FormData()
      formData.append("to", to.trim())
      formData.append("cc", cc)
      formData.append("message", message)
      for (const file of files) formData.append("attachments", file)

      const res = await fetch(`/api/reports/${reportId}/send`, { method: "POST", body: formData })
      const json = await res.json()
      if (res.ok) {
        onSuccess(`✅ Email trimis la ${to}`)
        onClose()
      } else {
        onSuccess(`❌ ${json.error}`)
      }
    } catch (err: any) { onSuccess(`❌ ${err.message}`) }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Send size={18} className="text-primary" /></div>
              <div>
                <h2 className="text-base font-bold text-foreground">Trimite Raport</h2>
                <p className="text-[11px] text-muted-foreground">{clientName} · {reportTitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"><X size={18} /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5"><Mail size={12} /> Destinatar *</label>
            <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="email@client.ro"
              className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5"><Users size={12} /> CC</label>
            <input type="text" value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@client.ro"
              className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5"><FileText size={12} /> Mesaj</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Mesaj personalizat..."
              className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="bg-muted/20 rounded-lg border border-border/50 p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Link raport</p>
            <p className="text-xs text-primary font-mono truncate">{publicUrl}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">Anulează</button>
          <button onClick={handleSend} disabled={!to.trim() || sending}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
            {sending ? <><Loader2 size={14} className="animate-spin" /> Se trimite...</> : <><Send size={14} /> Trimite</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Main Reports Page
// ═══════════════════════════════════════════════════════

interface ClientOption {
  id: string
  companyName: string
  businessLineId: string
  website: string | null
  websites: string[]
}

interface DomainOption {
  domain: string
  configured: boolean
  config?: { id: string; googleAdsCustomerId: string | null; gscSiteUrl: string | null; posthogProjectId: string | null }
}

export default function ReportsPage() {
  // ─── State ───
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [domains, setDomains] = useState<DomainOption[]>([])
  const [selectedDomain, setSelectedDomain] = useState("")
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  const [data, setData] = useState<DomainReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)

  // Report actions
  const [existingReport, setExistingReport] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [sendModal, setSendModal] = useState(false)

  // ─── Fetch clients ───
  useEffect(() => {
    async function fetchClients() {
      setLoadingClients(true)
      try {
        const res = await fetch("/api/clients?limit=200&status=activ")
        const json = await res.json()
        setClients((json.data || []).map((c: any) => ({
          id: c.id,
          companyName: c.companyName,
          businessLineId: c.businessLineId,
          website: c.website,
          websites: c.websites || [],
        })))
      } finally {
        setLoadingClients(false)
      }
    }
    fetchClients()
  }, [])

  // ─── Fetch domains when client changes ───
  useEffect(() => {
    if (!selectedClientId) { setDomains([]); setSelectedDomain(""); return }

    async function fetchDomains() {
      try {
        const res = await fetch(`/api/clients/${selectedClientId}/domains`)
        const json = await res.json()
        const d = json.data

        const domainOptions: DomainOption[] = (d.domains || []).map((domain: string) => {
          const cfg = (d.configs || []).find((c: any) => c.domain === domain)
          return {
            domain,
            configured: !!cfg,
            config: cfg ? {
              id: cfg.id,
              googleAdsCustomerId: cfg.googleAdsCustomerId,
              gscSiteUrl: cfg.gscSiteUrl,
              posthogProjectId: cfg.posthogProjectId,
            } : undefined,
          }
        })

        setDomains(domainOptions)
        if (domainOptions.length === 1 && domainOptions[0]) setSelectedDomain(domainOptions[0].domain)
        else setSelectedDomain("")
      } catch {}
    }
    fetchDomains()
  }, [selectedClientId])

  // ─── Fetch live data ───
  const fetchData = useCallback(async () => {
    if (!selectedClientId || !selectedDomain) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/live?clientId=${selectedClientId}&domain=${encodeURIComponent(selectedDomain)}&from=${dateFrom}&to=${dateTo}`)
      const json = await res.json()
      if (res.ok) {
        setData(json.data)
        setExistingReport(json.meta?.existingReport || null)
      } else {
        showToast(`❌ ${json.error}`)
      }
    } catch (err: any) {
      showToast(`❌ ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [selectedClientId, selectedDomain, dateFrom, dateTo])

  useEffect(() => {
    if (selectedClientId && selectedDomain) fetchData()
  }, [selectedClientId, selectedDomain, dateFrom, dateTo, fetchData])

  // ─── Actions ───

  async function generatePublicLink() {
    if (!selectedClientId || !selectedDomain) return
    setGeneratingLink(true)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          domain: selectedDomain,
          title: `Raport Performanță — ${selectedDomain}`,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        const url = json.data.publicUrl
        navigator.clipboard.writeText(url)
        showToast(`✅ Link generat și copiat: ${url}`)
        setExistingReport({
          id: json.data.id,
          token: json.data.token,
          publicUrl: url,
          title: json.data.title,
        })
      } else if (res.status === 409) {
        // Already exists
        const url = `${window.location.origin}/report/view/${json.existingToken}`
        navigator.clipboard.writeText(url)
        showToast(`📋 Link existent copiat: ${url}`)
      } else {
        showToast(`❌ ${json.error}`)
      }
    } finally {
      setGeneratingLink(false)
    }
  }

  async function generateAiSnapshot() {
    if (!existingReport?.id) {
      showToast("⚠️ Generează mai întâi un link public")
      return
    }
    setGeneratingAi(true)
    try {
      const res = await fetch(`/api/reports/${existingReport.id}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom, dateTo }),
      })
      const json = await res.json()
      showToast(res.ok ? "✅ Interpretare AI generată!" : `❌ ${json.error}`)
    } finally {
      setGeneratingAi(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-surface border border-border rounded-xl px-4 py-3 shadow-lg text-sm text-foreground max-w-md animate-fade-in">
          {toast}
        </div>
      )}

      {/* Send Modal */}
      {sendModal && existingReport && selectedClient && (
        <SendReportModal
          reportId={existingReport.id}
          clientEmail={""} // Will be filled from client data
          clientName={selectedClient.companyName}
          reportTitle={existingReport.title || `Raport — ${selectedDomain}`}
          publicUrl={existingReport.publicUrl || ""}
          onClose={() => setSendModal(false)}
          onSuccess={showToast}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={22} className="text-primary" />
            Rapoarte
          </h1>
          <p className="text-sm text-muted-foreground">Dashboard live per domeniu client</p>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Client Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Client</label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-zinc-900 dark:text-white dark:[color-scheme:dark]"
            >
              <option value="">Selectează client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          {/* Domain Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Domeniu</label>
            <select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              disabled={domains.length === 0}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 dark:bg-zinc-900 dark:text-white dark:[color-scheme:dark]"
            >
              <option value="">{domains.length === 0 ? "Selectează mai întâi un client" : "Selectează domeniu..."}</option>
              {domains.map(d => (
                <option key={d.domain} value={d.domain}>
                  {d.domain} {d.configured ? "✓" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">De la</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-zinc-900 dark:text-white dark:[color-scheme:dark]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Până la</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-zinc-900 dark:text-white dark:[color-scheme:dark]" />
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={!selectedClientId || !selectedDomain || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            {loading ? "Se încarcă..." : "Actualizează"}
          </button>
        </div>

        {/* Source Indicators */}
        {data && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Surse:</span>
            <SourceBadge label="Google Ads" active={data.sources.googleAds && !!data.googleAds} />
            <SourceBadge label="Search Console" active={data.sources.gsc && !!data.seo} />
            <SourceBadge label="PostHog" active={data.sources.posthog && !!data.analytics} />
            <SourceBadge label="Uptime" active={!!data.uptime && data.uptime.totalChecks > 0} />
            <SourceBadge label="Telnyx" active={data.sources.telnyx && !!data.telnyx} />
          </div>
        )}
      </div>

      {/* Empty State */}
      {!data && !loading && (
        <div className="bg-surface rounded-xl border border-dashed border-border p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
            <BarChart3 size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Selectează un Client și Domeniu</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Alege un client din lista de sus, selectează domeniul, și vei vedea datele live din Google Ads, Search Console, PostHog și Uptime.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-surface rounded-xl border border-border p-16 text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Se încarcă datele pentru <span className="font-semibold text-foreground">{selectedDomain}</span>...</p>
          <p className="text-xs text-muted-foreground mt-1">Google Ads + GSC + PostHog + Uptime</p>
        </div>
      )}

      {/* Data Dashboard */}
      {data && !loading && (
        <>
          {/* Hero KPIs */}
          <HeroKpis data={data} />

          {/* Google Ads */}
          {data.googleAds && <AdsSection data={data.googleAds} />}

          {/* Google Ads — Extended Analytics */}
          {data.googleAds && (data.googleAds.deviceBreakdown?.length || data.googleAds.impressionShare?.length || data.googleAds.keywords?.length) && (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Google Ads — Analiză Extinsă</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdsDeviceBreakdown data={data.googleAds} />
                <AdsImpressionShare data={data.googleAds} />
                <AdsKeywordQuality data={data.googleAds} />
                <AdsTimeAnalysis data={data.googleAds} />
              </div>
              <AdsAdGroupPerformance data={data.googleAds} />
            </div>
          )}

          {/* SEO */}
          {data.seo && <SeoSection data={data.seo} />}

          {/* Analytics */}
          {data.analytics && <AnalyticsSection data={data.analytics} />}

          {/* Uptime */}
          {data.uptime && data.uptime.totalChecks > 0 && <UptimeSection data={data.uptime} />}

          {/* Telnyx Call Tracking */}
          {data.telnyx && data.telnyx.totalCalls > 0 && <TelnyxSection data={data.telnyx} />}

          {/* Actions Bar */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acțiuni Raport</p>
            <div className="flex flex-wrap gap-3">
              {/* Generate / Copy Link */}
              {existingReport ? (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(existingReport.publicUrl)
                    showToast("📋 Link copiat!")
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Copy size={14} /> Copiază Link Public
                </button>
              ) : (
                <button
                  onClick={generatePublicLink}
                  disabled={generatingLink}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {generatingLink ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  Generează Link Public
                </button>
              )}

              {/* View public report */}
              {existingReport && (
                <a
                  href={existingReport.publicUrl}
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink size={14} /> Vizualizează Raport
                </a>
              )}

              {/* Send Email */}
              {existingReport && (
                <button
                  onClick={() => setSendModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Send size={14} /> Trimite Email
                </button>
              )}

              {/* AI Interpretation */}
              <button
                onClick={generateAiSnapshot}
                disabled={generatingAi || !existingReport}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {generatingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Interpretare AI
              </button>
            </div>

            {/* Report Info */}
            {existingReport && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye size={12} /> {existingReport.viewCount || 0} vizualizări</span>
                {existingReport.sentAt && <span>Trimis: {new Date(existingReport.sentAt).toLocaleDateString("ro-RO")}</span>}
                {existingReport.snapshotCount > 0 && <span>{existingReport.snapshotCount} interpretări AI</span>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SourceBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
      active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-muted/30 text-muted-foreground border border-border/50"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
      {label}
    </span>
  )
}
