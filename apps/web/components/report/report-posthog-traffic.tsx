"use client"

import { BarChart3 } from "lucide-react"
import { WidgetWrapper, KpiCard, DataTable } from "./report-widget-wrapper"

interface TrafficData {
  traffic: {
    pageviews: number
    uniqueVisitors: number
    sessions: number
    bounceRate: number
  }
  dailyTraffic: Array<{ date: string; pageviews: number; visitors: number; sessions: number }>
  trafficBySource: Array<{ source: string; medium: string; pageviews: number; uniqueUsers: number }>
  topPages: Array<{ page: string; views: number; users: number }>
}

export function ReportPosthogTraffic({ data, loading }: { data?: TrafficData; loading?: boolean }) {
  if (!data || !data.traffic) {
    return (
      <WidgetWrapper title="Website Analytics" icon={<BarChart3 size={16} />} loading={loading}>
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          Analytics nu este configurat pentru acest domeniu.
        </div>
      </WidgetWrapper>
    )
  }

  const maxPv = Math.max(...(data.dailyTraffic || []).map(d => d.pageviews), 1)

  return (
    <WidgetWrapper title="Website Analytics" icon={<BarChart3 size={16} />}>
      {/* KPI Row */}
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KpiCard label="Vizite (Sesiuni)" value={data.traffic.sessions.toLocaleString("ro-RO")} color="#6366f1" />
        <KpiCard label="Vizitatori Unici" value={data.traffic.uniqueVisitors.toLocaleString("ro-RO")} color="#0ea5e9" />
        <KpiCard label="Pagini Vizualizate" value={data.traffic.pageviews.toLocaleString("ro-RO")} color="#8b5cf6" />
        <KpiCard label="Bounce Rate" value={`${data.traffic.bounceRate}%`} color={data.traffic.bounceRate > 70 ? "#dc2626" : data.traffic.bounceRate > 50 ? "#f59e0b" : "#059669"} />
      </div>

      {/* Daily Traffic Mini Chart */}
      {data.dailyTraffic && data.dailyTraffic.length > 0 && (
        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Trafic Zilnic
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
            {data.dailyTraffic.map((d, i) => (
              <div
                key={i}
                title={`${d.date}: ${d.pageviews} pageviews, ${d.visitors} vizitatori`}
                style={{
                  flex: 1,
                  height: `${(d.pageviews / maxPv) * 100}%`,
                  minHeight: 2,
                  background: "linear-gradient(to top, #6366f1, #818cf8)",
                  borderRadius: "3px 3px 0 0",
                  transition: "opacity 0.2s",
                  cursor: "pointer",
                  opacity: 0.8,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>{data.dailyTraffic[0]?.date}</span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>{data.dailyTraffic[data.dailyTraffic.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Traffic Sources */}
      {data.trafficBySource && data.trafficBySource.length > 0 && (
        <div style={{ borderTop: "1px solid #f1f5f9" }}>
          <div style={{ padding: "16px 24px 8px" }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Surse de Trafic
            </p>
          </div>
          <DataTable
            columns={[
              { key: "source", label: "Sursă" },
              { key: "medium", label: "Medium" },
              { key: "pageviews", label: "Vizualizări", align: "right" },
              { key: "uniqueUsers", label: "Utilizatori", align: "right" },
            ]}
            rows={data.trafficBySource}
            maxRows={8}
          />
        </div>
      )}

      {/* Top Pages */}
      {data.topPages && data.topPages.length > 0 && (
        <div style={{ borderTop: "1px solid #f1f5f9" }}>
          <div style={{ padding: "16px 24px 8px" }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Pagini Populare
            </p>
          </div>
          <DataTable
            columns={[
              { key: "page", label: "Pagină" },
              { key: "views", label: "Vizualizări", align: "right" },
              { key: "users", label: "Utilizatori", align: "right" },
            ]}
            rows={data.topPages.map(p => ({
              ...p,
              page: p.page.replace(/^https?:\/\/[^/]+/, ''), // Show path only
            }))}
            maxRows={10}
          />
        </div>
      )}
    </WidgetWrapper>
  )
}
