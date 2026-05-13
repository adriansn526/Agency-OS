"use client"

import { cn } from "@/lib/utils"
import type { DashboardWidget, KPIValue, TimeseriesPoint, KeywordData, CampaignData } from "@repo/mock-data"
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react"

/* ────────────────────────────────────────────── */
/*  Stat Card Widget                              */
/* ────────────────────────────────────────────── */

export function StatCardWidget({ kpi }: { kpi: KPIValue }) {
  const isPositive = kpi.direction === 'up' ? (kpi.change || 0) > 0 : (kpi.change || 0) < 0
  const changeAbs = Math.abs(kpi.change || 0)
  const TrendIcon = (kpi.change || 0) > 0 ? ArrowUpRight : (kpi.change || 0) < 0 ? ArrowDownRight : Minus

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}K`
    if (val < 1 && val > 0) return val.toFixed(2)
    if (Number.isInteger(val)) return val.toLocaleString()
    return val.toFixed(1)
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4 hover:border-primary/20 transition-all group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
        <span className="text-[9px] font-medium text-muted-foreground/60 uppercase">{kpi.source}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">
            {kpi.unit === '€' && '€'}{formatValue(kpi.value)}{kpi.unit === '%' && '%'}{kpi.unit === 'x' && 'x'}
          </p>
        </div>
        {kpi.change !== undefined && (
          <div className={cn(
            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold",
            isPositive ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
          )}>
            <TrendIcon size={12} />
            {changeAbs > 1 ? `${changeAbs.toFixed(0)}%` : `${changeAbs.toFixed(1)}${kpi.unit === '%' ? 'pp' : '%'}`}
          </div>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────── */
/*  Mini Line Chart (SVG)                         */
/* ────────────────────────────────────────────── */

export function MiniLineChart({ data, title, height = 200 }: { data: TimeseriesPoint[]; title: string; height?: number }) {
  if (!data.length) return null

  const width = 600
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const values = data.map(d => d.value)
  const min = Math.min(...values) * 0.9
  const max = Math.max(...values) * 1.1

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - min) / (max - min)) * chartH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1]!.x} ${padding.top + chartH} L ${points[0]!.x} ${padding.top + chartH} Z`

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padding.top + chartH * (1 - pct)
          const val = min + (max - min) * pct
          return (
            <g key={pct}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="var(--muted-foreground)" fontSize="10">
                {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toFixed(0)}
              </text>
            </g>
          )
        })}
        {/* X axis labels */}
        {data.map((d, i) => (
          <text key={d.date} x={points[i]!.x} y={height - 5} textAnchor="middle" fill="var(--muted-foreground)" fontSize="10">
            {d.date.slice(5)} {/* "01", "02" */}
          </text>
        ))}
        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGradient)" opacity="0.2" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />
        ))}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

/* ────────────────────────────────────────────── */
/*  Data Table Widget                             */
/* ────────────────────────────────────────────── */

