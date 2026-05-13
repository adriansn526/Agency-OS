"use client"
import { WidgetWrapper } from "./report-widget-wrapper"

interface ArticleData {
  page: string; clicks: number; impressions: number; ctr: number; position: number
}

export function ReportSeoArticles({ data, loading }: { data?: ArticleData[]; loading?: boolean }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <WidgetWrapper title="Articole Noi — Content SEO" icon="📝" loading={loading}>
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          Nu au fost detectate articole noi pentru această perioadă.
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper title="Articole Noi — Content SEO" icon="📝">
      <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {data.map((article, i) => {
          // Extract clean title from URL
          const urlPath = article.page.replace(/^https?:\/\/[^/]+/, "")
          const slug = urlPath.split("/").filter(Boolean).pop() || urlPath
          const title = slug.replace(/-/g, " ").replace(/(^|\s)\S/g, l => l.toUpperCase())

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "14px 18px", background: "#fafbfc",
              borderRadius: 12, border: "1px solid #f1f5f9",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #059669, #34a853)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{urlPath}</p>
              </div>
              <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#059669" }}>{article.clicks}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>clicks</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#64748b" }}>{(article.impressions ?? 0).toLocaleString("ro-RO")}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>impr.</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </WidgetWrapper>
  )
}
