"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api, ApiError, fmtDate, inputCls } from "./shared"

const decode = (list: unknown): { name: string; county: string; specialities: string[]; practiceUntil: string; parafa: string; verifiedAt: string; verifiedBy: string }[] =>
  (Array.isArray(list) ? list : []).map((s) => String(s).split("|")).filter((p) => p.length === 8 && p[0] === "CMR")
    .map((p) => ({ name: p[1]!, county: p[2]!, specialities: p[3] ? p[3].split(";") : [], practiceUntil: p[4]!, verifiedAt: p[5]!, verifiedBy: p[6]!, parafa: p[7]! }))

/** Verification in the CMR register: the register cannot be queried automatically (reCAPTCHA), so the team searches it in the browser and records what it shows. */
export function CmrPanel({ lineId, entryId, title, value, onChanged }: { lineId: string; entryId: string; title: string; value: unknown; onChanged: (list: string[]) => void }) {
  const url = `/api/website/entries/${entryId}/cmr?lineId=${encodeURIComponent(lineId)}`
  const [current, setCurrent] = useState(decode(value))
  const [registerUrl, setRegisterUrl] = useState("https://regmed.cmr.ro/registrul-medicilor")
  const [f, setF] = useState({ name: title, county: "", specialities: "", practiceUntil: "", parafa: "", right: false, restrictions: false })
  const [busy, setBusy] = useState(false)
  useEffect(() => setCurrent(decode(value)), [value])
  useEffect(() => { api<any>(url).then((r) => r?.registerUrl && setRegisterUrl(r.registerUrl)).catch(() => {}) }, [url])

  async function refresh() {
    const r = await api<any>(`/api/website/entries/${entryId}?lineId=${encodeURIComponent(lineId)}`)
    const list = r?.data?.verificare_cmr ?? []
    setCurrent(decode(list)); onChanged(list)
  }
  async function save() {
    setBusy(true)
    try {
      await api(url, "POST", { name: f.name, county: f.county, specialities: f.specialities.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean), practiceUntil: f.practiceUntil, ...(f.parafa.trim() ? { parafa: f.parafa.trim() } : {}), hasPracticeRight: f.right, hasRestrictions: f.restrictions })
      toast.success("Verificare CMR salvată"); await refresh()
    } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm("Scoți verificarea CMR de pe profil?")) return
    setBusy(true)
    try { await api(url, "DELETE"); toast.success("Verificare scoasă"); await refresh() }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setBusy(false) }
  }

  const today = new Date().toISOString().slice(0, 10)
  const v = current[0]
  return (
    <section aria-label="Verificare CMR" className="rounded-lg border border-border p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Verificare în Registrul CMR</h3>
        <p className="text-xs text-muted-foreground">
          Registrul nu poate fi interogat automat (cere reCAPTCHA). Caută medicul în <a className="underline" href={registerUrl} target="_blank" rel="noreferrer">Registrul CMR</a>, compară datele cu profilul și notează aici ce arată. Apare pe profil ca „verificat în Registrul CMR” doar cât timp dreptul de practică este valabil. Medicul nu poate scrie acest câmp.
        </p>
      </div>
      {v ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            <b>{v.name}</b>{v.county ? ` · ${v.county}` : ""}{v.specialities.length ? ` · ${v.specialities.join(", ")}` : ""} · drept de practică până la {fmtDate(v.practiceUntil)}
            {v.practiceUntil < today ? <b className="text-destructive"> (expirat, nu se afișează)</b> : ""}
            <span className="block text-xs text-muted-foreground">verificat de {v.verifiedBy} la {fmtDate(v.verifiedAt)}{v.parafa ? ` · parafă ${v.parafa}` : ""}</span>
          </span>
          <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>Scoate</Button>
        </div>
      ) : <p className="text-sm text-muted-foreground">Nicio verificare CMR.</p>}
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Nume în registru" className={inputCls} placeholder="Nume și prenume în registru" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input aria-label="Județ" className={inputCls} placeholder="Județ (din registru)" value={f.county} onChange={(e) => setF({ ...f, county: e.target.value })} />
        <input aria-label="Specialități" className={inputCls + " col-span-2"} placeholder="Specialități din registru, separate prin virgulă" value={f.specialities} onChange={(e) => setF({ ...f, specialities: e.target.value })} />
        <input aria-label="Drept de practică până la" type="date" className={inputCls} value={f.practiceUntil} onChange={(e) => setF({ ...f, practiceUntil: e.target.value })} />
        <input aria-label="Cod parafă" className={inputCls} placeholder="Cod parafă (opțional)" value={f.parafa} onChange={(e) => setF({ ...f, parafa: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.right} onChange={(e) => setF({ ...f, right: e.target.checked })} /> Registrul arată drept de practică</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.restrictions} onChange={(e) => setF({ ...f, restrictions: e.target.checked })} /> Registrul arată restrângeri ale dreptului de practică</label>
      <Button size="sm" disabled={busy || !f.name.trim() || !f.practiceUntil} onClick={save}>Salvează verificarea</Button>
    </section>
  )
}
