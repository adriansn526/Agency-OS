"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ExternalLink, Globe, Loader2, Plus } from "lucide-react"

/**
 * "Profil Website" card on a CRM lead. Visible only to admins and only when the lead's business line has the Website
 * module enabled with at least one collection (the admin API answers 403/404 otherwise and the card stays hidden).
 */
export function LeadWebsiteCard({ lead }: { lead: { id: string; businessLineId: string; companyName?: string } }) {
  const q = `lineId=${encodeURIComponent(lead.businessLineId)}`
  const [state, setState] = useState<"loading" | "hidden" | "ready">("loading")
  const [collections, setCollections] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [collectionId, setCollectionId] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const ch = await fetch(`/api/website/channel?${q}`)
      const chJson = await ch.json().catch(() => ({}))
      if (!ch.ok || !chJson.data?.channel) return setState("hidden")
      const [cols, ents] = await Promise.all([
        fetch(`/api/website/collections?${q}`).then((r) => r.json()),
        fetch(`/api/website/entries?${q}&leadId=${encodeURIComponent(lead.id)}`).then((r) => r.json()),
      ])
      const active = (cols.data ?? []).filter((c: any) => c.isActive)
      setCollections(active); setEntries(ents.data?.items ?? [])
      setCollectionId((cur) => cur || active.find((c: any) => c.kind === "listing")?.id || active[0]?.id || "")
      setState(active.length ? "ready" : "hidden")
    } catch { setState("hidden") }
  }, [q, lead.id])
  useEffect(() => { load() }, [load])

  async function create() {
    setBusy(true)
    try {
      const res = await fetch(`/api/website/entries/from-lead?${q}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, collectionId }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Eroare")
      toast.success("Profil creat ca ciornă")
      await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Eroare") }
    finally { setBusy(false) }
  }

  if (state !== "ready") return null
  const href = (id: string) => `/marketing/website?line=${encodeURIComponent(lead.businessLineId)}&entry=${id}`
  const statusRo: Record<string, string> = { draft: "Ciornă", published: "Publicat", suspended: "Suspendat" }

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Globe size={14} className="text-muted-foreground" /> Profil Website</h3>
      {entries.length > 0 ? (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Link href={href(e.id)} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                <span className="min-w-0">
                  <span className="block font-medium text-foreground truncate">{e.title}</span>
                  <span className="block text-muted-foreground">{statusRo[e.status] ?? e.status} · /{e.slug}</span>
                </span>
                <ExternalLink size={13} className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">Nu are încă profil public. Se creează ca ciornă, precompletat din acest lead; publici tu după verificare.</p>
          {collections.length > 1 && (
            <select aria-label="Colecție" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
              {collections.map((c) => <option key={c.id} value={c.id}>{c.namePlural}</option>)}
            </select>
          )}
          <button onClick={create} disabled={busy || !collectionId} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Creează profil Website
          </button>
        </div>
      )}
    </div>
  )
}
