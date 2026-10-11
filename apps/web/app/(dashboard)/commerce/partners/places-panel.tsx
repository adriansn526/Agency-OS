"use client"

import { Fragment, useEffect, useState } from "react"
import { Loader2, Search, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"

/* eslint-disable @typescript-eslint/no-explicit-any */
const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || "Eroare")
  return j
}

export function PlacesPanel({ onRegistryChanged }: { onRegistryChanged: () => void }) {
  const [query, setQuery] = useState("tinichigerie vopsitorie București")
  const [pages, setPages] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [res, setRes] = useState<any>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [onlyPaint, setOnlyPaint] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [open, setOpen] = useState<string | null>(null)

  async function loadLeads() { try { setLeads((await api("/api/commerce/partners/leads", "GET")).leads) } catch { /* table/auth issue shown elsewhere */ } }
  useEffect(() => { void loadLeads() }, [])

  const run = async (key: string, f: () => Promise<void>) => { setBusy(key); setMsg(null); try { await f() } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" }) } finally { setBusy(null) } }

  const search = () => run("search", async () => {
    const r = await api("/api/commerce/partners/places/search", "POST", { query, pages })
    setRes(r)
    setSel(new Set(r.results.filter((x: any) => x.relevant && !x.inLeads && !x.inRegistry).map((x: any) => x.placeId)))
  })
  const save = () => run("save", async () => {
    const r = await api("/api/commerce/partners/places/save", "POST", { searchId: res.searchId, placeIds: [...sel] })
    setMsg({ ok: true, text: `${r.created} lead-uri noi salvate (${r.alreadyThere} existau deja).` })
    await loadLeads()
    setRes({ ...res, results: res.results.map((x: any) => (sel.has(x.placeId) ? { ...x, inLeads: true } : x)) })
    setSel(new Set())
  })

  const shown = (res?.results ?? []).filter((x: any) => !onlyPaint || x.paintLikely)
  const pending = leads.filter((l) => !l.partnerId)

  return (
    <div className="grid gap-6">
      {msg && <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert>}

      <Card>
        <CardHeader><CardTitle className="text-lg">Căutare în Google (tinichigerii și vopsitorii)</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">Rezultatele se salvează ca <b>lead-uri interne</b> (CRM), nu în registru și nu apar clienților. Google nu spune ce servicii face un service: „vopsitorie” și „tinichigerie” sunt deduse din denumire, restul trebuie verificat telefonic. Fiecare pagină (20 rezultate) este o cerere facturată de Google; există un plafon zilnic.</p>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="grid gap-1 text-xs flex-1 min-w-64"><span className="font-medium">Căutare</span><input className={input} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
            <label className="grid gap-1 text-xs"><span className="font-medium">Pagini</span><select className={input} value={pages} onChange={(e) => setPages(Number(e.target.value))}><option value={1}>1 (20 rezultate)</option><option value={2}>2 (40)</option><option value={3}>3 (60)</option></select></label>
            <Button onClick={search} disabled={!!busy || query.trim().length < 3}>{busy === "search" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}Caută</Button>
          </div>

          {res && (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span>{res.results.length} rezultate · {res.requests} cereri Google · azi {res.usedToday}/{res.cap}{res.truncated ? " · există mai multe rezultate" : ""}</span>
                <label className="flex items-center gap-2"><input type="checkbox" checked={onlyPaint} onChange={(e) => setOnlyPaint(e.target.checked)} />doar cu „vopsitorie” în denumire</label>
                <Button size="sm" onClick={save} disabled={!!busy || sel.size === 0}>Salvează {sel.size} ca lead-uri</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-2"></th><th className="pr-3">Denumire</th><th className="pr-3">Adresă</th><th className="pr-3">Telefon</th><th className="pr-3">Rating</th><th className="pr-3">Indicii</th></tr></thead>
                  <tbody>{shown.map((x: any) => (
                    <tr key={x.placeId} className="border-t">
                      <td className="py-2 pr-2"><input type="checkbox" disabled={x.inLeads || x.inRegistry} checked={sel.has(x.placeId)} onChange={(e) => { const n = new Set(sel); if (e.target.checked) n.add(x.placeId); else n.delete(x.placeId); setSel(n) }} /></td>
                      <td className="pr-3 font-medium">{x.mapsUrl ? <a className="hover:underline" href={x.mapsUrl} target="_blank" rel="noopener noreferrer">{x.name}</a> : x.name}</td>
                      <td className="pr-3 max-w-xs truncate">{x.address ?? "—"}</td>
                      <td className="pr-3">{x.phone ?? "—"}</td>
                      <td className="pr-3">{x.rating != null ? `${x.rating} (${x.ratingCount ?? "?"})` : "—"}</td>
                      <td className="pr-3 space-x-1">
                        {x.paintLikely && <Badge>vopsitorie</Badge>}{x.bodyLikely && <Badge variant="secondary">tinichigerie</Badge>}
                        {!x.paintLikely && !x.bodyLikely && <Badge variant="outline">de verificat</Badge>}
                        {x.inRegistry ? <Badge variant="secondary">în registru</Badge> : x.inLeads ? <Badge variant="secondary">lead existent</Badge> : null}
                      </td>
                    </tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Lead-uri din Google de confirmat ({pending.length})</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">Sună și confirmă datele. Doar valorile pe care le introduci aici (nu cele de la Google) intră în registru, împreună cu Place ID-ul și linkul Maps.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Denumire</th><th className="pr-3">Telefon</th><th className="pr-3">Adresă</th><th className="pr-3">Indicii</th><th></th></tr></thead>
                <tbody>{pending.map((l) => (
                  <Fragment key={l.id}>
                    <tr className="border-t">
                      <td className="py-2 pr-3 font-medium">{l.name}</td><td className="pr-3">{l.phone ?? "—"}</td><td className="pr-3 max-w-xs truncate">{l.address ?? "—"}</td>
                      <td className="pr-3 space-x-1">{l.paintLikely && <Badge>vopsitorie</Badge>}{l.bodyLikely && <Badge variant="secondary">tinichigerie</Badge>}{!l.paintLikely && !l.bodyLikely && <Badge variant="outline">de verificat</Badge>}</td>
                      <td className="text-right"><Button size="sm" variant="outline" onClick={() => setOpen(open === l.id ? null : l.id)}><Check className="h-4 w-4 mr-1" />Confirmă</Button></td>
                    </tr>
                    {open === l.id && <tr className="border-t bg-muted/30"><td colSpan={5} className="p-4"><Confirm lead={l} onDone={async () => { setOpen(null); await loadLeads(); onRegistryChanged(); setMsg({ ok: true, text: "Adăugat în registru." }) }} onError={(t) => setMsg({ ok: false, text: t })} /></td></tr>}
                  </Fragment>))}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Confirm({ lead, onDone, onError }: { lead: any; onDone: () => Promise<void>; onError: (t: string) => void }) {
  const [f, setF] = useState({ name: lead.name ?? "", address: lead.address ?? "", city: lead.city ?? "", county: lead.county ?? "", phone: lead.phone ?? "", email: "", website: lead.website ?? "", contactPerson: "", notes: "", status: "contacted" })
  const [services, setServices] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  const toggle = (s: string) => setServices(services.includes(s) ? services.filter((x) => x !== s) : [...services, s])
  async function submit() {
    setBusy(true)
    try {
      await api(`/api/commerce/partners/leads/${lead.id}/promote`, "POST", {
        name: f.name, address: f.address || null, city: f.city || null, county: f.county || null, phone: f.phone || null, email: f.email || null,
        website: f.website || null, contactPerson: f.contactPerson || null, notes: f.notes || null, services, status: f.status,
      })
      await onDone()
    } catch (e) { onError(e instanceof Error ? e.message : "Eroare") } finally { setBusy(false) }
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {([["name", "Denumire confirmată"], ["address", "Adresă"], ["city", "Oraș"], ["county", "Județ"], ["phone", "Telefon"], ["email", "E-mail"], ["website", "Site"], ["contactPerson", "Persoană de contact"]] as const).map(([k, label]) => (
          <label key={k} className="grid gap-1 text-xs"><span className="font-medium">{label}</span><input className={input} value={(f as any)[k]} onChange={set(k)} /></label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-xs font-medium">Ce face (confirmat):</span>
        {[["paint", "Vopsire"], ["mount", "Montaj"], ["paint_mount", "Vopsire + montaj"]].map(([k, v]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={services.includes(k!)} onChange={() => toggle(k!)} />{v}</label>)}
        <select className={`${input} max-w-44`} value={f.status} onChange={set("status")}><option value="prospect">prospect</option><option value="contacted">contactat</option><option value="negotiating">în discuții</option></select>
        <Button size="sm" onClick={submit} disabled={busy || !f.name}>{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Adaugă în registru</Button>
      </div>
      <p className="text-xs text-muted-foreground">Coordonatele nu se copiază din Google; tarifele și activarea se fac din registru.</p>
    </div>
  )
}
