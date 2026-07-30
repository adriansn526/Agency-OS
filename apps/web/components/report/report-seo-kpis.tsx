"use client"
import { Search } from "lucide-react"
import { WidgetWrapper, KpiCard } from "./report-widget-wrapper"

interface SeoMetrics { clicks: number; impressions: number; ctr: number; position: number }

export function ReportSeoKpis({ data, loading }: { data?: SeoMetrics; loading?: boolean }) {
  if (!data || (data as any).error) {
    return <WidgetWrapper title="SEO — KPIs Organic" icon={<Search size={16} />} loading={loading}><div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>{(data as any)?.error || "GSC nu este configurat."}</div></WidgetWrapper>
  }

  const posColor = (data.position ?? 0) <= 5 ? "#059669" : (data.position ?? 0) <= 15 ? "#f59e0b" : "#dc2626"

  return (
    <WidgetWrapper title="SEO — KPIs Organic" icon={<Search size={16} />}>
      <div style={{ padding: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <KpiCard label="Clicks Organic" value={(data.clicks ?? 0).toLocaleString("ro-RO")} color="#34a853" />
        <KpiCard label="Impressions" value={(data.impressions ?? 0).toLocaleString("ro-RO")} />
        <KpiCard label="CTR" value={`${data.ctr}%`} color="#4285f4" />
        <KpiCard label="Poziție Medie" value={(data.position ?? 0).toFixed(1)} color={posColor} />
      </div>
    </WidgetWrapper>
  )
}
