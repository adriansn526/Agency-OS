"use client"

// ─── Report Widget Wrapper ───
// Provides consistent card styling, loading skeleton, and section headers

import { ReactNode } from "react"

interface WidgetWrapperProps {
  title: string
  icon: string
  loading?: boolean
  children: ReactNode
  fullWidth?: boolean
}

export function WidgetWrapper({ title, icon, loading, children, fullWidth }: WidgetWrapperProps) {
  return (
    <section style={{
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      marginBottom: 24,
      overflow: "hidden",
      width: fullWidth ? "100%" : undefined,
    }}>
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid #f1f5f9",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3 }}>{title}</h2>
        {loading && (
          <div style={{
            width: 16, height: 16, marginLeft: "auto",
            border: "2px solid #e2e8f0", borderTopColor: "#6366f1",
            borderRadius: "50%", animation: "spin 1s linear infinite",
          }} />
        )}
      </div>
      <div style={{ padding: loading ? "24px" : 0 }}>
        {loading ? <Skeleton /> : children}
      </div>
    </section>
  )
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: 0.5 }}>
      <div style={{ height: 20, background: "#f1f5f9", borderRadius: 8, width: "60%" }} />
      <div style={{ height: 16, background: "#f1f5f9", borderRadius: 8, width: "80%" }} />
      <div style={{ height: 16, background: "#f1f5f9", borderRadius: 8, width: "45%" }} />
    </div>
  )
}

// KPI Card sub-component
export function KpiCard({ label, value, sublabel, color }: {
  label: string; value: string | number; sublabel?: string; color?: string
}) {
  return (
    <div style={{
      padding: "20px 24px",
      background: "#fafbfc",
      borderRadius: 12,
      border: "1px solid #f1f5f9",
      flex: "1 1 0",
      minWidth: 140,
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 800, color: color || "#0f172a", letterSpacing: -1 }}>{value}</p>
      {sublabel && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{sublabel}</p>}
    </div>
  )
}

// Data table sub-component
export function DataTable({ columns, rows, maxRows = 10 }: {
  columns: { key: string; label: string; align?: "left" | "right" }[]
  rows: Record<string, unknown>[]
  maxRows?: number
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{
                padding: "10px 16px", textAlign: c.align || "left",
                fontSize: 11, fontWeight: 600, color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: 0.5,
                borderBottom: "1px solid #f1f5f9", background: "#fafbfc",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, maxRows).map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
              {columns.map(c => (
                <td key={c.key} style={{
                  padding: "10px 16px", textAlign: c.align || "left",
                  color: "#334155", whiteSpace: "nowrap",
                }}>{String(row[c.key] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
