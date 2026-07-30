"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Search, Loader2, RefreshCcw, Globe, Target, AlertTriangle,
  CheckCircle2, XCircle, ChevronDown, ExternalLink, Lightbulb,
  FileText, Link2, Image, Code, TrendingUp, BarChart3, Users,
  ArrowRight, Eye
} from "lucide-react"

// ─── Types ───

interface DomainOption {
  domain: string
  clientName: string
  gscUrl: string
}

interface PageAnalysis {
  url: string
  overallScore: number
  title: { value: string; length: number; score: string }
  metaDescription: { value: string; length: number; score: string }
  h1: { count: number; values: string[] }
  h2: { count: number; values: string[] }
  wordCount: number
  readingTimeMin: number
  internalLinks: { count: number }
  externalLinks: { count: number }
  totalImages: number
  imagesWithoutAlt: number
  hasSchemaMarkup: boolean
  schemaTypes: string[]
  issues: Array<{ severity: string; category: string; message: string; fix: string }>
  scoreBreakdown: { meta: number; content: number; technical: number; links: number; images: number }
  keywordDensity: Array<{ word: string; count: number; density: number }>
  headingHierarchy: Array<{ tag: string; text: string; level: number }>
}

interface SerpCompetitor {
  domain: string
  occurrences: number
  keywords: string[]
  avgPosition: number
  threat: string
}

// ─── Score Helpers ───

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400"
  const bg = score >= 80 ? "bg-green-500/10 border-green-500/20" : score >= 60 ? "bg-yellow-500/10 border-yellow-500/20" : score >= 40 ? "bg-orange-500/10 border-orange-500/20" : "bg-red-500/10 border-red-500/20"
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-16 h-16 text-lg" }

  return (
    <div className={cn("rounded-full border-2 flex items-center justify-center font-bold", bg, color, sizes[size])}>
      {score}
    </div>
  )
}

function CategoryScore({ label, score, icon: Icon }: { label: string; score: number; icon: any }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : score >= 40 ? "bg-orange-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className="text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className="text-[11px] font-bold text-foreground">{score}/100</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    error: { bg: "bg-red-500/10", text: "text-red-400", label: "Eroare" },
    warning: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Atenție" },
    info: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Info" },
  }
  const c = config[severity] || config.info!
  return <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", c.bg, c.text)}>{c.label}</span>
}

// ─── Main Page ───

