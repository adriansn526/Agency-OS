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
  const [tab, setTab] = useState<'recommendations' | 'pages'>('recommendations')
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  const analysis = data?.analysis
  const summary = analysis?.summary

  if (!analysis && !loading) return null

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
          label="Poziție Medie"
          value={summary?.avgPosition ?? "—"}
          color={posColor(summary?.avgPosition ?? 99)}
          sublabel="toate paginile"
        />
        <KpiCard
          label="Oportunități"
          value={summary?.lowHangingFruitCount ?? 0}
          color="#f59e0b"
          sublabel="low-hanging fruit"
        />
      </div>

      {/* Tabs */}
      <div style={{ padding: "8px 24px", display: "flex", gap: 8, borderBottom: "1px solid #e2e8f0" }}>
        {[
          { key: 'recommendations' as const, label: '💡 Recomandări SEO', count: analysis?.recommendations.length },
          { key: 'pages' as const, label: '🔗 Pagini ↔ Keywords', count: summary?.totalPages },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? '#6366f1' : '#94a3b8',
              borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            {t.label} {t.count !== undefined && <span style={{ opacity: 0.6, marginLeft: 4 }}>({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: 24 }}>
        {/* Recommendations Tab */}
        {tab === 'recommendations' && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(!analysis?.recommendations || analysis.recommendations.length === 0) ? (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 24 }}>
                Nu sunt suficiente date GSC pentru a genera recomandări.
              </p>
            ) : (
              <>
                {/* Cannibalization alert */}
                {(summary?.cannibalizationCount ?? 0) > 0 && (
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#ef44440d',
                    border: '1px solid #ef44441a',
                    fontSize: 12,
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <AlertTriangle size={14} />
                    <span><strong>{summary?.cannibalizationCount}</strong> cazuri de canibalizare keywords detectate</span>
                  </div>
                )}

                {analysis.recommendations.map((rec, i) => {
                  const config = severityConfig[rec.severity]
                  const Icon = config.icon
                  return (
                    <div key={i} style={{
                      padding: 14,
                      borderRadius: 10,
                      background: config.bg,
                      border: `1px solid ${config.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <Icon size={14} style={{ color: config.color, marginTop: 2, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase' as const,
                              color: config.color,
                              background: `${config.color}1a`,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}>
                              {config.label}
                            </span>
                            <span style={{
                              fontSize: 9,
                              color: '#94a3b8',
                              textTransform: 'uppercase' as const,
                            }}>
                              {rec.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                            {rec.title}
                          </p>
                          <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                            {rec.description}
                          </p>
                          {rec.metrics && (
                            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                              {Object.entries(rec.metrics).map(([key, val]) => (
                                <span key={key} style={{
                                  fontSize: 10,
                                  color: '#64748b',
                                  background: '#f1f5f9',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                }}>
                                  {key}: <strong>{val}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

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
