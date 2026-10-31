"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api, ApiError, fmtDate } from "./shared"

/** One proposed case in readable form: title, then each block; images are shown as small thumbnails. */
function CaseView({ raw }: { raw: string }) {
  let c: any = null
  if (raw.trim().startsWith("{")) { try { c = JSON.parse(raw) } catch { /* shown as text */ } }
  if (!c?.b) return <div className="whitespace-pre-line">{raw}</div>
  return (
    <div className="space-y-1.5">
      <p className="font-semibold">{c.t}</p>
      {c.b.map((b: any, i: number) => b.k === "img" ? <img key={i} src={b.u} alt={b.a ?? ""} className="h-20 rounded border" />
        : b.k === "gal" ? <div key={i} className="flex flex-wrap gap-1">{b.g.map((x: any) => <img key={x.u} src={x.u} alt={x.a ?? ""} className="h-16 rounded border" />)}</div>
        : b.k === "vid" ? <div key={i}>{b.p ? <video src={b.u} poster={b.p} controls preload="metadata" className="h-28 rounded border" /> : null}<p>Video{b.p ? " încărcat" : ""}: <a href={b.u} target="_blank" rel="noreferrer" className="underline">{b.u}</a></p></div>
        : b.k === "ul" || b.k === "ol" ? <ul key={i} className="list-disc pl-5">{b.i.map((x: string) => <li key={x}>{x}</li>)}</ul>
        : <p key={i} className={b.k === "h1" || b.k === "h2" ? "font-medium" : ""}>{b.x}</p>)}
    </div>
  )
}

const LABEL: Record<string, string> = { servicii: "Specialități și proceduri", specializare: "Specialitate principală", subspecializari: "Subspecializări", cod_parafa: "Cod parafă", cazuistica: "Cazuistică (cazuri anonimizate)" }

/** Changes a doctor proposed to medical claims: the public profile keeps the checked values until the team approves. */
export function PendingPanel({ lineId, entryId, onChanged }: { lineId: string; entryId: string; onChanged: () => void }) {
  const url = `/api/website/entries/${entryId}/pending?lineId=${encodeURIComponent(lineId)}`
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { api<any>(url).then(setData).catch(() => setData(null)) }, [url])
  useEffect(load, [load])
  if (!data?.proposed) return null

  const show = (k: string, v: any) => k === "cazuistica" ? (Array.isArray(v) && v.length ? v.join("\n———\n") : "(gol)") : Array.isArray(v) ? (v.length ? v.map((x: string) => data.titles?.[x] ?? x).join(", ") : "(gol)") : (v || "(gol)")
  async function act(action: "approve" | "reject") {
    if (action === "reject" && !window.confirm("Respingi modificările propuse?")) return
    setBusy(true)
    try { await api(url, "POST", { action }); toast.success(action === "approve" ? "Modificări aprobate" : "Modificări respinse"); load(); onChanged() }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setBusy(false) }
  }
  return (
    <section aria-label="Modificări în așteptare" className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Modificări propuse de medic{data.at ? ` (${fmtDate(data.at)})` : ""}</h3>
        <p className="text-xs text-muted-foreground">Pe profilul public rămân valorile verificate până aprobi. Verifică dreptul de practică și competențele în Registrul CMR înainte. La cazuistică: textul și imaginile trebuie să fie anonimizate (fără nume, date de contact, fețe sau semne distinctive, localități mici, date calendaristice precise), fără promisiuni de rezultat și fără superlative. Medicul răspunde, conform termenilor, pentru informațiile pe care le oferă.</p>
      </div>
      <dl className="space-y-2 text-sm">
        {Object.entries(data.proposed).map(([k, v]) => (
          <div key={k}><dt className="font-medium">{LABEL[k] ?? k}</dt>{k === "cazuistica"
            ? <>
                <dd className="text-muted-foreground">acum: {Array.isArray(data.live[k]) && data.live[k].length ? `${data.live[k].length} caz(uri) publicate` : "(gol)"}</dd>
                <dd>propus ({Array.isArray(v) ? v.length : 0}):</dd>
                {(Array.isArray(v) ? v : []).map((x: string, i: number) => <dd key={i} className="rounded border bg-white p-2 text-sm"><CaseView raw={x} /></dd>)}
              </>
            : <><dd className="text-muted-foreground whitespace-pre-line">acum: {show(k, data.live[k])}</dd><dd className="whitespace-pre-line">propus: <b>{show(k, v)}</b></dd></>}</div>
        ))}
      </dl>
      <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => act("approve")}>Aprobă</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => act("reject")}>Respinge</Button></div>
    </section>
  )
}
