"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { DomainReportData } from "@/lib/reports/aggregator"
import { compareKeywords, type KeywordStatus } from "@/lib/reports/seo-compare"
import { DeltaBadge } from "./report-period-picker"

// ─── SEO comparison between two periods (admin) ───
// Index/keyword counts + per-keyword position and click changes.

type Seo = NonNullable<DomainReportData["seo"]>

const FILTERS: Array<{ key: "all" | KeywordStatus; label: string }> = [
  { key: "all", label: "Toate" },
  { key: "up", label: "Îmbunătățite" },
  { key: "down", label: "Scăzute" },
  { key: "new", label: "Noi" },
  { key: "lost", label: "Pierdute" },
]

function Stat({ label, cur, prev, invert }: { label: string; cur: number; prev?: number; invert?: boolean }) {
  return (
    <div className="bg-muted/20 rounded-lg px-3 py-2.5 border border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2 mt-0.5">
        <p className="text-base font-extrabold text-foreground tracking-tight">{cur.toLocaleString("ro-RO")}</p>
        {prev != null && <DeltaBadge cur={cur} prev={prev} mode="abs" digits={0} invert={invert} />}
      </div>
      {prev != null && <p className="text-[10px] text-muted-foreground mt-0.5">înainte: {prev.toLocaleString("ro-RO")}</p>}
    </div>
  )
}

function posColor(p: number | null) {
  if (p == null) return "text-muted-foreground"
  return p <= 3 ? "text-green-400" : p <= 10 ? "text-yellow-400" : "text-red-400"
}

export function SeoComparison({ data, prev }: { data: Seo; prev: Seo }) {
  const [filter, setFilter] = useState<"all" | KeywordStatus>("all")
  const { rows, summary } = useMemo(
    () => compareKeywords(data.topQueries || [], prev.topQueries || []),
    [data.topQueries, prev.topQueries]
  )
  const visible = rows.filter(r => filter === "all" || r.status === filter)
  const countFor = (k: "all" | KeywordStatus) => (k === "all" ? rows.length : rows.filter(r => r.status === k).length)

  const pages = { cur: data.seoAnalysis?.summary.totalPages, prev: prev.seoAnalysis?.summary.totalPages }
  const kws = { cur: data.seoAnalysis?.summary.totalKeywords, prev: prev.seoAnalysis?.summary.totalKeywords }

  return (
    <div className="border-t border-border/50 p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {pages.cur != null && pages.prev != null && <Stat label="Pagini indexate cu trafic" cur={pages.cur} prev={pages.prev} />}
        {kws.cur != null && kws.prev != null && <Stat label="Termeni (pagină ↔ keyword)" cur={kws.cur} prev={kws.prev} />}
        <Stat label="Termeni urmăriți" cur={summary.keywords.cur} prev={summary.keywords.prev} />
        <Stat label="În top 3" cur={summary.top3.cur} prev={summary.top3.prev} />
        <Stat label="În top 10" cur={summary.top10.cur} prev={summary.top10.prev} />
        <Stat label="Termeni noi" cur={summary.newCount} />
        <Stat label="Îmbunătățiți" cur={summary.improvedCount} />
        <Stat label="Scăzuți" cur={summary.declinedCount} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Comparația ia în calcul primii {Math.max(data.topQueries?.length || 0, prev.topQueries?.length || 0)} termeni după click-uri din fiecare perioadă.
        „Nou” = a intrat în listă, „Pierdut” = a ieșit din listă.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/20 text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {f.label} <span className="opacity-60">({countFor(f.key)})</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Keyword</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Poziție înainte</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Poziție acum</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Schimbare</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Click-uri</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Impresii</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 60).map(r => (
              <tr key={r.query} className="border-b border-border/30 hover:bg-muted/10">
                <td className="px-4 py-2 font-medium text-foreground">
                  {r.query}
                  {r.status === "new" && <span className="ml-2 text-[9px] font-bold text-emerald-500">NOU</span>}
                  {r.status === "lost" && <span className="ml-2 text-[9px] font-bold text-red-500">PIERDUT</span>}
                </td>
                <td className={cn("text-right px-3 py-2", posColor(r.prevPosition))}>{r.prevPosition != null ? r.prevPosition.toFixed(1) : "—"}</td>
                <td className={cn("text-right px-3 py-2 font-medium", posColor(r.position))}>{r.position != null ? r.position.toFixed(1) : "—"}</td>
                <td className="text-right px-3 py-2">
                  {r.position != null && r.prevPosition != null
                    ? <DeltaBadge cur={r.position} prev={r.prevPosition} mode="abs" invert />
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="text-right px-3 py-2 text-foreground">
                  {r.clicks}
                  {r.prevClicks != null && <span className="ml-2"><DeltaBadge cur={r.clicks} prev={r.prevClicks} /></span>}
                </td>
                <td className="text-right px-3 py-2 text-muted-foreground">
                  {r.impressions.toLocaleString("ro-RO")}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-6">Nu există termeni în această categorie.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
