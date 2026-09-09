"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { getReportTheme, getThemeCSSVariables } from "@/lib/report-themes"
import { migrateWidgetConfigs, type WidgetConfig, type WidgetSize } from "@/lib/report-widget-catalog"
import { ReportHeader } from "@/components/report/report-header"
import { ReportConversions } from "@/components/report/report-conversions"
import { ReportConversionDetails } from "@/components/report/report-conversion-details"
import { ReportAttribution } from "@/components/report/report-attribution"
import { ReportAdsKpis } from "@/components/report/report-ads-kpis"
import { ReportAdsTrend } from "@/components/report/report-ads-trend"
import { ReportAdsTables } from "@/components/report/report-ads-tables"
import { ReportSeoKpis } from "@/components/report/report-seo-kpis"
import { ReportSeoTrend } from "@/components/report/report-seo-trend"
import { ReportSeoTables } from "@/components/report/report-seo-tables"
import { ReportSeoArticles } from "@/components/report/report-seo-articles"
import { ReportSocial } from "@/components/report/report-social"
import { ReportHealth } from "@/components/report/report-health"
import { ReportPosthogTraffic } from "@/components/report/report-posthog-traffic"
import { ReportUptimeWidget } from "@/components/report/report-uptime-widget"
import { ReportAdsExtendedWidget } from "@/components/report/report-ads-extended-widget"
import { ReportSEOPagesKeywords } from "@/components/report/report-seo-pages-keywords"
import { ReportInterpretation } from "@/components/report/report-interpretation"
import { ReportFooter } from "@/components/report/report-footer"

interface ReportMeta {
  title: string
  notes: string | null
  widgets: Array<{ type: string; label: string; enabled: boolean; order?: number; size?: string }>
  client: { name: string; contact: string; website: string | null; hasGoogleAds: boolean; hasGSC: boolean }
  businessLine: { slug: string; name: string; color: string }
  snapshots: Array<{ id: string; dateFrom: string; dateTo: string; content: string; highlights: unknown; createdAt: string }>
}

function getDefaultDates(): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

// ─── Widget Renderer ───
// Maps widget type to the corresponding component
function WidgetRenderer({ type, data, dataLoading, meta }: {
  type: string
  data: Record<string, unknown> | null
  dataLoading: boolean
  meta: ReportMeta
}) {
  switch (type) {
    case "conversions_hero":
      return <ReportConversions data={data?.conversions_hero as any} loading={dataLoading} />
    case "source_attribution":
      return <ReportAttribution data={data?.source_attribution as any} loading={dataLoading} />
    case "conversion_details":
      return <ReportConversionDetails data={data?.conversion_details as any} loading={dataLoading} />
    case "google_ads_kpis":
      return <ReportAdsKpis data={data?.google_ads_kpis as any} loading={dataLoading} />
    case "google_ads_trend":
      return <ReportAdsTrend data={data?.google_ads_trend as any} loading={dataLoading} />
    case "google_ads_tables":
      return <ReportAdsTables data={data?.google_ads_tables as any} loading={dataLoading} />
    case "google_ads_extended":
      return <ReportAdsExtendedWidget data={data?.google_ads_extended as any} loading={dataLoading} />
    case "seo_kpis":
      return <ReportSeoKpis data={data?.seo_kpis as any} loading={dataLoading} />
    case "seo_trend":
      return <ReportSeoTrend data={data?.seo_trend as any} loading={dataLoading} />
    case "seo_tables":
      return <ReportSeoTables data={data?.seo_tables as any} loading={dataLoading} />
    case "seo_articles":
      return <ReportSeoArticles data={data?.seo_articles as any} loading={dataLoading} />
    case "seo_page_keywords":
      return <ReportSEOPagesKeywords data={data?.seo_page_keywords as any} loading={dataLoading} />
    case "social_breakdown":
      return <ReportSocial data={data?.social_breakdown as any} loading={dataLoading} />
    case "posthog_traffic":
      return <ReportPosthogTraffic data={data?.posthog_traffic as any} loading={dataLoading} />
    case "site_health":
      return <ReportHealth data={data?.site_health as any} loading={dataLoading} />
    case "uptime":
      return <ReportUptimeWidget data={data?.uptime as any} loading={dataLoading} />
    case "interpretation":
      return meta.snapshots.length > 0 ? <ReportInterpretation snapshots={meta.snapshots} /> : null
    default:
      return null
  }
}

