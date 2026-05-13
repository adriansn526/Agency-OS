"use client"

// ─── Source Attribution Chart ───
// Horizontal bar chart showing where conversions/traffic came from

import { WidgetWrapper } from "./report-widget-wrapper"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const COLORS: Record<string, string> = {
  "Google Ads": "#4285f4",
  "Organic": "#34a853",
  "Social": "#e91e63",
  "Social Ads": "#ea580c",
  "Direct": "#6366f1",
  "Email": "#f59e0b",
  "Referral": "#06b6d4",
  "Altele": "#94a3b8",
}

interface AttributionItem {
  source: string
  pageviews: number
  users: number
}

export function ReportAttribution({ data, loading }: { data?: AttributionItem[]; loading?: boolean }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <WidgetWrapper title="Surse Trafic — Attribution" icon="📊" loading={loading}>
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          Nu sunt date disponibile pentru perioada selectată.
        </div>
      </WidgetWrapper>
    )
  }

  const total = data.reduce((s, d) => s + d.pageviews, 0)

  return (
    <WidgetWrapper title="Surse Trafic — Attribution" icon="📊">
      <div style={{ padding: "16px 24px 24px" }}>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
          <BarChart data={data} layout="vertical" margin={{ left: 100, right: 40 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis type="category" dataKey="source" tick={{ fontSize: 13, fill: "#334155", fontWeight: 600 }} width={100} />
            <Tooltip
              formatter={(val: any) => [`${Number(val).toLocaleString("ro-RO")} vizite`, ""]}
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
            />
            <Bar dataKey="pageviews" radius={[0, 6, 6, 0]} barSize={28}>
              {data.map((entry, i) => (
                <Cell key={i} fill={COLORS[entry.source] || "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Percentage breakdown */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          {data.map(d => (
            <div key={d.source} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[d.source] || "#94a3b8" }} />
              <span style={{ color: "#334155", fontWeight: 600 }}>{d.source}</span>
              <span style={{ color: "#94a3b8" }}>{total > 0 ? Math.round((d.pageviews / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  )
}
