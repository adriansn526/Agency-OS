"use client"
import { Search } from "lucide-react"
import { WidgetWrapper, DataTable } from "./report-widget-wrapper"
import { useState } from "react"

interface SeoTablesData {
  queries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
  pages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>
}

export function ReportSeoTables({ data, loading }: { data?: SeoTablesData; loading?: boolean }) {
  const [tab, setTab] = useState<"keywords" | "pages">("keywords")

  if (!data || (data as any).error) {
    return <WidgetWrapper title="SEO — Detalii" icon={<Search size={16} />} loading={loading}><div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Nu sunt date disponibile.</div></WidgetWrapper>
  }

  return (
    <WidgetWrapper title="SEO — Detalii" icon={<Search size={16} />}>
      <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", padding: "0 24px" }}>
        <button onClick={() => setTab("keywords")} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", border: "none", fontFamily: "Inter, sans-serif", color: tab === "keywords" ? "#059669" : "#94a3b8", borderBottom: tab === "keywords" ? "2px solid #059669" : "2px solid transparent" }}>Top Keywords</button>
        <button onClick={() => setTab("pages")} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", border: "none", fontFamily: "Inter, sans-serif", color: tab === "pages" ? "#059669" : "#94a3b8", borderBottom: tab === "pages" ? "2px solid #059669" : "2px solid transparent" }}>Top Pagini</button>
      </div>

      {tab === "keywords" && (
        <DataTable
          columns={[
            { key: "query", label: "Keyword" },
            { key: "clicks", label: "Clicks", align: "right" },
            { key: "impressions", label: "Impr.", align: "right" },
            { key: "ctr", label: "CTR", align: "right" },
            { key: "position", label: "Poz.", align: "right" },
          ]}
          rows={(data.queries || []).map(q => ({ ...q, ctr: (q.ctr ?? 0).toFixed(1) + "%", position: (q.position ?? 0).toFixed(1) }))}
          maxRows={20}
        />
      )}

      {tab === "pages" && (
        <DataTable
          columns={[
            { key: "pageShort", label: "Pagină" },
            { key: "clicks", label: "Clicks", align: "right" },
            { key: "impressions", label: "Impr.", align: "right" },
            { key: "ctr", label: "CTR", align: "right" },
          ]}
          rows={(data.pages || []).map(p => ({
            ...p,
            pageShort: p.page.replace(/^https?:\/\/[^/]+/, "").slice(0, 60),
            ctr: (p.ctr ?? 0).toFixed(1) + "%",
          }))}
          maxRows={20}
        />
      )}
    </WidgetWrapper>
  )
}
