"use client"

import { useCallback, useEffect, useState } from "react"
import { Globe, Loader2 } from "lucide-react"
import { useBusinessLine } from "@/components/business-line-context"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api, ApiError } from "./shared"
import { OverviewTab } from "./overview-tab"
import { EntriesTab } from "./entries-tab"
import { CollectionsTab } from "./collections-tab"
import { ReviewsTab } from "./reviews-tab"

type Tab = "overview" | "entries" | "collections" | "reviews"

export default function WebsitePage() {
  const { activeLineId, activeLine, setActiveLineId } = useBusinessLine()
  const [openEntryId, setOpenEntryId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Deep link from the CRM: /marketing/website?line=<id>&entry=<id> selects the line and opens that entry
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const line = sp.get("line"), entry = sp.get("entry")
    if (line) setActiveLineId(line)
    if (entry) { setOpenEntryId(entry); setTab("entries") }
    if (line || entry) window.history.replaceState(null, "", window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(async () => {
    if (!activeLineId || activeLineId === "all") { setOverview(null); return }
    setLoading(true); setError(null)
    try { setOverview(await api(`/api/website/channel?lineId=${encodeURIComponent(activeLineId)}`)) }
    catch (e) { setOverview(null); setError(e instanceof ApiError ? e.message : "Nu am putut încărca modulul Website") }
    finally { setLoading(false) }
  }, [activeLineId])

  useEffect(() => { load() }, [load])

  const enabled = !!overview?.channel
  const pending = overview?.counts?.pendingReviews ?? 0
  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview", label: "Prezentare" },
    { key: "entries", label: "Intrări" },
    { key: "collections", label: "Colecții" },
    { key: "reviews", label: "Recenzii", badge: pending },
  ]

  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Globe className="h-4 w-4" /> Marketing</div>
        <h1 className="text-3xl font-bold tracking-tight">Website{activeLine ? ` · ${activeLine.name}` : ""}</h1>
        <p className="text-muted-foreground">Conținutul publicat pe site-ul liniei: companii, proiecte, articole și recenziile lor.</p>
      </div>

      {activeLineId === "all" || !activeLineId ? (
        <Alert>Alege o linie de business din selectorul de sus ca să administrezi Website-ul ei.</Alert>
      ) : loading && !overview ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</div>
      ) : error ? (
        <Alert variant="destructive">{error} <Button size="sm" variant="outline" className="ml-3" onClick={load}>Reîncearcă</Button></Alert>
      ) : (
        <>
          <div role="tablist" className="flex gap-1 border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key} role="tab" aria-selected={tab === t.key} disabled={!enabled && t.key !== "overview"} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {t.label}
                {t.badge ? <span className="ml-2 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-bold">{t.badge}</span> : null}
              </button>
            ))}
          </div>
          {tab === "overview" && <OverviewTab lineId={activeLineId} overview={overview} reload={load} />}
          {enabled && tab === "entries" && <EntriesTab lineId={activeLineId} onChanged={load} initialEntryId={openEntryId} />}
          {enabled && tab === "collections" && <CollectionsTab lineId={activeLineId} onChanged={load} />}
          {enabled && tab === "reviews" && <ReviewsTab lineId={activeLineId} onChanged={load} />}
        </>
      )}
    </div>
  )
}
