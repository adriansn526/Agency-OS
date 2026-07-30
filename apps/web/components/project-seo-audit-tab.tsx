"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Search, Loader2, RefreshCcw, CheckCircle2, XCircle,
  ChevronDown, ExternalLink, FileText, Link2, Image,
  Code, Target, Eye
} from "lucide-react"

// ─── Types ───

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

// ─── Score Components ───

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

// ─── Main Component ───

interface ProjectSeoAuditTabProps {
  domain: string
  gscUrl: string
}

export function ProjectSeoAuditTab({ domain, gscUrl }: ProjectSeoAuditTabProps) {
  const [subTab, setSubTab] = useState<"audit" | "analyze">("audit")

  // Audit state
  const [auditResult, setAuditResult] = useState<any>(null)
  const [auditing, setAuditing] = useState(false)
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  // Analyze state
  const [analyzeUrl, setAnalyzeUrl] = useState("")
  const [analyzeKeyword, setAnalyzeKeyword] = useState("")
  const [analysis, setAnalysis] = useState<PageAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // Run full audit
  const runAudit = useCallback(async () => {
    if (!domain) return
    setAuditing(true)
    setAuditResult(null)
    try {
      const res = await fetch(`/api/seo/dashboard?domain=${encodeURIComponent(domain)}&action=audit&maxPages=30`)
      const data = await res.json()
      setAuditResult(data)
    } catch (err) {
      console.error("[SEO Audit]", err)
    } finally {
      setAuditing(false)
    }
  }, [domain])

  // Analyze single page
  const runAnalysis = useCallback(async (urlOverride?: string) => {
    const targetUrl = urlOverride || analyzeUrl
    if (!targetUrl) return
    setAnalyzing(true)
    setAnalysis(null)
    try {
      const url = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`
      const params = new URLSearchParams({ domain, action: "analyze", url })
      if (analyzeKeyword) params.set("keyword", analyzeKeyword)
      const res = await fetch(`/api/seo/dashboard?${params}`)
      const data = await res.json()
      setAnalysis(data)
    } catch (err) {
      console.error("[SEO Analyze]", err)
    } finally {
      setAnalyzing(false)
    }
  }, [domain, analyzeUrl, analyzeKeyword])

  if (!domain) {
    return (
      <div className="bg-surface rounded-xl border border-border p-5 text-center">
        <p className="text-sm text-muted-foreground">Nu este configurat un domeniu GSC pentru acest proiect.</p>
        <p className="text-xs text-muted-foreground mt-1">Mergi la tab-ul ⚙️ Setări și configurează GSC URL-ul.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">🏥 Audit SEO — {domain}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Analiză Yoast/RankMath per pagină · Crawl live pe VPS
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSubTab("audit")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                subTab === "audit" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              🏥 Audit Site
            </button>
            <button
              onClick={() => setSubTab("analyze")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                subTab === "analyze" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              📄 Analiză Pagină
            </button>
          </div>
        </div>
      </div>

      {/* ═══ AUDIT SUB-TAB ═══ */}
      {subTab === "audit" && (
        <>
          {!auditing && !auditResult && (
            <div className="bg-surface rounded-xl border border-border p-6 text-center">
              <Search size={32} className="text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-2">Audit SEO Complet — {domain}</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                Crawlează sitemap-ul + top pagini GSC, analizează fiecare pagină cu scor Yoast-style.
                Fiind pe același VPS, analiza e rapidă (localhost).
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
                <p className="text-sm text-foreground font-medium">Se crawlează {domain}...</p>
                <p className="text-xs text-muted-foreground mt-1">Poate dura 1-3 minute pentru 30 pagini (localhost = rapid)</p>
              </div>
            </div>
          )}

          {auditResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-surface rounded-xl border border-border p-5">
                <div className="flex items-center gap-5 mb-4">
                  <ScoreBadge score={auditResult.summary?.avgScore || 0} size="lg" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{auditResult.summary?.domain || domain}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {auditResult.summary?.pagesAnalyzed || 0} pagini ·
                      {" "}<span className="text-red-400">{auditResult.summary?.criticalIssues || 0} erori</span> ·
                      {" "}<span className="text-yellow-400">{auditResult.summary?.warnings || 0} atenționări</span>
                    </p>
                  </div>
                  <button onClick={runAudit} className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    <RefreshCcw size={14} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Top Issues */}
                {auditResult.summary?.topIssues?.length > 0 && (
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

              {/* Site-wide checks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Broken Links */}
                {auditResult.summary?.brokenLinks?.length > 0 && (
                  <div className="bg-surface rounded-xl border border-red-500/20 p-4">
                    <h4 className="text-xs font-semibold text-red-400 mb-3 uppercase tracking-wider">
                      🔗 Link-uri Broken ({auditResult.summary.brokenLinks.length})
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {auditResult.summary.brokenLinks.slice(0, 15).map((bl: any, i: number) => (
                        <div key={i} className="text-[11px] p-2 rounded bg-red-500/5">
                          <div className="flex items-center justify-between">
                            <span className="text-foreground truncate max-w-[200px]" title={bl.to}>
                              {bl.to.replace(/https?:\/\/[^/]+/, '')}
                            </span>
                            <span className="text-red-400 font-bold">{bl.status || 'Timeout'}</span>
                          </div>
                          <span className="text-muted-foreground text-[10px]">
                            Din: {bl.from.replace(/https?:\/\/[^/]+/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duplicate Titles */}
                {auditResult.summary?.duplicateTitles?.length > 0 && (
                  <div className="bg-surface rounded-xl border border-yellow-500/20 p-4">
                    <h4 className="text-xs font-semibold text-yellow-400 mb-3 uppercase tracking-wider">
                      📝 Titluri Duplicate ({auditResult.summary.duplicateTitles.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {auditResult.summary.duplicateTitles.slice(0, 10).map((dt: any, i: number) => (
                        <div key={i} className="text-[11px] p-2 rounded bg-yellow-500/5">
                          <p className="text-foreground font-medium truncate" title={dt.title}>
                            „{dt.title.length > 50 ? dt.title.slice(0, 50) + '…' : dt.title}"
                          </p>
                          <p className="text-muted-foreground text-[10px] mt-0.5">
                            {dt.pages.length} pagini: {dt.pages.map((p: string) => p.replace(/https?:\/\/[^/]+/, '')).join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duplicate Descriptions */}
                {auditResult.summary?.duplicateDescriptions?.length > 0 && (
                  <div className="bg-surface rounded-xl border border-orange-500/20 p-4">
                    <h4 className="text-xs font-semibold text-orange-400 mb-3 uppercase tracking-wider">
                      📋 Meta Description Duplicate ({auditResult.summary.duplicateDescriptions.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {auditResult.summary.duplicateDescriptions.slice(0, 10).map((dd: any, i: number) => (
                        <div key={i} className="text-[11px] p-2 rounded bg-orange-500/5">
                          <p className="text-foreground truncate" title={dd.description}>
                            „{dd.description.length > 60 ? dd.description.slice(0, 60) + '…' : dd.description}"
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {dd.pages.length} pagini
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Redirect Chains */}
                {auditResult.summary?.redirectChains?.length > 0 && (
                  <div className="bg-surface rounded-xl border border-blue-500/20 p-4">
                    <h4 className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wider">
                      ↪️ Lanțuri de Redirect ({auditResult.summary.redirectChains.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {auditResult.summary.redirectChains.slice(0, 10).map((rc: any, i: number) => (
                        <div key={i} className="text-[11px] p-2 rounded bg-blue-500/5">
                          <p className="text-foreground font-medium">{rc.chain.length - 1} hop-uri</p>
                          <div className="text-muted-foreground text-[10px] flex flex-wrap items-center gap-1 mt-1">
                            {rc.chain.map((url: string, j: number) => (
                              <span key={j}>
                                <span className="truncate max-w-[140px] inline-block" title={url}>
                                  {url.replace(/https?:\/\/[^/]+/, '') || '/'}
                                </span>
                                {j < rc.chain.length - 1 && <span className="text-blue-400 mx-1">→</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Canonicals */}
                {auditResult.summary?.missingCanonicals?.length > 0 && (
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                      ⚠️ Fără Canonical ({auditResult.summary.missingCanonicals.length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {auditResult.summary.missingCanonicals.slice(0, 10).map((url: string, i: number) => (
                        <p key={i} className="text-[11px] text-foreground truncate" title={url}>
                          {url.replace(/https?:\/\/[^/]+/, '')}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pages */}
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border/50">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Pagini Analizate ({auditResult.pages?.length || 0})
                  </h4>
                </div>
                <div className="divide-y divide-border/30">
                  {(auditResult.pages || [])
                    .sort((a: PageAnalysis, b: PageAnalysis) => a.overallScore - b.overallScore)
                    .map((page: PageAnalysis, i: number) => (
                    <div key={i}>
                      <button
                        onClick={() => setExpandedPage(expandedPage === page.url ? null : page.url)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors text-left"
                      >
                        <ScoreBadge score={page.overallScore} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {page.url.replace(/https?:\/\/[^/]+/, '') || '/'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {page.wordCount} cuv · {page.issues.length} probleme · H1: {page.h1.count}
                          </p>
                        </div>
                        <div className="hidden md:flex items-center gap-4 text-[10px] text-muted-foreground">
                          <span>Meta: {page.scoreBreakdown.meta}</span>
                          <span>Content: {page.scoreBreakdown.content}</span>
                          <span>Tech: {page.scoreBreakdown.technical}</span>
                        </div>
                        <ChevronDown size={14} className={cn(
                          "text-muted-foreground transition-transform",
                          expandedPage === page.url && "rotate-180"
                        )} />
                      </button>

                      {expandedPage === page.url && (
                        <div className="px-5 pb-4 space-y-3 bg-muted/10">
                          {/* Score breakdown */}
                          <div className="grid grid-cols-5 gap-3">
                            <CategoryScore label="Meta" score={page.scoreBreakdown.meta} icon={FileText} />
                            <CategoryScore label="Conținut" score={page.scoreBreakdown.content} icon={Target} />
                            <CategoryScore label="Tehnic" score={page.scoreBreakdown.technical} icon={Code} />
                            <CategoryScore label="Link-uri" score={page.scoreBreakdown.links} icon={Link2} />
                            <CategoryScore label="Imagini" score={page.scoreBreakdown.images} icon={Image} />
                          </div>

                          {/* SERP Preview */}
                          <div className="bg-background/50 rounded-lg p-3">
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">SERP Preview</p>
                            <p className="text-sm text-blue-400 font-medium truncate">{page.title.value || "Lipsește titlu"}</p>
                            <p className="text-[11px] text-green-400 truncate">{page.url}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {page.metaDescription.value || "Lipsește meta description"}
                            </p>
                          </div>

                          {/* Issues */}
                          {page.issues.length > 0 && (
                            <div className="space-y-1">
                              {page.issues.slice(0, 5).map((issue, j) => (
                                <div key={j} className="flex items-start gap-2 text-[11px]">
                                  <SeverityBadge severity={issue.severity} />
                                  <div>
                                    <span className="text-foreground">{issue.message}</span>
                                    <span className="text-muted-foreground ml-2">💡 {issue.fix}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Analyze button */}
                          <button
                            onClick={() => {
                              setAnalyzeUrl(page.url)
                              setSubTab("analyze")
                              runAnalysis(page.url)
                            }}
                            className="text-[11px] text-primary hover:underline flex items-center gap-1"
                          >
                            <Eye size={12} /> Analiză detaliată →
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ ANALYZE SUB-TAB ═══ */}
      {subTab === "analyze" && (
        <div className="space-y-4">
          {/* Input */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">📄 Analiză Pagină — Yoast / Rank Math Style</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={analyzeUrl}
                onChange={e => setAnalyzeUrl(e.target.value)}
                placeholder={`https://${domain}/pagina`}
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
                onClick={() => runAnalysis()}
                disabled={analyzing || !analyzeUrl}
                className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Analizează
              </button>
            </div>
          </div>

          {/* Loading */}
          {analyzing && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary mr-2" size={20} />
              <span className="text-sm text-muted-foreground">Se analizează pagina...</span>
            </div>
          )}

          {/* Results */}
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
                  <a href={analysis.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
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
                  <CategoryScore label="Tehnic (Schema, Viewport)" score={analysis.scoreBreakdown.technical} icon={Code} />
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
                {/* Meta Tags */}
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
                        <span className="text-[10px] text-muted-foreground">Description ({analysis.metaDescription.length} chars)</span>
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
                      { label: "H1 tags", value: analysis.h1.count, ok: analysis.h1.count === 1 },
                      { label: "H2 tags", value: analysis.h2.count, ok: analysis.h2.count >= 2 },
                      { label: "Link-uri interne", value: analysis.internalLinks.count, ok: analysis.internalLinks.count >= 3 },
                      { label: "Link-uri externe", value: analysis.externalLinks.count, ok: analysis.externalLinks.count >= 1 },
                      { label: "Imagini total", value: analysis.totalImages, ok: analysis.totalImages >= 1 },
                      { label: "Img fără alt", value: analysis.imagesWithoutAlt, ok: analysis.imagesWithoutAlt === 0 },
                      { label: "Schema.org", value: analysis.hasSchemaMarkup ? "Da" : "Nu", ok: analysis.hasSchemaMarkup },
                      { label: "Cuvinte", value: analysis.wordCount, ok: analysis.wordCount >= 300 },
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
    </div>
  )
}
