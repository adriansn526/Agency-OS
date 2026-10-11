"use client"

import { Fragment, useState } from "react"
import { Loader2, Upload, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { PlacesPanel } from "./places-panel"

/* eslint-disable @typescript-eslint/no-explicit-any */
const STATUS_RO: Record<string, string> = { prospect: "prospect", contacted: "contactat", negotiating: "în discuții", active: "activ", inactive: "inactiv", declined: "refuzat" }
const SERVICE_RO: Record<string, string> = { mount: "Montaj", paint: "Vopsire", paint_mount: "Vopsire + montaj" }
const COORDS_RO: Record<string, string> = { missing: "lipsesc", permanent: "permanente", fresh: "valabile", refresh: "de reîmprospătat", expired: "expirate" }
const BULKY = ["", "small", "standard", "large", "xlarge"]
const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const variant = (s: string) => (s === "active" ? "default" : s === "declined" || s === "inactive" ? "destructive" : "secondary")

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || "Eroare")
  return j
}

export function PartnersPanel({ initial }: { initial: { partners: any[]; counts: Record<string, number> } }) {
  const [data, setData] = useState(initial)
  const [status, setStatus] = useState("")
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [csv, setCsv] = useState("")
  const [preview, setPreview] = useState<any>(null)
  const [adding, setAdding] = useState(false)
  const [nw, setNw] = useState({ name: "", city: "București", phone: "", address: "" })

  async function reload() {
    const p = new URLSearchParams(); if (status) p.set("status", status); if (q) p.set("q", q)
    setData(await api(`/api/commerce/partners?${p}`, "GET"))
  }
  const run = async (key: string, f: () => Promise<unknown>, okText?: string) => {
    setBusy(key); setMsg(null)
    try { await f(); if (okText) setMsg({ ok: true, text: okText }) } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" }) } finally { setBusy(null) }
  }

  const total = Object.values(data.counts).reduce((a, b) => a + b, 0)
  const shown = data.partners.filter((p) => (!status || p.status === status) && (!q || `${p.name} ${p.address ?? ""} ${p.city ?? ""}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <div className="grid gap-6">
      {msg && <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert>}

      <PlacesPanel onRegistryChanged={reload} />

      <Card>
        <CardHeader><CardTitle className="text-lg">Import din Google Maps (CSV)</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">Coloane recunoscute (RO/EN): nume/title, adresă, telefon, site, latitudine, longitudine, place id, rating, recenzii, link Maps. Rândurile intră ca <b>prospect</b>; dublurile (place id sau nume + adresă) sunt omise. Întâi se face o previzualizare.</p>
          <input type="file" accept=".csv,text/csv" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setCsv(await f.text()); setPreview(null) } }} />
          <textarea className={`${input} h-24 py-2 font-mono text-xs`} placeholder="…sau lipește conținutul CSV aici" value={csv} onChange={(e) => { setCsv(e.target.value); setPreview(null) }} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={!csv || !!busy} onClick={() => run("prev", async () => setPreview(await api("/api/commerce/partners/import", "POST", { csv, dryRun: true })))}>{busy === "prev" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Previzualizează</Button>
            {preview && preview.toCreate > 0 && <Button disabled={!!busy} onClick={() => run("imp", async () => { const r = await api("/api/commerce/partners/import", "POST", { csv, dryRun: false }); setPreview(null); setCsv(""); await reload(); setMsg({ ok: true, text: `${r.created} service-uri importate ca prospect.` }) })}>Importă {preview.toCreate}</Button>}
          </div>
          {preview && (
            <div className="text-sm grid gap-1">
              <div>{preview.rows} rânduri: <b>{preview.toCreate}</b> noi, {preview.duplicateCount} dubluri, {preview.invalidCount} invalide{preview.withoutCoordinates ? `, ${preview.withoutCoordinates} fără coordonate` : ""}.</div>
              {preview.invalid.slice(0, 5).map((i: any) => <div key={i.row} className="text-amber-700 text-xs">rând {i.row}: {i.reason}</div>)}
              {preview.sample.map((s: any, i: number) => <div key={i} className="text-xs text-muted-foreground">{s.name} · {s.city ?? "—"} · {s.phone ?? "fără telefon"}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Registru ({total})</CardTitle>
          <div className="flex gap-2"><Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("coords", async () => { const r = await api("/api/commerce/partners/coords/refresh", "POST", {}); await reload(); setMsg({ ok: true, text: `Coordonate: ${r.refreshedGoogle} reîmprospătate din Google, ${r.geocodedOsm} geocodate (OSM), ${r.clearedExpired} șterse (expirate), ${r.stillMissing} încă lipsă${r.failed ? `, ${r.failed} erori` : ""}.` }) })}>{busy === "coords" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Reîmprospătează coordonate</Button><Button size="sm" variant="outline" onClick={() => setAdding(!adding)}><Plus className="h-4 w-4 mr-1" />Adaugă manual</Button></div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {adding && (
            <div className="grid gap-3 sm:grid-cols-4 rounded-md border p-3">
              <input className={input} placeholder="Nume *" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} />
              <input className={input} placeholder="Adresă" value={nw.address} onChange={(e) => setNw({ ...nw, address: e.target.value })} />
              <input className={input} placeholder="Oraș" value={nw.city} onChange={(e) => setNw({ ...nw, city: e.target.value })} />
              <input className={input} placeholder="Telefon" value={nw.phone} onChange={(e) => setNw({ ...nw, phone: e.target.value })} />
              <div><Button size="sm" disabled={!nw.name || !!busy} onClick={() => run("add", async () => { await api("/api/commerce/partners", "POST", { name: nw.name, address: nw.address || null, city: nw.city || null, phone: nw.phone || null, county: nw.city === "București" ? "București" : null }); setNw({ name: "", city: "București", phone: "", address: "" }); setAdding(false); await reload() }, "Partener adăugat ca prospect.")}>Salvează</Button></div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            {["", "prospect", "contacted", "negotiating", "active", "inactive", "declined"].map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`text-xs rounded-full border px-3 py-1 ${status === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{s ? STATUS_RO[s] : "toate"}{s ? ` (${data.counts[s] ?? 0})` : ""}</button>
            ))}
            <input className={`${input} max-w-xs ml-auto`} placeholder="Caută nume, adresă, oraș" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Nume</th><th className="pr-3">Locație</th><th className="pr-3">Contact</th><th className="pr-3">Rating</th><th className="pr-3">Servicii</th><th className="pr-3">Stare</th></tr></thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Niciun partener. Importă un CSV sau adaugă manual.</td></tr>}
                {shown.map((p) => (
                  <Fragment key={p.id}>
                    <tr className="border-t cursor-pointer hover:bg-muted/40" onClick={() => setOpen(open === p.id ? null : p.id)}>
                      <td className="py-2 pr-3 font-medium">{p.name}</td>
                      <td className="pr-3 max-w-xs truncate">{[p.city, p.address].filter(Boolean).join(" · ") || "—"}{p.lat == null && <span className="text-amber-700 text-xs ml-1">fără coordonate</span>}</td>
                      <td className="pr-3">{p.phone ?? "—"}</td>
                      <td className="pr-3">{p.rating != null ? `${p.rating} (${p.ratingCount ?? "?"})` : "—"}</td>
                      <td className="pr-3">{p.services.map((s: string) => SERVICE_RO[s]).join(", ") || "—"}</td>
                      <td className="pr-3"><Badge variant={variant(p.status) as any}>{STATUS_RO[p.status]}</Badge></td>
                    </tr>
                    {open === p.id && <tr className="border-t bg-muted/30"><td colSpan={6} className="p-4"><Editor p={p} run={run} busy={busy} onDone={reload} /></td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Editor({ p, run, busy, onDone }: { p: any; run: (k: string, f: () => Promise<unknown>, t?: string) => Promise<void>; busy: string | null; onDone: () => Promise<void> }) {
  const [f, setF] = useState({ name: p.name, address: p.address ?? "", city: p.city ?? "", county: p.county ?? "", phone: p.phone ?? "", email: p.email ?? "", website: p.website ?? "", contactPerson: p.contactPerson ?? "", lat: p.lat ?? "", lng: p.lng ?? "", notes: p.notes ?? "", status: p.status })
  const [rates, setRates] = useState<any[]>(p.rates.map((r: any) => ({ ...r, bulkyClass: r.bulkyClass ?? "" })))
  const num = (v: unknown) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")))
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  const save = () => run(`save-${p.id}`, async () => {
    await api(`/api/commerce/partners/${p.id}`, "PATCH", { name: f.name, address: f.address || null, city: f.city || null, county: f.county || null, phone: f.phone || null, email: f.email || null, website: f.website || null, contactPerson: f.contactPerson || null, lat: num(f.lat), lng: num(f.lng), notes: f.notes || null })
    await onDone()
  }, "Salvat.")
  const setStatus = (status: string) => run(`st-${p.id}`, async () => { await api(`/api/commerce/partners/${p.id}`, "PATCH", { status }); await onDone() }, `Stare: ${STATUS_RO[status]}.`)
  const saveRates = () => run(`rt-${p.id}`, async () => {
    await api(`/api/commerce/partners/${p.id}/rates`, "PUT", { rates: rates.map((r) => ({ service: r.service, bulkyClass: r.bulkyClass || null, settlementRon: num(r.settlementRon) ?? 0, salePriceRon: num(r.salePriceRon), leadTimeDays: num(r.leadTimeDays), isActive: r.isActive })) })
    await onDone()
  }, "Tarife salvate.")

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {([["name", "Nume"], ["address", "Adresă"], ["city", "Oraș"], ["county", "Județ"], ["phone", "Telefon"], ["email", "E-mail"], ["website", "Site"], ["contactPerson", "Persoană de contact"], ["lat", "Latitudine"], ["lng", "Longitudine"]] as const).map(([k, label]) => (
          <label key={k} className="grid gap-1 text-xs"><span className="font-medium">{label}</span><input className={input} value={(f as any)[k]} onChange={set(k)} /></label>
        ))}
        <label className="grid gap-1 text-xs sm:col-span-3"><span className="font-medium">Note</span><textarea className={`${input} h-16 py-2`} value={f.notes} onChange={set("notes")} /></label>
      </div>
      <div className="text-xs text-muted-foreground">Coordonate: {COORDS_RO[p.coordsState] ?? p.coordsState}{p.coordsSource ? ` · sursă ${p.coordsSource}` : ""}{p.coordsFetchedAt ? ` · obținute ${new Date(p.coordsFetchedAt).toLocaleDateString("ro-RO")}` : ""}. Coordonatele Google se păstrează maximum 30 de zile și se reîmprospătează automat; cele OSM sau introduse manual nu expiră.</div>
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" onClick={save} disabled={!!busy}>Salvează datele</Button>
        {p.googleMapsUrl && <a className="text-xs text-primary hover:underline" href={p.googleMapsUrl} target="_blank" rel="noopener noreferrer">Vezi în Google Maps</a>}
        <span className="ml-auto text-xs text-muted-foreground">Stare:</span>
        {["prospect", "contacted", "negotiating", "active", "inactive", "declined"].map((s) => <button key={s} disabled={!!busy || p.status === s} onClick={() => setStatus(s)} className={`text-xs rounded-full border px-3 py-1 ${p.status === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{STATUS_RO[s]}</button>)}
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">Tarife (ce plătim service-ului și prețul către client, RON)</div>
        {rates.map((r, i) => (
          <div key={i} className="grid gap-2 grid-cols-2 sm:grid-cols-7 items-end">
            <select className={input} value={r.service} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, service: e.target.value } : x)))}>{Object.entries(SERVICE_RO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select className={input} value={r.bulkyClass} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, bulkyClass: e.target.value } : x)))}>{BULKY.map((b) => <option key={b} value={b}>{b || "orice dimensiune"}</option>)}</select>
            <input className={input} placeholder="Decontare" value={r.settlementRon ?? ""} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, settlementRon: e.target.value } : x)))} />
            <input className={input} placeholder="Preț client" value={r.salePriceRon ?? ""} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, salePriceRon: e.target.value } : x)))} />
            <input className={input} placeholder="Zile" value={r.leadTimeDays ?? ""} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, leadTimeDays: e.target.value } : x)))} />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.isActive} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, isActive: e.target.checked } : x)))} />activ</label>
            <Button size="sm" variant="outline" onClick={() => setRates(rates.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setRates([...rates, { service: "paint", bulkyClass: "", settlementRon: "", salePriceRon: "", leadTimeDays: "", isActive: true }])}><Plus className="h-4 w-4 mr-1" />Tarif</Button>
          <Button size="sm" onClick={saveRates} disabled={!!busy}>Salvează tarifele</Button>
          {p.status !== "active" && <span className="text-xs text-muted-foreground self-center">Activarea cere oraș/județ/coordonate și cel puțin un tarif activ.</span>}
        </div>
      </div>

      {p.status !== "active" && <div><Button size="sm" variant="outline" disabled={!!busy} onClick={() => { if (confirm(`Ștergi „${p.name}”?`)) run(`del-${p.id}`, async () => { await api(`/api/commerce/partners/${p.id}`, "DELETE"); await onDone() }, "Șters.") }}><Trash2 className="h-4 w-4 mr-1" />Șterge</Button></div>}
    </div>
  )
}
