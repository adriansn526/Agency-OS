"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api, ApiError, fmtDate, inputCls } from "./shared"

const TYPE_RO: Record<string, string> = { PDIB: "proiectare instalații de utilizare gaze", EDIB: "execuție instalații de utilizare gaze", PDSB: "proiectare sisteme de distribuție gaze", EDSB: "execuție sisteme de distribuție gaze", RPFA: "racordare aparate consumatoare" }
const decode = (list: unknown): { type: string; number: string; issued: string; expires: string; verifiedAt: string; verifiedBy: string }[] =>
  (Array.isArray(list) ? list : []).map((s) => String(s).split("|")).filter((p) => p.length === 8 && p[0] === "ANRE").map((p) => ({ type: p[1]!, number: p[2]!, issued: p[3]!, expires: p[4]!, verifiedAt: p[5]!, verifiedBy: p[6]! }))

/** Verified authorizations (ANRE): the team compares the firm with the entries of ANRE's public register and confirms; firms cannot write these. */
export function AuthorizationsPanel({ lineId, entryId, value, onChanged }: { lineId: string; entryId: string; value: unknown; onChanged: (list: string[]) => void }) {
  const q0 = `lineId=${encodeURIComponent(lineId)}`
  const [current, setCurrent] = useState(decode(value))
  const [query, setQuery] = useState("")
  const [ops, setOps] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => setCurrent(decode(value)), [value])

  const refresh = useCallback(async () => {
    // the entry's data is the source of truth; re-read it after a change
    const r = await api<any>(`/api/website/entries/${entryId}?${q0}`)
    const list = r?.data?.autorizatii_verificate ?? []
    setCurrent(decode(list)); onChanged(list)
  }, [entryId, q0, onChanged])

  async function search() {
    setBusy("search")
    try { const r = await api<any>(`/api/website/entries/${entryId}/authorizations?${q0}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`); setOps(r.operators); if (!query) setQuery(r.query); if (!r.operators.length) toast.message("Niciun operator găsit în registrul ANRE pentru acest nume") }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setBusy(null) }
  }
  async function confirm(op: any) {
    if (!window.confirm(`Confirmi că „${op.name}” (${op.address}, reprezentant ${op.representative}) este aceeași firmă? Autorizațiile valide vor apărea pe profil ca „verificat de IntraConstruct”.`)) return
    setBusy(`c${op.id}`)
    try { await api(`/api/website/entries/${entryId}/authorizations?${q0}`, "POST", { operatorId: op.id }); toast.success("Autorizații verificate salvate"); setOps(null); await refresh() }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setBusy(null) }
  }
  async function remove(number: string) {
    if (!window.confirm(`Scoți autorizația ${number} de pe profil?`)) return
    setBusy(`r${number}`)
    try { await api(`/api/website/entries/${entryId}/authorizations?${q0}&number=${encodeURIComponent(number)}`, "DELETE"); toast.success("Autorizație scoasă"); await refresh() }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setBusy(null) }
  }

  const today = new Date().toISOString().slice(0, 10)
  return (
    <section aria-label="Autorizații verificate" className="rounded-lg border border-border p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Autorizații verificate (ANRE)</h3>
        <p className="text-xs text-muted-foreground">Apar pe profil ca „verificat de IntraConstruct” doar după ce confirmi aici că firma din registrul public ANRE este aceeași. Firma nu le poate scrie singură.</p>
      </div>
      {current.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {current.map((a) => (
            <li key={a.number} className="flex flex-wrap items-center justify-between gap-2">
              <span><b>{a.type}</b> nr. {a.number} · {TYPE_RO[a.type] ?? ""} · valabilă până la {fmtDate(a.expires)}{a.expires < today ? <b className="text-destructive"> (expirată, nu se afișează)</b> : ""}<span className="block text-xs text-muted-foreground">verificat de {a.verifiedBy} la {fmtDate(a.verifiedAt)}</span></span>
              <Button size="sm" variant="ghost" disabled={busy === `r${a.number}`} onClick={() => remove(a.number)}>Scoate</Button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">Nicio autorizație verificată.</p>}
      <div className="flex gap-2">
        <input aria-label="Nume în registrul ANRE" className={inputCls} placeholder="Nume firmă în registrul ANRE (implicit: denumirea fără SRL)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button size="sm" variant="outline" disabled={busy === "search"} onClick={search}>{busy === "search" ? "Se caută…" : "Caută în ANRE"}</Button>
      </div>
      {ops && ops.length > 0 && (
        <ul className="space-y-2">
          {ops.map((o) => (
            <li key={o.id} className="rounded-md border border-border p-2 text-sm">
              <b>{o.name}</b> · {o.address}<br /><span className="text-muted-foreground">Reprezentant: {o.representative}</span>
              <ul className="mt-1 text-xs">{o.authorizations.map((a: any) => <li key={a.number}>{a.type} nr. {a.number} · {fmtDate(a.issued)} – {fmtDate(a.expires)} · {a.state}</li>)}</ul>
              <Button size="sm" className="mt-2" disabled={busy === `c${o.id}`} onClick={() => confirm(o)}>Este aceeași firmă — verifică</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
