"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
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
  widgets: Array<{ type: string; label: string; enabled: boolean }>
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

  const isEnabled = (type: string) =>
    meta?.widgets.some(w => w.type === type && w.enabled) ?? false

  if (loading) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#64748b", fontSize: 14 }}>Se încarcă raportul...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  if (error || !meta) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Raport Indisponibil</h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>{error || "Raportul nu a fost găsit."}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", minHeight: "100vh", background: "#f8fafc", padding: "0 0 40px" }}>
      {/* Header with Logo + Title + Date Range Picker */}
      <ReportHeader
        title={meta.title}
        clientName={meta.client.name}
        businessLine={meta.businessLine}
        dateRange={dateRange}
        onDateChange={setDateRange}
        loading={dataLoading}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        {/* 🏆 Conversions Hero */}
        {isEnabled("conversions_hero") && (
          <ReportConversions data={data?.conversions_hero as any} loading={dataLoading} />
        )}

        {/* 📊 Source Attribution */}
        {isEnabled("source_attribution") && (
          <ReportAttribution data={data?.source_attribution as any} loading={dataLoading} />
        )}

        {/* 📊 Conversion Details (Landing Pages + Form Submissions) */}
        {isEnabled("conversion_details") && (
          <ReportConversionDetails data={data?.conversion_details as any} loading={dataLoading} />
        )}

        {/* 📣 Google Ads Breakdown */}
        {isEnabled("google_ads_kpis") && (
          <ReportAdsKpis data={data?.google_ads_kpis as any} loading={dataLoading} />
        )}
        {isEnabled("google_ads_trend") && (
          <ReportAdsTrend data={data?.google_ads_trend as any} loading={dataLoading} />
        )}
        {isEnabled("google_ads_tables") && (
          <ReportAdsTables data={data?.google_ads_tables as any} loading={dataLoading} />
        )}
        {isEnabled("google_ads_extended") && (
          <ReportAdsExtendedWidget data={data?.google_ads_extended as any} loading={dataLoading} />
        )}

        {/* 🔍 SEO Breakdown */}
        {isEnabled("seo_kpis") && (
          <ReportSeoKpis data={data?.seo_kpis as any} loading={dataLoading} />
        )}
        {isEnabled("seo_trend") && (
          <ReportSeoTrend data={data?.seo_trend as any} loading={dataLoading} />
        )}
        {isEnabled("seo_tables") && (
          <ReportSeoTables data={data?.seo_tables as any} loading={dataLoading} />
        )}

        {/* 📝 Articole Noi SEO */}
        {isEnabled("seo_articles") && (
          <ReportSeoArticles data={data?.seo_articles as any} loading={dataLoading} />
        )}

        {/* 🔗 SEO Pagini ↔ Keywords + Recomandări */}
        {isEnabled("seo_page_keywords") && (
          <ReportSEOPagesKeywords data={data?.seo_page_keywords as any} loading={dataLoading} />
        )}

        {/* 🌐 Social Breakdown */}
        {isEnabled("social_breakdown") && (
          <ReportSocial data={data?.social_breakdown as any} loading={dataLoading} />
        )}

        {/* 📊 PostHog Traffic Analytics (NEW) */}
        {isEnabled("posthog_traffic") && (
          <ReportPosthogTraffic data={data?.posthog_traffic as any} loading={dataLoading} />
        )}

        {/* 📈 Site Health & Web Vitals */}
        {isEnabled("site_health") && (
          <ReportHealth data={data?.site_health as any} loading={dataLoading} />
        )}

        {/* ⏱ Uptime (NEW) */}
        {isEnabled("uptime") && (
          <ReportUptimeWidget data={data?.uptime as any} loading={dataLoading} />
        )}

        {/* 💡 AI Interpretation */}
        {meta.snapshots.length > 0 && (
          <ReportInterpretation snapshots={meta.snapshots} />
        )}
      </div>

      <ReportFooter businessLine={meta.businessLine} />
    </div>
  )
}
