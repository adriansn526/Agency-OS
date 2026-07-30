"use client"
import { Megaphone } from "lucide-react"
import { WidgetWrapper, DataTable } from "./report-widget-wrapper"
import { useState } from "react"

interface AdsExtendedData {
  deviceBreakdown?: Array<{ device: string; impressions: number; clicks: number; spend: number; conversions: number; ctr: number }>
  impressionShare?: Array<{ campaignName: string; searchImpressionShare: number | null; lostIsBudget: number | null; lostIsRank: number | null }>
  keywords?: Array<{ keyword: string; matchType: string; qualityScore: number | null; impressions: number; clicks: number; spend: number; ctr: number; cpc: number }>
  hourOfDay?: Array<{ hour: number; label: string; impressions: number; clicks: number; spend: number; conversions: number }>
  dayOfWeek?: Array<{ day: string; label: string; impressions: number; clicks: number; spend: number; conversions: number }>
  adGroups?: Array<{ id: string; name: string; campaignName: string; metrics: Record<string, number> }>
}

const TABS = [
  { key: "devices", label: "Dispozitive" },
  { key: "keywords", label: "Keywords" },
  { key: "impressionShare", label: "Impression Share" },
  { key: "schedule", label: "Orar" },
  { key: "adGroups", label: "Ad Groups" },
]

export function ReportAdsExtendedWidget({ data, loading }: { data?: AdsExtendedData; loading?: boolean }) {
  const [tab, setTab] = useState("devices")

  if (!data || (data as any).error) {
    return null // Don't render at all if no extended data
  }

  const hasAnyData = (data.deviceBreakdown?.length || data.keywords?.length || data.impressionShare?.length || data.hourOfDay?.length || data.adGroups?.length)
  if (!hasAnyData) return null

  return (
    <WidgetWrapper title="Google Ads — Analiză Extinsă" icon={<Megaphone size={16} />}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", padding: "0 24px", overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: "none", border: "none", fontFamily: "Inter, sans-serif",
              color: tab === t.key ? "#4338ca" : "#94a3b8",
              borderBottom: tab === t.key ? "2px solid #4338ca" : "2px solid transparent",
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Devices */}
      {tab === "devices" && data.deviceBreakdown && (
        <div style={{ padding: 24 }}>
          {/* Visual bar */}
          <div style={{ display: "flex", height: 10, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            {data.deviceBreakdown.map((d, i) => {
              const total = data.deviceBreakdown!.reduce((s, x) => s + x.clicks, 0)
              const colors = ["#6366f1", "#8b5cf6", "#f59e0b", "#10b981"]
              return (
                <div key={d.device} style={{
                  width: `${total > 0 ? (d.clicks / total) * 100 : 0}%`,
                  background: colors[i % colors.length],
                  transition: "width 0.3s",
                }} />
              )
            })}
          </div>
          <DataTable
            columns={[
              { key: "device", label: "Dispozitiv" },
              { key: "clicks", label: "Clicks", align: "right" },
              { key: "impressions", label: "Impressions", align: "right" },
              { key: "ctr", label: "CTR", align: "right" },
              { key: "spend", label: "Cost (€)", align: "right" },
              { key: "conversions", label: "Conv.", align: "right" },
            ]}
            rows={data.deviceBreakdown.map(d => ({
              ...d,
              ctr: d.ctr + "%",
              spend: d.spend.toFixed(2),
            }))}
          />
        </div>
      )}

      {/* Keywords with Quality Score */}
      {tab === "keywords" && data.keywords && (
        <DataTable
          columns={[
            { key: "keyword", label: "Keyword" },
            { key: "qs", label: "QS", align: "right" },
            { key: "clicks", label: "Clicks", align: "right" },
            { key: "ctr", label: "CTR", align: "right" },
            { key: "cpc", label: "CPC (€)", align: "right" },
            { key: "spend", label: "Cost (€)", align: "right" },
          ]}
          rows={data.keywords.map(k => ({
            keyword: k.keyword,
            qs: k.qualityScore != null ? `${k.qualityScore}/10` : "—",
            clicks: k.clicks,
            ctr: k.ctr + "%",
            cpc: k.cpc.toFixed(2),
            spend: k.spend.toFixed(2),
          }))}
          maxRows={15}
        />
      )}

      {/* Impression Share */}
      {tab === "impressionShare" && data.impressionShare && (
        <div style={{ padding: 24 }}>
          {data.impressionShare.map(row => (
            <div key={row.campaignName} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.campaignName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${row.searchImpressionShare || 0}%`,
                    background: "#10b981",
                    borderRadius: 4,
                    transition: "width 0.3s",
                  }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#334155", minWidth: 40, textAlign: "right" }}>
                  {row.searchImpressionShare != null ? `${row.searchImpressionShare}%` : "—"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                {row.lostIsBudget != null && <span>Pierdut (buget): {row.lostIsBudget}%</span>}
                {row.lostIsRank != null && <span>Pierdut (rank): {row.lostIsRank}%</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Time Schedule */}
      {tab === "schedule" && (
        <div style={{ padding: 24 }}>
          {/* Hour heatmap */}
          {data.hourOfDay && data.hourOfDay.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Clicks per oră</div>
              <div style={{ display: "flex", gap: 1 }}>
                {data.hourOfDay.map(h => {
                  const max = Math.max(...data.hourOfDay!.map(x => x.clicks), 1)
                  const intensity = h.clicks / max
                  const bg = intensity > 0.7 ? "#4338ca" : intensity > 0.3 ? "#818cf8" : intensity > 0 ? "#c7d2fe" : "#f1f5f9"
                  return (
                    <div key={h.hour} style={{
                      flex: 1, height: 24, borderRadius: 2, background: bg,
                      transition: "background 0.2s",
                    }} title={`${h.label}: ${h.clicks} clicks, €${h.spend}`} />
                  )
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
              </div>
            </div>
          )}

          {/* Day of week */}
          {data.dayOfWeek && data.dayOfWeek.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Clicks per zi</div>
              {data.dayOfWeek.map(d => {
                const max = Math.max(...data.dayOfWeek!.map(x => x.clicks), 1)
                return (
                  <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "#64748b", width: 30 }}>{d.label.slice(0, 3)}</span>
                    <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(d.clicks / max) * 100}%`, background: "#8b5cf6", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "#64748b", width: 35, textAlign: "right" }}>{d.clicks}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Ad Groups */}
      {tab === "adGroups" && data.adGroups && (
        <DataTable
          columns={[
            { key: "name", label: "Ad Group" },
            { key: "campaign", label: "Campanie" },
            { key: "clicks", label: "Clicks", align: "right" },
            { key: "spend", label: "Cost (€)", align: "right" },
            { key: "conversions", label: "Conv.", align: "right" },
            { key: "roas", label: "ROAS", align: "right" },
          ]}
          rows={data.adGroups.map(ag => ({
            name: ag.name,
            campaign: ag.campaignName,
            clicks: ag.metrics?.clicks || 0,
            spend: (ag.metrics?.spend || 0).toFixed(2),
            conversions: ag.metrics?.conversions || 0,
            roas: (ag.metrics?.roas || 0).toFixed(1) + "x",
          }))}
          maxRows={10}
        />
      )}
    </WidgetWrapper>
  )
}
