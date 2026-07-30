"use client"
import { Megaphone } from "lucide-react"
import { WidgetWrapper } from "./report-widget-wrapper"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

interface DailyData {
  date: string; clicks: number; conversions: number; spend: number
}

export function ReportAdsTrend({ data, loading }: { data?: DailyData[]; loading?: boolean }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <WidgetWrapper title="Google Ads — Trend Zilnic" icon={<Megaphone size={16} />} loading={loading}><div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Nu sunt date disponibile.</div></WidgetWrapper>
  }

  const formatted = data.map(d => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }))

  return (
    <WidgetWrapper title="Google Ads — Trend Zilnic" icon={<Megaphone size={16} />}>
      <div style={{ padding: "16px 24px 24px" }}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="adClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4285f4" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4285f4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="adConv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34a853" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#34a853" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#4285f4" strokeWidth={2} fill="url(#adClicks)" />
            <Area type="monotone" dataKey="conversions" name="Conversii" stroke="#34a853" strokeWidth={2} fill="url(#adConv)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  )
}
