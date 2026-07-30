"use client"
import { Sparkles } from "lucide-react"
import { useState } from "react"
import { WidgetWrapper } from "./report-widget-wrapper"

interface Snapshot {
  id: string
  dateFrom: string
  dateTo: string
  content: string
  highlights: unknown
  createdAt: string
}

export function ReportInterpretation({ snapshots }: { snapshots: Snapshot[] }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (snapshots.length === 0) return null

  const active = snapshots[activeIndex]
  if (!active) return null
  const formatDate = (d: string) => new Date(d).toLocaleDateString("ro-RO", { month: "short", year: "numeric" })
  const highlights = Array.isArray(active.highlights) ? active.highlights as Array<{ label: string; value: string; trend?: string }> : null

  return (
    <WidgetWrapper title="Interpretare & Analiză" icon={<Sparkles size={16} />}>
      <div style={{ padding: "16px 24px 24px" }}>
        {/* Period tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {snapshots.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveIndex(i)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "Inter, sans-serif",
                border: i === activeIndex ? "1px solid #4338ca" : "1px solid #e2e8f0",
                background: i === activeIndex ? "#4338ca" : "#fafbfc",
                color: i === activeIndex ? "#fff" : "#64748b",
                transition: "all 0.2s",
              }}
            >
              {formatDate(s.dateFrom)} — {formatDate(s.dateTo)}
            </button>
          ))}
        </div>

        {/* Highlights */}
        {highlights && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            {highlights.map((h, i) => (
              <div key={i} style={{
                padding: "10px 16px", background: "#f0f0ff", borderRadius: 10,
                border: "1px solid #e0e0ff", display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#4338ca" }}>{h.label}:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{h.value}</span>
                {h.trend && <span style={{ fontSize: 11, color: h.trend.startsWith("+") ? "#059669" : "#dc2626" }}>{h.trend}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{
          fontSize: 14, lineHeight: 1.7, color: "#334155",
          padding: 20, background: "#fafbfc", borderRadius: 12,
          border: "1px solid #f1f5f9",
          whiteSpace: "pre-wrap",
        }}>
          {active.content}
        </div>

        <p style={{ margin: "12px 0 0", fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
          Generat pe {new Date(active.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    </WidgetWrapper>
  )
}
