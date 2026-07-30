"use client"

import { Shield } from "lucide-react"
import { WidgetWrapper, KpiCard } from "./report-widget-wrapper"

interface UptimeData {
  percent: number
  avgResponseMs: number
  totalChecks: number
  incidents: Array<{
    startedAt: string
    resolvedAt: string | null
    durationMin: number | null
    cause: string | null
  }>
}

export function ReportUptimeWidget({ data, loading }: { data?: UptimeData; loading?: boolean }) {
  if (!data) {
    return (
      <WidgetWrapper title="Uptime & Disponibilitate" icon={<Shield size={16} />} loading={loading}>
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          Nu sunt date de uptime disponibile.
        </div>
      </WidgetWrapper>
    )
  }

  const uptimeColor = data.percent >= 99.5 ? "#059669" : data.percent >= 98 ? "#f59e0b" : "#dc2626"
  const responseColor = data.avgResponseMs < 500 ? "#059669" : data.avgResponseMs < 1500 ? "#f59e0b" : "#dc2626"

  return (
    <WidgetWrapper title="Uptime & Disponibilitate" icon={<Shield size={16} />}>
      <div style={{ padding: "16px 24px" }}>
        {/* KPI Row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <KpiCard
            label="Uptime"
            value={`${data.percent}%`}
            sublabel={data.totalChecks > 0 ? `${data.totalChecks} verificări` : undefined}
            color={uptimeColor}
          />
          <KpiCard
            label="Timp Răspuns Mediu"
            value={`${data.avgResponseMs}ms`}
            sublabel={data.avgResponseMs < 500 ? "Rapid" : data.avgResponseMs < 1500 ? "Acceptabil" : "Lent"}
            color={responseColor}
          />
          <KpiCard
            label="Incidente"
            value={data.incidents.length}
            sublabel={data.incidents.length === 0 ? "Niciun incident" : undefined}
            color={data.incidents.length === 0 ? "#059669" : "#dc2626"}
          />
        </div>

        {/* Uptime Visual Bar */}
        <div style={{
          height: 8,
          borderRadius: 4,
          background: "#f1f5f9",
          overflow: "hidden",
          marginBottom: 8,
        }}>
          <div style={{
            height: "100%",
            width: `${Math.min(data.percent, 100)}%`,
            background: `linear-gradient(90deg, ${uptimeColor}, ${uptimeColor}cc)`,
            borderRadius: 4,
            transition: "width 0.5s ease",
          }} />
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
          {data.percent >= 99.5 ? "Excelent" : data.percent >= 98 ? "Bun" : "Necesită atenție"}
        </p>

        {/* Incidents List */}
        {data.incidents.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Incidente Recente
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.incidents.slice(0, 5).map((inc, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "#fef2f2",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  fontSize: 12,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }} />
                  <span style={{ color: "#334155", fontWeight: 500 }}>
                    {new Date(inc.startedAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {inc.durationMin && (
                    <span style={{ color: "#94a3b8" }}>
                      {inc.durationMin < 60 ? `${inc.durationMin} min` : `${Math.round(inc.durationMin / 60)}h ${inc.durationMin % 60}m`}
                    </span>
                  )}
                  {inc.cause && (
                    <span style={{ color: "#dc2626", marginLeft: "auto", fontWeight: 500 }}>
                      {inc.cause.substring(0, 30)}
                    </span>
                  )}
                  {inc.resolvedAt ? (
                    <span style={{ fontSize: 10, color: "#059669", fontWeight: 600 }}>Rezolvat</span>
                  ) : (
                    <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>Activ</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WidgetWrapper>
  )
}
