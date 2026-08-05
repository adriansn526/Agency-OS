"use client"
import { Megaphone } from "lucide-react"
import { WidgetWrapper, KpiCard } from "./report-widget-wrapper"

interface AdsMetrics {
  impressions: number; clicks: number; spend: number; conversions: number
  conversionsValue: number; ctr: number; cpc: number; conversionRate: number; roas: number
}

export function ReportAdsKpis({ data, loading }: { data?: AdsMetrics; loading?: boolean }) {
  if (!data || (data as any).error) {
    return (
      <WidgetWrapper title="Google Ads — KPIs" icon={<Megaphone size={16} />} loading={loading}>
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          {(data as any)?.error || "Google Ads nu este configurat pentru acest client."}
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper title="Google Ads — KPIs" icon={<Megaphone size={16} />}>
      <div style={{ padding: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <KpiCard label="Spend" value={`${(data.spend ?? 0).toLocaleString("ro-RO")} lei`} color="#4285f4" />
        <KpiCard label="ROAS" value={`${data.roas ?? 0}x`} color={(data.roas ?? 0) >= 3 ? "#059669" : (data.roas ?? 0) >= 1 ? "#f59e0b" : "#dc2626"} sublabel={`${(data.conversionsValue ?? 0).toLocaleString("ro-RO")} lei venituri`} />
        <KpiCard label="Conversii" value={data.conversions ?? 0} color="#4338ca" sublabel={`${data.conversionRate ?? 0}% rată conversie`} />
        <KpiCard label="Clicks" value={(data.clicks ?? 0).toLocaleString("ro-RO")} sublabel={`CTR: ${data.ctr ?? 0}% · CPC: ${data.cpc ?? 0} lei`} />
      </div>
    </WidgetWrapper>
  )
}