export default function SeoPage() {
  const [domains, setDomains] = useState<DomainOption[]>([])
  const [selectedDomain, setSelectedDomain] = useState("")
  const [activeTab, setActiveTab] = useState<"overview" | "analyze" | "audit" | "competitors">("overview")
  const [loading, setLoading] = useState(false)

  // Overview state
  const [overview, setOverview] = useState<any>(null)

  // Analyze state
  const [analyzeUrl, setAnalyzeUrl] = useState("")
  const [analyzeKeyword, setAnalyzeKeyword] = useState("")
  const [analysis, setAnalysis] = useState<PageAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // Audit state
  const [auditResult, setAuditResult] = useState<any>(null)
  const [auditing, setAuditing] = useState(false)
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  // Competitors state
  const [competitors, setCompetitors] = useState<SerpCompetitor[]>([])
  const [discovering, setDiscovering] = useState(false)

  // Domains loading state
  const [domainsLoading, setDomainsLoading] = useState(true)

  // Load domains
  useEffect(() => {
    setDomainsLoading(true)
    fetch("/api/reports/domains")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const opts = data.map((d: any) => ({
            domain: d.domain,
            clientName: d.clientName || d.domain,
            gscUrl: d.gscSiteUrl || "",
          }))
          setDomains(opts)
          if (opts.length > 0 && opts[0]) setSelectedDomain(opts[0].domain)
        }
      })
      .catch(console.error)
      .finally(() => setDomainsLoading(false))
  }, [])

  // Load overview when domain changes
  const loadOverview = useCallback(async () => {
    if (!selectedDomain) return
    setLoading(true)
    try {
      const res = await fetch(`/api/seo/dashboard?domain=${encodeURIComponent(selectedDomain)}&action=overview`)
      const data = await res.json()
      setOverview(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedDomain])

  useEffect(() => { loadOverview() }, [loadOverview])

  // Analyze single page
  const runAnalysis = async () => {
    if (!analyzeUrl) return
    setAnalyzing(true)
    setAnalysis(null)
    try {
      const url = analyzeUrl.startsWith("http") ? analyzeUrl : `https://${analyzeUrl}`
      const params = new URLSearchParams({ domain: selectedDomain, action: "analyze", url })
      if (analyzeKeyword) params.set("keyword", analyzeKeyword)
      const res = await fetch(`/api/seo/dashboard?${params}`)
      const data = await res.json()
      setAnalysis(data)
    } catch (err) {
      console.error(err)
    } finally {
      setAnalyzing(false)
    }
  }

  // Run full audit
  const runAudit = async () => {
    setAuditing(true)
    setAuditResult(null)
    try {
      const res = await fetch(`/api/seo/dashboard?domain=${encodeURIComponent(selectedDomain)}&action=audit&maxPages=30`)
      const data = await res.json()
      setAuditResult(data)
    } catch (err) {
      console.error(err)
    } finally {
      setAuditing(false)
    }
  }

  // Discover competitors
  const runCompetitorDiscovery = async () => {
    setDiscovering(true)
    setCompetitors([])
    try {
      const res = await fetch(`/api/seo/dashboard?domain=${encodeURIComponent(selectedDomain)}&action=competitors`)
      const data = await res.json()
      setCompetitors(data.competitors || [])
    } catch (err) {
      console.error(err)
    } finally {
      setDiscovering(false)
    }
  }

  const tabs = [
    { key: "overview" as const, label: "📊 Overview", icon: BarChart3 },
    { key: "analyze" as const, label: "📄 Analiză Pagină", icon: FileText },
    { key: "audit" as const, label: "🏥 Audit Site", icon: Search },
    { key: "competitors" as const, label: "🔍 Competitori", icon: Users },
  ]

  // Show loading state while fetching domains
  if (domainsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary mr-3" size={24} />
        <span className="text-sm text-muted-foreground">Se încarcă domeniile...</span>
      </div>
    )
  }

  // Show empty state if no domains configured
  if (domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Globe size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Niciun domeniu configurat</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Configurează cel puțin un domeniu cu Google Search Console în secțiunea CRM → Client → Domenii
          pentru a putea folosi SEO Dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with domain selector */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">🔍 SEO Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">Audit centralizat, analiză per pagină, recomandări SEO</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Alege domeniul</label>
              <select
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground font-medium min-w-[280px]"
              >
                {domains.map(d => (
                  <option key={d.domain} value={d.domain}>{d.clientName} — {d.domain}</option>
                ))}
              </select>
            </div>
            <button onClick={loadOverview} className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors mt-4">
              <RefreshCcw size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px",
              activeTab === t.key
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary mr-2" size={20} />
          <span className="text-sm text-muted-foreground">Se încarcă datele SEO pentru {selectedDomain}...</span>
        </div>
      )}

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === "overview" && !loading && overview && (
        <div className="space-y-4">
          {/* Last audit score */}
          {overview.lastAudit && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <div className="flex items-center gap-5">
                <ScoreBadge score={overview.lastAudit.score} size="lg" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Scor SEO General</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ultimul audit: {new Date(overview.lastAudit.createdAt).toLocaleDateString("ro-RO")} ·
                    {" "}{overview.lastAudit.summary?.pagesAnalyzed || 0} pagini analizate
                  </p>
                </div>
                <button
                  onClick={() => { setActiveTab("audit"); runAudit() }}
                  className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Audit Nou
                </button>
              </div>
            </div>
          )}

          {/* SEO Analysis / Recommendations */}
          {overview.seoAnalysis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Pagini cu Trafic", value: overview.seoAnalysis.summary.totalPages, color: "text-primary" },
                { label: "Keywords", value: overview.seoAnalysis.summary.totalKeywords, color: "text-green-400" },
                { label: "Canibalizare", value: overview.seoAnalysis.summary.cannibalizationCount, color: "text-red-400" },
                { label: "Oportunități", value: overview.seoAnalysis.summary.lowHangingFruitCount, color: "text-yellow-400" },
              ].map((kpi, i) => (
                <div key={i} className="bg-surface rounded-xl border border-border p-4 text-center">
                  <p className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{kpi.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Top Recommendations */}
          {overview.seoAnalysis?.recommendations?.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">💡 Top Recomandări SEO</h3>
              <div className="space-y-2">
                {overview.seoAnalysis.recommendations.slice(0, 8).map((rec: any, i: number) => (
                  <div key={i} className={cn(
                    "rounded-lg p-3 border",
                    rec.severity === "high" ? "bg-red-500/5 border-red-500/10" :
                    rec.severity === "medium" ? "bg-yellow-500/5 border-yellow-500/10" :
                    "bg-green-500/5 border-green-500/10"
                  )}>
                    <p className="text-xs font-semibold text-foreground">{rec.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick action buttons */}
          {!overview.lastAudit && (
            <div className="bg-surface rounded-xl border border-border p-5 text-center">
              <p className="text-sm text-muted-foreground mb-4">Nu există audit anterior. Rulează primul audit SEO:</p>
              <button
                onClick={() => { setActiveTab("audit"); runAudit() }}
                className="px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
              >
                🏥 Rulează Audit SEO
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ ANALYZE PAGE TAB ═══ */}
      {activeTab === "analyze" && (
        <div className="space-y-4">
          {/* Input */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">📄 Analiză Pagină — Tip Yoast / Rank Math</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={analyzeUrl}
                onChange={e => setAnalyzeUrl(e.target.value)}
                placeholder="https://example.com/pagina"
                className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                onKeyDown={e => e.key === "Enter" && runAnalysis()}
              />
              <input
                type="text"
                value={analyzeKeyword}
                onChange={e => setAnalyzeKeyword(e.target.value)}
                placeholder="Keyword focus (opțional)"
                className="w-64 bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={runAnalysis}
                disabled={analyzing || !analyzeUrl}
                className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Analizează
              </button>
            </div>
          </div>

          {/* Results */}
          {analyzing && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary mr-2" size={20} />
              <span className="text-sm text-muted-foreground">Se analizează pagina...</span>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* Score Header */}
              <div className="bg-surface rounded-xl border border-border p-5">
                <div className="flex items-center gap-6">
                  <ScoreBadge score={analysis.overallScore} size="lg" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">{analysis.url}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analysis.wordCount} cuvinte · {analysis.readingTimeMin} min citire ·
                      {" "}{analysis.issues.length} probleme detectate
                    </p>
                  </div>
                  <a href={analysis.url} target="_blank" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    <ExternalLink size={14} className="text-muted-foreground" />
                  </a>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="bg-surface rounded-xl border border-border p-5">
                <h4 className="text-xs font-semibold text-foreground mb-4 uppercase tracking-wider">Score Breakdown</h4>
                <div className="space-y-3">
                  <CategoryScore label="Meta (Title, Description, OG)" score={analysis.scoreBreakdown.meta} icon={FileText} />
                  <CategoryScore label="Conținut (H1, Cuvinte, Structură)" score={analysis.scoreBreakdown.content} icon={Target} />
                  <CategoryScore label="Tehnic (Schema, Viewport, Viteză)" score={analysis.scoreBreakdown.technical} icon={Code} />
                  <CategoryScore label="Link-uri (Interne, Externe)" score={analysis.scoreBreakdown.links} icon={Link2} />
                  <CategoryScore label="Imagini (Alt text)" score={analysis.scoreBreakdown.images} icon={Image} />
                </div>
              </div>

              {/* Issues */}
              <div className="bg-surface rounded-xl border border-border p-5">
                <h4 className="text-xs font-semibold text-foreground mb-4 uppercase tracking-wider">
                  Probleme Detectate ({analysis.issues.length})
                </h4>
                <div className="space-y-2">
                  {analysis.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <SeverityBadge severity={issue.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{issue.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">💡 {issue.fix}</p>
                      </div>
                    </div>
                  ))}
                  {analysis.issues.length === 0 && (
                    <div className="text-center py-4">
                      <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                      <p className="text-xs text-green-400 font-medium">Nicio problemă detectată! 🎉</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title & Meta */}
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Meta Tags</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Title ({analysis.title.length} chars)</span>
                        <span className={cn("text-[9px] font-bold uppercase",
                          analysis.title.score === "good" ? "text-green-400" : analysis.title.score === "warning" ? "text-yellow-400" : "text-red-400"
                        )}>{analysis.title.score}</span>
                      </div>
                      <p className="text-xs text-foreground bg-background/50 rounded p-2 truncate">{analysis.title.value || "—"}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Meta Description ({analysis.metaDescription.length} chars)</span>
                        <span className={cn("text-[9px] font-bold uppercase",
                          analysis.metaDescription.score === "good" ? "text-green-400" : analysis.metaDescription.score === "warning" ? "text-yellow-400" : "text-red-400"
                        )}>{analysis.metaDescription.score}</span>
                      </div>
                      <p className="text-xs text-foreground bg-background/50 rounded p-2 line-clamp-2">{analysis.metaDescription.value || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Heading Structure */}
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Structură Headings</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {analysis.headingHierarchy.slice(0, 20).map((h, i) => (
                      <div key={i} className="flex items-center gap-2" style={{ paddingLeft: (h.level - 1) * 12 }}>
                        <span className={cn(
                          "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                          h.level === 1 ? "bg-primary/10 text-primary" :
                          h.level === 2 ? "bg-blue-500/10 text-blue-400" :
                          "bg-muted text-muted-foreground"
                        )}>{h.tag}</span>
                        <span className="text-[11px] text-foreground truncate">{h.text}</span>
                      </div>
                    ))}
                    {analysis.headingHierarchy.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nicio structură de headings detectată</p>
                    )}
                  </div>
                </div>

                {/* Keyword Density */}
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Keyword Density</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {analysis.keywordDensity.slice(0, 15).map((kw, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{kw.word}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{kw.count}×</span>
                          <span className={cn("text-[10px] font-bold",
                            kw.density > 3 ? "text-red-400" : kw.density >= 1 ? "text-green-400" : "text-muted-foreground"
                          )}>{kw.density}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Statistici</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "H1 tags", value: analysis.h1.count, ideal: "1", ok: analysis.h1.count === 1 },
                      { label: "H2 tags", value: analysis.h2.count, ideal: "2+", ok: analysis.h2.count >= 2 },
                      { label: "Link-uri interne", value: analysis.internalLinks.count, ideal: "3+", ok: analysis.internalLinks.count >= 3 },
                      { label: "Link-uri externe", value: analysis.externalLinks.count, ideal: "1+", ok: analysis.externalLinks.count >= 1 },
                      { label: "Imagini total", value: analysis.totalImages, ideal: "1+", ok: analysis.totalImages >= 1 },
                      { label: "Imagini fără alt", value: analysis.imagesWithoutAlt, ideal: "0", ok: analysis.imagesWithoutAlt === 0 },
                      { label: "Schema.org", value: analysis.hasSchemaMarkup ? "Da" : "Nu", ideal: "Da", ok: analysis.hasSchemaMarkup },
                      { label: "Cuvinte", value: analysis.wordCount, ideal: "300+", ok: analysis.wordCount >= 300 },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-background/50">
                        <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground">{stat.value}</span>
                          {stat.ok
                            ? <CheckCircle2 size={10} className="text-green-400" />
                            : <XCircle size={10} className="text-red-400" />
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ AUDIT TAB ═══ */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {!auditing && !auditResult && (
            <div className="bg-surface rounded-xl border border-border p-5 text-center">
              <Search size={32} className="text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-2">Audit SEO Complet</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Crawlează {selectedDomain}, analizează fiecare pagină și generează scor Yoast-style.
              </p>
              <button
                onClick={runAudit}
                className="px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
              >
                Rulează Audit (max 30 pagini)
              </button>
            </div>
          )}

          {auditing && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
                <p className="text-sm text-foreground font-medium">Se crawlează {selectedDomain}...</p>
                <p className="text-xs text-muted-foreground mt-1">Poate dura 1-3 minute pentru 30 pagini</p>
              </div>
            </div>
          )}

          {auditResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-surface rounded-xl border border-border p-5">
                <div className="flex items-center gap-5 mb-4">
                  <ScoreBadge score={auditResult.summary.avgScore} size="lg" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{auditResult.summary.domain}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {auditResult.summary.pagesAnalyzed} pagini ·
                      {" "}<span className="text-red-400">{auditResult.summary.criticalIssues} erori</span> ·
                      {" "}<span className="text-yellow-400">{auditResult.summary.warnings} atenționări</span>
                    </p>
                  </div>
                  <button onClick={runAudit} className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    <RefreshCcw size={14} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Top Issues */}
                {auditResult.summary.topIssues?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Probleme Frecvente</p>
                    <div className="space-y-1">
                      {auditResult.summary.topIssues.slice(0, 5).map((issue: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-background/50">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={issue.severity} />
                            <span className="text-foreground">{issue.message}</span>
                          </div>
                          <span className="text-muted-foreground font-medium">{issue.count} pagini</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pages Table */}
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border/50">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Pagini Analizate ({auditResult.pages?.length || 0})</h4>
                </div>
                <div className="divide-y divide-border/30">
                  {(auditResult.pages || []).sort((a: PageAnalysis, b: PageAnalysis) => a.overallScore - b.overallScore).map((page: PageAnalysis, i: number) => (
                    <div key={i}>
                      <button
                        onClick={() => setExpandedPage(expandedPage === page.url ? null : page.url)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors text-left"
                      >
                        <ScoreBadge score={page.overallScore} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{page.url.replace(/https?:\/\/[^/]+/, '')}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {page.wordCount} cuvinte · {page.issues.length} probleme · H1: {page.h1.count}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                          <span>Meta: {page.scoreBreakdown.meta}</span>
                          <span>Content: {page.scoreBreakdown.content}</span>
                          <span>Tech: {page.scoreBreakdown.technical}</span>
                        </div>
                        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", expandedPage === page.url && "rotate-180")} />
                      </button>

                      {expandedPage === page.url && (
                        <div className="px-5 pb-4 space-y-3 bg-muted/10">
                          {/* Score bars */}
                          <div className="grid grid-cols-5 gap-3">
                            <CategoryScore label="Meta" score={page.scoreBreakdown.meta} icon={FileText} />
                            <CategoryScore label="Conținut" score={page.scoreBreakdown.content} icon={Target} />
                            <CategoryScore label="Tehnic" score={page.scoreBreakdown.technical} icon={Code} />
                            <CategoryScore label="Link-uri" score={page.scoreBreakdown.links} icon={Link2} />
                            <CategoryScore label="Imagini" score={page.scoreBreakdown.images} icon={Image} />
                          </div>

                          {/* Title + Meta preview */}
                          <div className="bg-background/50 rounded-lg p-3">
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">SERP Preview</p>
                            <p className="text-sm text-blue-400 font-medium truncate">{page.title.value || "Lipsește titlu"}</p>
                            <p className="text-[11px] text-green-400 truncate">{page.url}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{page.metaDescription.value || "Lipsește meta description"}</p>
                          </div>

                          {/* Issues */}
                          {page.issues.length > 0 && (
                            <div className="space-y-1">
                              {page.issues.slice(0, 5).map((issue, j) => (
                                <div key={j} className="flex items-start gap-2 text-[11px]">
                                  <SeverityBadge severity={issue.severity} />
                                  <span className="text-foreground">{issue.message}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick analyze button */}
                          <button
                            onClick={() => { setAnalyzeUrl(page.url); setActiveTab("analyze"); runAnalysis() }}
                            className="text-[11px] text-primary hover:underline flex items-center gap-1"
                          >
                            <Eye size={12} /> Vezi analiză detaliată →
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPETITORS TAB ═══ */}
      {activeTab === "competitors" && (
        <div className="space-y-4">
          {!discovering && competitors.length === 0 && (
            <div className="bg-surface rounded-xl border border-border p-5 text-center">
              <Users size={32} className="text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-2">Descoperire Competitori</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                Analizează top keywords din GSC, caută în Google și identifică domeniile care concurează pe aceiași termeni.
              </p>
              <button
                onClick={runCompetitorDiscovery}
                className="px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
              >
                🔍 Descoperă Competitori (Self-Hosted)
              </button>
              <p className="text-[10px] text-muted-foreground mt-2">Durează ~20-30 secunde · Analizează top 8 keywords</p>
            </div>
          )}

          {discovering && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
                <p className="text-sm text-foreground font-medium">Se caută competitori pentru {selectedDomain}...</p>
                <p className="text-xs text-muted-foreground mt-1">Se analizează SERP-urile Google pentru top keywords</p>
              </div>
            </div>
          )}

          {competitors.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Competitori Identificați ({competitors.length})</h3>
                <button onClick={runCompetitorDiscovery} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <RefreshCcw size={12} /> Re-scan
                </button>
              </div>

              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground">Domeniu</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Amenințare</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Keywords Comune</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Poz. Medie</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Keywords</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((comp, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Globe size={12} className="text-muted-foreground" />
                            <span className="font-medium text-foreground">{comp.domain}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn(
                            "text-[9px] font-bold uppercase px-2 py-0.5 rounded",
                            comp.threat === "high" ? "bg-red-500/10 text-red-400" :
                            comp.threat === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                            "bg-green-500/10 text-green-400"
                          )}>
                            {comp.threat === "high" ? "Ridicat" : comp.threat === "medium" ? "Mediu" : "Scăzut"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-primary">{comp.keywords.length}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={cn("font-medium",
                            comp.avgPosition <= 3 ? "text-green-400" : comp.avgPosition <= 10 ? "text-yellow-400" : "text-muted-foreground"
                          )}>{comp.avgPosition}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[300px]">
                            {comp.keywords.slice(0, 4).map((kw, j) => (
                              <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{kw}</span>
                            ))}
                            {comp.keywords.length > 4 && (
                              <span className="text-[9px] text-muted-foreground">+{comp.keywords.length - 4}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
