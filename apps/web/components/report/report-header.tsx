"use client"

// ─── Report Header ───
// Logo per BL + Title + Client Name + Global Date Range Picker
// Now uses ReportTheme for dynamic gradient colors

import type { ReportTheme } from "@/lib/report-themes"
import { getReportTheme } from "@/lib/report-themes"

interface ReportHeaderProps {
  title: string
  clientName: string
  businessLine: { slug: string; name: string; color: string }
  dateRange: { from: string; to: string }
  onDateChange: (range: { from: string; to: string }) => void
  loading?: boolean
  theme?: ReportTheme
  jsonUrl?: string
}

export function ReportHeader({ title, clientName, businessLine, dateRange, onDateChange, loading, theme: themeProp, jsonUrl }: ReportHeaderProps) {
  const theme = themeProp ?? getReportTheme(businessLine.slug)

  return (
    <header style={{
      background: theme.gradient,
      padding: "32px 20px 28px",
      marginBottom: 28,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle pattern overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.05,
        backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          {/* Left: Logo + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src={theme.logo}
              alt={businessLine.name}
              style={{ height: 40, borderRadius: 8, background: "rgba(255,255,255,0.15)", padding: 4 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#ffffff", letterSpacing: -0.5 }}>{title}</h1>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{clientName}</p>
            </div>
          </div>

          {/* Right: Date Range Picker + JSON Button */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {jsonUrl && (
              <a
                href={jsonUrl}
                target="_blank"
                rel="noreferrer"
                title="Deschide datele brute (JSON) pentru agenții AI"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  textDecoration: "none", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                AI JSON
              </a>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 16px", backdropFilter: "blur(8px)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => onDateChange({ ...dateRange, from: e.target.value })}
              style={{
                background: "transparent", border: "none", color: "#ffffff",
                fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
                outline: "none", cursor: "pointer",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>→</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => onDateChange({ ...dateRange, to: e.target.value })}
              style={{
                background: "transparent", border: "none", color: "#ffffff",
                fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
                outline: "none", cursor: "pointer",
              }}
            />
            {loading && (
              <div style={{
                width: 14, height: 14,
                border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                borderRadius: "50%", animation: "spin 1s linear infinite",
              }} />
            )}
          </div>
          </div>
        </div>
      </div>
    </header>
  )
}
