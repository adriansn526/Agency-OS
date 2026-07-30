"use client"
import { Activity } from "lucide-react"
import { WidgetWrapper } from "./report-widget-wrapper"

interface HealthData {
  health: { exceptions: number; rageClicks: number; deadClicks: number; healthScore: number } | null
  webVitals: { lcp: number; cls: number; inp: number; fcp: number; lcpStatus: string; clsStatus: string; inpStatus: string; fcpStatus: string } | null
}

const STATUS_COLORS = { good: "#059669", "needs-improvement": "#f59e0b", poor: "#dc2626" }
const STATUS_LABELS = { good: "Bun", "needs-improvement": "De Îmbunătățit", poor: "Slab" }

export function ReportHealth({ data, loading }: { data?: HealthData; loading?: boolean }) {
  if (!data || (!data.health && !data.webVitals)) {
    return <WidgetWrapper title="Site Health & Web Vitals" icon={<Activity size={16} />} loading={loading}><div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>PostHog nu este configurat.</div></WidgetWrapper>
  }

  return (
    <WidgetWrapper title="Site Health & Web Vitals" icon={<Activity size={16} />}>
      <div style={{ padding: "16px 24px 24px" }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {/* Health Score Gauge */}
          {data.health && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{
                width: 100, height: 100, borderRadius: "50%",
                background: `conic-gradient(${data.health.healthScore >= 80 ? "#059669" : data.health.healthScore >= 50 ? "#f59e0b" : "#dc2626"} ${data.health.healthScore * 3.6}deg, #f1f5f9 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{data.health.healthScore}</span>
                </div>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 600, color: "#64748b" }}>Health Score</p>
            </div>
          )}

          {/* Alerts */}
          {data.health && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
              <AlertBadge label="Excepții" value={data.health.exceptions} color={data.health.exceptions > 10 ? "#dc2626" : "#059669"} />
              <AlertBadge label="Rage Clicks" value={data.health.rageClicks} color={data.health.rageClicks > 20 ? "#dc2626" : "#f59e0b"} />
              <AlertBadge label="Dead Clicks" value={data.health.deadClicks} color={data.health.deadClicks > 15 ? "#dc2626" : "#f59e0b"} />
            </div>
          )}

          {/* Web Vitals */}
          {data.webVitals && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
              <VitalCard label="LCP" value={`${((data.webVitals.lcp ?? 0) / 1000).toFixed(1)}s`} status={data.webVitals.lcpStatus} />
              <VitalCard label="CLS" value={(data.webVitals.cls ?? 0).toFixed(3)} status={data.webVitals.clsStatus} />
              <VitalCard label="INP" value={`${data.webVitals.inp ?? 0}ms`} status={data.webVitals.inpStatus} />
              <VitalCard label="FCP" value={`${((data.webVitals.fcp ?? 0) / 1000).toFixed(1)}s`} status={data.webVitals.fcpStatus} />
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  )
}

function VitalCard({ label, value, status }: { label: string; value: string; status: string }) {
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "#94a3b8"
  const statusLabel = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status
  return (
    <div style={{ padding: "14px 18px", background: "#fafbfc", borderRadius: 12, border: `1px solid ${color}22`, minWidth: 100, textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "4px 0 2px", fontSize: 20, fontWeight: 800, color }}>{value}</p>
      <p style={{ margin: 0, fontSize: 10, color, fontWeight: 600 }}>{statusLabel}</p>
    </div>
  )
}

function AlertBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{ color: "#334155", fontWeight: 500 }}>{label}:</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  )
}
