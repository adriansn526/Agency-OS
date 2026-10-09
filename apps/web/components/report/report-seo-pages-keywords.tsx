"use client"
import { useState } from "react"
import { Link2, Lightbulb, AlertTriangle, TrendingUp, Zap, ArrowRight } from "lucide-react"
import { WidgetWrapper, KpiCard } from "./report-widget-wrapper"

// ─── Types ───

interface PageKeywordData {
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface SEORecommendation {
  type: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  pages?: string[]
  keywords?: string[]
  metrics?: Record<string, number | string>
}

interface SEOAnalysisData {
  recommendations: SEORecommendation[]
  summary: {
    totalPages: number
    totalKeywords: number
    avgPosition: number
    cannibalizationCount: number
    lowHangingFruitCount: number
    strongPages: number
    topKeywordsCovered: number
  }
  pageKeywordMap: Array<{
    page: string
    keywords: Array<{ query: string; clicks: number; impressions: number; position: number }>
    totalClicks: number
    totalImpressions: number
    avgPosition: number
    keywordCount: number
  }>
}

// ─── Sub-components ───

const posColor = (pos: number) =>
  pos <= 3 ? '#22c55e' : pos <= 10 ? '#eab308' : pos <= 20 ? '#f97316' : '#94a3b8'

const severityConfig = {
  high: { bg: '#ef44441a', border: '#ef44443d', color: '#ef4444', icon: AlertTriangle, label: 'Urgent' },
  medium: { bg: '#f59e0b1a', border: '#f59e0b3d', color: '#f59e0b', icon: Lightbulb, label: 'Recomandat' },
  low: { bg: '#22c55e1a', border: '#22c55e3d', color: '#22c55e', icon: TrendingUp, label: 'Sugestie' },
}

// ─── Main Widget ───

export function ReportSEOPagesKeywords({
  data,
  loading
}: {
  data?: { analysis: SEOAnalysisData; raw: PageKeywordData[] }
  loading?: boolean
}) {
  const tab = 'pages' as const
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  const analysis = data?.analysis
  const summary = analysis?.summary

  if (!loading && (!analysis || !analysis.pageKeywordMap || analysis.pageKeywordMap.length === 0)) return null

  return (
    <WidgetWrapper title="SEO — Pagini & Keywords" icon={<Link2 size={16} />} loading={loading}>
      {/* Summary KPIs */}
      <div style={{ padding: "16px 24px 8px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KpiCard
          label="Pagini Indexate"
          value={summary?.totalPages ?? "—"}
          color="#6366f1"
          sublabel="cu trafic organic"
        />
        <KpiCard
          label="Keywords"
          value={summary?.totalKeywords ?? "—"}
          color="#22c55e"
          sublabel={`${summary?.topKeywordsCovered ?? 0} în top 3`}
        />
        <KpiCard
          label="Poziție Medie Keywords"
          value={summary?.avgPosition ?? "—"}
          color={posColor(summary?.avgPosition ?? 99)}
          sublabel="toate paginile"
        />
      </div>

      {/* Tab Content */}
      <div style={{ padding: 24 }}>
        {/* Pages ↔ Keywords Tab */}
        {tab === 'pages' && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(!analysis?.pageKeywordMap || analysis.pageKeywordMap.length === 0) ? (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 24 }}>
                Nu sunt date de pagini ↔ keywords disponibile.
              </p>
            ) : (
              analysis.pageKeywordMap.map((pm, i) => {
                const isExpanded = expandedPage === pm.page
                return (
                  <div key={i} style={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                  }}>
                    {/* Page header */}
                    <button
                      onClick={() => setExpandedPage(isExpanded ? null : pm.page)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isExpanded ? '#f8fafc' : '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                        maxWidth: '60%',
                      }}>
                        {pm.page}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: '#94a3b8' }}>
                        <span><strong style={{ color: '#6366f1' }}>{pm.keywordCount}</strong> kw</span>
                        <span><strong style={{ color: '#22c55e' }}>{pm.totalClicks}</strong> clicks</span>
                        <span>poz. <strong style={{ color: posColor(pm.avgPosition) }}>{pm.avgPosition}</strong></span>
                        <ArrowRight size={12} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      </div>
                    </button>

                    {/* Expanded keywords */}
                    {isExpanded && (
                      <div style={{ padding: '8px 14px 12px', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {pm.keywords.map((kw, j) => (
                            <span key={j} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              padding: '3px 8px',
                              borderRadius: 20,
                              border: `1px solid ${posColor(kw.position)}3d`,
                              background: `${posColor(kw.position)}0d`,
                              color: '#475569',
                            }}
                            title={`Clicks: ${kw.clicks} | Impresii: ${kw.impressions} | Poziție: ${kw.position}`}
                            >
                              {kw.query}
                              <span style={{ fontWeight: 700, color: posColor(kw.position) }}>#{kw.position}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </WidgetWrapper>
  )
}