export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>()
  const [meta, setMeta] = useState<ReportMeta | null>(null)
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState(getDefaultDates)

  // Fetch report metadata
  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(`/api/reports/public/${token}`)
        if (!res.ok) throw new Error("Raport indisponibil")
        const json = await res.json()
        setMeta(json.data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchMeta()
  }, [token])

  // Fetch widget data when date range changes
  const fetchData = useCallback(async () => {
    if (!meta) return
    setDataLoading(true)
    try {
      const enabledWidgets = meta.widgets.filter(w => w.enabled).map(w => w.type)
      const res = await fetch(
        `/api/reports/public/${token}/data?widgets=${enabledWidgets.join(",")}&from=${dateRange.from}&to=${dateRange.to}`
      )
      if (!res.ok) throw new Error("Eroare la încărcarea datelor")
      const json = await res.json()
      setData(json.data)
    } catch (err: any) {
      console.error("Data fetch error:", err)
    } finally {
      setDataLoading(false)
    }
  }, [meta, token, dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Resolve theme ──
  const theme = meta?.businessLine ? getReportTheme(meta.businessLine.slug) : getReportTheme("agency")
  const themeVars = getThemeCSSVariables(theme)

  // ── Migrate & sort widget configs ──
  const sortedWidgets: WidgetConfig[] = meta
    ? migrateWidgetConfigs(meta.widgets as Array<{ type: string; label?: string; enabled: boolean; order?: number; size?: WidgetSize }>)
        .filter(w => w.enabled)
        .sort((a, b) => a.order - b.order)
    : []

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{
        fontFamily: "Inter, sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: theme.surface,
        ...themeVars as any,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40,
            border: "3px solid #e2e8f0", borderTopColor: theme.spinnerColor,
            borderRadius: "50%", animation: "spin 1s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ color: "#64748b", fontSize: 14 }}>Se încarcă raportul...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error || !meta) {
    return (
      <div style={{
        fontFamily: "Inter, sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#f8fafc",
      }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Raport Indisponibil</h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>{error || "Raportul nu a fost găsit."}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: "Inter, sans-serif",
      minHeight: "100vh",
      background: theme.surface,
      padding: "0 0 40px",
      ...themeVars as any,
    }}>
      {/* Header with Logo + Title + Date Range Picker */}
      <ReportHeader
        title={meta.title}
        clientName={meta.client.name}
        businessLine={meta.businessLine}
        dateRange={dateRange}
        onDateChange={setDateRange}
        loading={dataLoading}
        theme={theme}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        {/* ── Widget Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {sortedWidgets.map(widget => {
            const isFull = widget.size === "full"

            // Hide empty widgets once data is loaded
            if (!dataLoading && data) {
              const widgetData = data[widget.type]
              const isDataEmpty = 
                widgetData === null || 
                (Array.isArray(widgetData) && widgetData.length === 0) ||
                (typeof widgetData === "object" && !Array.isArray(widgetData) && Object.keys(widgetData || {}).length === 0)
              
              if (isDataEmpty && [
                "source_attribution", 
                "google_ads_tables", 
                "seo_tables",
                "seo_articles",
                "social_breakdown",
                "google_ads_trend",
                "seo_trend",
                "posthog_traffic",
                "seo_page_keywords"
              ].includes(widget.type)) {
                return null
              }
            }

            return (
              <div
                key={widget.type}
                className={isFull ? "col-span-1 md:col-span-2" : "col-span-1"}
                style={{ minWidth: 0 }}
              >
                <WidgetRenderer
                  type={widget.type}
                  data={data}
                  dataLoading={dataLoading}
                  meta={meta}
                />
              </div>
            )
          })}
        </div>
      </div>

      <ReportFooter businessLine={meta.businessLine} theme={theme} />
    </div>
  )
}
