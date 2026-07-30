"use client"
import { Megaphone } from "lucide-react"
import { WidgetWrapper, DataTable } from "./report-widget-wrapper"
import { useState } from "react"

interface AdsTablesData {
  campaigns: Array<{ name: string; clicks: number; impressions: number; spend: number; conversions: number; roas: number; status: string }>
  convBreakdown: Array<{ actionName: string; allConversions: number; value: number; campaigns: string[] }>
  searchTerms: Array<{ term: string; campaign?: string; clicks: number; impressions: number; ctr: number; cpc: number; conversions: number }>
}

const TABS = [
  { key: "campaigns", label: "Campanii" },
  { key: "conversions", label: "Conversii per Tip" },
  { key: "search", label: "Search Terms" },
]

export function ReportAdsTables({ data, loading }: { data?: AdsTablesData; loading?: boolean }) {
  const [tab, setTab] = useState("campaigns")

  if (!data || (data as any).error) {
    return <WidgetWrapper title="Google Ads — Detalii" icon={<Megaphone size={16} />} loading={loading}><div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Nu sunt date disponibile.</div></WidgetWrapper>
  }

  return (
    <WidgetWrapper title="Google Ads — Detalii" icon={<Megaphone size={16} />}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", padding: "0 24px" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "none", border: "none", fontFamily: "Inter, sans-serif",
              color: tab === t.key ? "#4338ca" : "#94a3b8",
              borderBottom: tab === t.key ? "2px solid #4338ca" : "2px solid transparent",
              transition: "all 0.2s",
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === "campaigns" && (
        <DataTable
          columns={[
            { key: "name", label: "Campanie" },
            { key: "clicks", label: "Clicks", align: "right" },
            { key: "spend", label: "Spend (€)", align: "right" },
            { key: "conversions", label: "Conversii", align: "right" },
            { key: "roas", label: "ROAS", align: "right" },
          ]}
          rows={(data.campaigns || []).map(c => ({ ...c, spend: (c.spend ?? 0).toFixed(2), roas: (c.roas ?? 0).toFixed(1) + "x" }))}
        />
      )}

      {tab === "conversions" && (
        <DataTable
          columns={[
            { key: "actionName", label: "Tip Conversie" },
            { key: "allConversions", label: "Conversii", align: "right" },
            { key: "value", label: "Valoare (€)", align: "right" },
          ]}
          rows={(data.convBreakdown || []).map(c => ({ ...c, value: (c.value ?? 0).toFixed(2) }))}
        />
      )}

      {tab === "search" && (
        <DataTable
          columns={[
            { key: "term", label: "Termen Căutat" },
            { key: "campaign", label: "Campanie" },
            { key: "clicks", label: "Clicks", align: "right" },
            { key: "ctr", label: "CTR", align: "right" },
            { key: "cpc", label: "CPC (€)", align: "right" },
            { key: "conversions", label: "Conv.", align: "right" },
          ]}
          rows={(data.searchTerms || []).map(t => ({ ...t, campaign: t.campaign || "—", ctr: (t.ctr ?? 0) + "%", cpc: (t.cpc ?? 0).toFixed(2) }))}
          maxRows={15}
        />
      )}
    </WidgetWrapper>
  )
}
