"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Copy, ExternalLink, Globe, Link2, Loader2, Plus } from "lucide-react"

const dt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—")
const ANSWER_RO: Record<string, string> = { acceptat: "A acceptat", modificari: "Cere modificări", refuzat: "A refuzat" }

/** Preview link, views and the firm's answer for one profile. The link itself is shown only when it is generated (the server keeps just its hash). */
function PreviewBlock({ entry, q }: { entry: any; q: string }) {
  const [st, setSt] = useState<any>(null)
  const [fresh, setFresh] = useState<{ link: string; answerLink: string; expiresAt: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => { try { const r = await fetch(`/api/website/entries/${entry.id}/preview-link?${q}`); const j = await r.json(); if (r.ok) setSt(j.data) } catch { /* the block just stays empty */ } }, [entry.id, q])
  useEffect(() => { void load() }, [load])

  async function generate() {
    if (st?.link?.active && !window.confirm("Există deja un link activ. Dacă generezi unul nou, linkul trimis anterior nu va mai funcționa. Continui?")) return
    setBusy(true)
    try {
      const r = await fetch(`/api/website/entries/${entry.id}/preview-link?${q}`, { method: "POST" })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || "Eroare")
      setFresh(j.data); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Eroare") } finally { setBusy(false) }
  }
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast.success("Copiat") } catch { toast.error("Nu am putut copia") } }
  if (!st) return null

  return (
    <div className="mt-2 space-y-1.5 border-t border-border pt-2 text-[11px]">
      {st.publicUrl && <a href={st.publicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink size={11} /> Pagina publică: {st.publicUrl.replace(/^https?:\/\//, "")}</a>}
      {st.status === "preview" && (
        <>
          <p className="text-muted-foreground">{st.link.active ? <>Link privat activ · generat {dt(st.link.issuedAt)} · expiră {dt(st.link.expiresAt)}</> : st.link.issuedAt ? <>Linkul generat {dt(st.link.issuedAt)} a expirat sau a fost înlocuit</> : "Niciun link de previzualizare generat"}</p>
          {fresh ? (
            <div className="space-y-1 rounded-md border border-primary/30 bg-primary/5 p-2">
              <p className="font-medium text-foreground">Link nou (se vede doar acum, expiră {dt(fresh.expiresAt)}):</p>
              <div className="flex items-center gap-1"><Link2 size={11} className="shrink-0" /><input readOnly aria-label="Link de previzualizare" value={fresh.link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-1 text-[11px]" /><button type="button" aria-label="Copiază linkul" onClick={() => copy(fresh.link)} className="rounded border border-input p-1 hover:bg-muted"><Copy size={11} /></button></div>
              <div className="flex items-center gap-1"><span className="shrink-0 text-muted-foreground">Răspuns / accept:</span><input readOnly aria-label="Link pagina de răspuns" value={fresh.answerLink} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-1 text-[11px]" /><button type="button" aria-label="Copiază linkul de răspuns" onClick={() => copy(fresh.answerLink)} className="rounded border border-input p-1 hover:bg-muted"><Copy size={11} /></button></div>
            </div>
          ) : null}
          <button type="button" onClick={generate} disabled={busy} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 font-medium text-primary hover:bg-primary/10 disabled:opacity-50">{busy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} {st.link.active ? "Generează link nou" : "Generează link de previzualizare"}</button>
        </>
      )}
      <p className="text-muted-foreground">{st.views > 0 ? <>Deschis de <b className="text-foreground">{st.views}</b> {st.views === 1 ? "dată" : "ori"} · ultima {dt(st.lastViewAt)}</> : "Linkul nu a fost deschis încă"}</p>
      <p className={st.answer ? "font-medium text-foreground" : "text-muted-foreground"}>{st.answer ? <>{ANSWER_RO[st.answer] ?? st.answer} · {dt(st.answerAt)}</> : "Fără răspuns de la firmă"}</p>
    </div>
  )
}

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
  const statusRo: Record<string, string> = { draft: "Ciornă", preview: "Previzualizare (privat)", published: "Publicat", suspended: "Suspendat" }

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
              <PreviewBlock entry={e} q={q} />
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