export function KeywordTable({ data, title }: { data: KeywordData[]; title: string }) {
  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp size={12} className="text-emerald-400" />
    if (trend === 'down') return <TrendingDown size={12} className="text-red-400" />
    return <Minus size={12} className="text-muted-foreground" />
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase">
              <th className="px-4 py-2.5 text-left">Keyword</th>
              <th className="px-4 py-2.5 text-right">Poziție</th>
              <th className="px-4 py-2.5 text-right">Clicks</th>
              <th className="px-4 py-2.5 text-right">Impresii</th>
              <th className="px-4 py-2.5 text-right">CTR</th>
              <th className="px-4 py-2.5 text-center">Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.map(kw => {
              const posColor = kw.position <= 3 ? 'text-emerald-400' : kw.position <= 10 ? 'text-blue-400' : kw.position <= 20 ? 'text-amber-400' : 'text-muted-foreground'
              return (
                <tr key={kw.keyword} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 text-sm text-foreground font-medium">{kw.keyword}</td>
                  <td className={cn("px-4 py-2.5 text-sm font-bold text-right", posColor)}>
                    {kw.position.toFixed(1)}
                    {kw.previousPosition && kw.previousPosition !== kw.position && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({kw.previousPosition > kw.position ? '▲' : '▼'}{Math.abs(kw.previousPosition - kw.position).toFixed(0)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-foreground text-right">{kw.clicks.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground text-right">{kw.impressions.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-sm text-foreground text-right">{kw.ctr.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center"><TrendIcon trend={kw.trend} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CampaignTable({ data, title }: { data: CampaignData[]; title: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase">
              <th className="px-4 py-2.5 text-left">Campanie</th>
              <th className="px-4 py-2.5 text-right">Spend</th>
              <th className="px-4 py-2.5 text-right">Clicks</th>
              <th className="px-4 py-2.5 text-right">Conv.</th>
              <th className="px-4 py-2.5 text-right">CTR</th>
              <th className="px-4 py-2.5 text-right">CPC</th>
              <th className="px-4 py-2.5 text-right">ROAS</th>
              <th className="px-4 py-2.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c.name} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 text-sm text-foreground font-medium">{c.name}</td>
                <td className="px-4 py-2.5 text-sm text-foreground text-right">€{c.spend.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-sm text-foreground text-right">{c.clicks.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-sm font-bold text-foreground text-right">{c.conversions}</td>
                <td className="px-4 py-2.5 text-sm text-foreground text-right">{c.ctr.toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-sm text-foreground text-right">€{c.cpc.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-sm font-bold text-right">
                  <span className={cn(c.roas && c.roas >= 3 ? "text-emerald-400" : c.roas && c.roas >= 2 ? "text-amber-400" : "text-red-400")}>
                    {c.roas ? `${c.roas.toFixed(1)}x` : '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                    c.status === 'active' ? "text-emerald-400 bg-emerald-500/10" :
                    c.status === 'paused' ? "text-amber-400 bg-amber-500/10" :
                    "text-red-400 bg-red-500/10"
                  )}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────── */
/*  Bar Chart Widget (Position Distribution)      */
/* ────────────────────────────────────────────── */

export function BarChartWidget({ data, title }: { data: { range: string; count: number; color: string }[]; title: string }) {
  const max = Math.max(...data.map(d => d.count))

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
      <div className="space-y-3">
        {data.map(d => (
          <div key={d.range} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16 text-right">{d.range}</span>
            <div className="flex-1 h-6 bg-muted/30 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-700"
                style={{ width: `${(d.count / max) * 100}%`, backgroundColor: d.color }}
              />
            </div>
            <span className="text-sm font-bold text-foreground w-10 text-right">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────── */
/*  Widget Grid — renders widgets from template   */
/* ────────────────────────────────────────────── */

export function WidgetGrid({
  kpis,
  timeseries,
  keywords,
  campaigns,
  positionDistribution,
  widgets,
}: {
  kpis: KPIValue[]
  timeseries: TimeseriesPoint[]
  keywords?: KeywordData[]
  campaigns?: CampaignData[]
  positionDistribution?: { range: string; count: number; color: string }[]
  widgets: DashboardWidget[]
}) {
  // Separate widget types for layout  
  const statCards = widgets.filter(w => w.type === 'stat_card')
  const lineCharts = widgets.filter(w => w.type === 'line_chart')
  const tables = widgets.filter(w => w.type === 'table')
  const barCharts = widgets.filter(w => w.type === 'bar_chart')

  return (
    <div className="space-y-4">
      {/* Stat Cards Grid */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {statCards.map(w => {
            const kpi = kpis.find(k => k.metric === w.metric)
            if (!kpi) return null
            return <StatCardWidget key={w.id} kpi={kpi} />
          })}
        </div>
      )}

      {/* Line Charts */}
      {lineCharts.map(w => (
        <MiniLineChart key={w.id} data={timeseries} title={w.title} />
      ))}

      {/* Tables */}
      {tables.map(w => {
        if (w.metric.includes('queries') || w.metric.includes('keyword')) {
          return keywords ? <KeywordTable key={w.id} data={keywords} title={w.title} /> : null
        }
        if (w.metric.includes('campaign') || w.metric.includes('adset') || w.metric.includes('ad_performance')) {
          return campaigns ? <CampaignTable key={w.id} data={campaigns} title={w.title} /> : null
        }
        return null
      })}

      {/* Bar Charts */}
      {barCharts.map(w => (
        positionDistribution ? <BarChartWidget key={w.id} data={positionDistribution} title={w.title} /> : null
      ))}
    </div>
  )
}
