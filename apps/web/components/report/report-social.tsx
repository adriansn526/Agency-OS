"use client"
import { WidgetWrapper } from "./report-widget-wrapper"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

const SOCIAL_COLORS: Record<string, string> = {
  facebook: "#1877f2", instagram: "#e4405f", linkedin: "#0a66c2",
  tiktok: "#000000", twitter: "#1da1f2", pinterest: "#e60023",
}

interface SocialItem {
  source: string; medium: string; pageviews: number; uniqueUsers: number
}

export function ReportSocial({ data, loading }: { data?: SocialItem[]; loading?: boolean }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <WidgetWrapper title="Social — Breakdown" icon="🌐" loading={loading}>
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          Nu a fost detectat trafic social pentru această perioadă.
        </div>
      </WidgetWrapper>
    )
  }

  const totalViews = data.reduce((s, d) => s + (d.pageviews ?? 0), 0)
  const totalUsers = data.reduce((s, d) => s + (d.uniqueUsers ?? 0), 0)

  const pieData = data.map(d => ({
    name: d.source.charAt(0).toUpperCase() + d.source.slice(1),
    value: d.pageviews,
    color: SOCIAL_COLORS[d.source.toLowerCase()] || "#94a3b8",
  }))

  return (
    <WidgetWrapper title="Social — Breakdown" icon="🌐">
      <div style={{ padding: "16px 24px 24px", display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
        {/* Pie Chart */}
        <div style={{ width: 240, height: 240, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Total Vizite</p>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{totalViews.toLocaleString("ro-RO")}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Utilizatori Unici</p>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{totalUsers.toLocaleString("ro-RO")}</p>
            </div>
          </div>

          {data.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: SOCIAL_COLORS[item.source.toLowerCase()] || "#94a3b8" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", flex: 1 }}>
                {item.source.charAt(0).toUpperCase() + item.source.slice(1)}
              </span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{(item.pageviews ?? 0).toLocaleString("ro-RO")} vizite</span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                ({totalViews > 0 ? Math.round((item.pageviews / totalViews) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  )
}
