"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api, ApiError, fmtDate } from "./shared"

const LABEL: Record<string, string> = { servicii: "Specialități și proceduri", specializare: "Specialitate principală", subspecializari: "Subspecializări", cod_parafa: "Cod parafă" }

/** Changes a doctor proposed to medical claims: the public profile keeps the checked values until the team approves. */
export function PendingPanel({ lineId, entryId, onChanged }: { lineId: string; entryId: string; onChanged: () => void }) {
  const url = `/api/website/entries/${entryId}/pending?lineId=${encodeURIComponent(lineId)}`
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { api<any>(url).then(setData).catch(() => setData(null)) }, [url])
  useEffect(load, [load])
  if (!data?.proposed) return null

  const show = (k: string, v: any) => Array.isArray(v) ? (v.length ? v.map((x: string) => data.titles?.[x] ?? x).join(", ") : "(gol)") : (v || "(gol)")
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
        <p className="text-xs text-muted-foreground">Pe profilul public rămân valorile verificate până aprobi. Verifică dreptul de practică și competențele în Registrul CMR înainte.</p>
      </div>
      <dl className="space-y-2 text-sm">
        {Object.entries(data.proposed).map(([k, v]) => (
          <div key={k}><dt className="font-medium">{LABEL[k] ?? k}</dt><dd className="text-muted-foreground">acum: {show(k, data.live[k])}</dd><dd>propus: <b>{show(k, v)}</b></dd></div>
        ))}
      </dl>
      <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => act("approve")}>Aprobă</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => act("reject")}>Respinge</Button></div>
    </section>
  )
}
