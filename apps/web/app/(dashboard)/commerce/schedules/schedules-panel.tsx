"use client"

import { Fragment, useEffect, useState } from "react"
import { Loader2, Play, FlaskConical, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"

/* eslint-disable @typescript-eslint/no-explicit-any */
const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const TZ = "Europe/Bucharest"
const when = (d?: string | null) => (d ? new Date(d).toLocaleString("ro-RO", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }) : "—")
const ago = (d?: string | null) => { if (!d) return "—"; const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000)); return s < 90 ? `acum ${s}s` : s < 5400 ? `acum ${Math.round(s / 60)} min` : `acum ${Math.round(s / 3600)} h` }
const STATUS_RO: Record<string, string> = { success: "reușit", unchanged: "nimic de făcut", skipped: "sărit", aborted: "oprit", failed: "eșuat", missed: "ratat", running: "rulează" }
const variant = (s: string | null) => (s === "success" ? "default" : s === "failed" || s === "aborted" ? "destructive" : "secondary")
const DAYS = [[1, "L"], [2, "Ma"], [3, "Mi"], [4, "J"], [5, "V"], [6, "S"], [7, "D"]] as const

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || "Eroare")
  return j
}

export function SchedulesPanel({ initial }: { initial: any }) {
  const [d, setD] = useState(initial)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [openRun, setOpenRun] = useState<string | null>(null)
  const anyRunning = d.jobs.some((j: any) => j.running)

  async function reload() { setD(await api("/api/commerce/schedules", "GET")) }
  useEffect(() => { const t = setInterval(() => { void reload().catch(() => undefined) }, anyRunning ? 3000 : 15000); return () => clearInterval(t) }, [anyRunning]) // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (key: string, f: () => Promise<unknown>, ok?: string) => { setBusy(key); setMsg(null); try { await f(); await reload(); if (ok) setMsg({ ok: true, text: ok }) } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" }) } finally { setBusy(null) } }

  const sch = d.scheduler
  return (
    <div className="grid gap-6">
      {msg && <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert>}

      <Card>
        <CardHeader><CardTitle className="text-lg">Planificator</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={sch.enabled} disabled={!!busy} onChange={(e) => run("master", () => api("/api/commerce/schedules", "PUT", { enabled: e.target.checked }), e.target.checked ? "Planificator pornit." : "Planificator oprit: nu rulează nimic automat.")} />Planificator pornit</label>
            <Badge variant={sch.alive ? "default" : "secondary"}>{sch.alive ? `serverul răspunde (puls ${ago(sch.heartbeatAt)})` : "fără puls de la server"}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Joburile pornesc doar când sunt bifate <b>atât</b> planificatorul, <b>cât și</b> jobul. Verificarea se face din ERP la fiecare 30 de secunde; nu este nevoie de crontab. Dacă nu apare puls, serverul de producție nu a pornit planificatorul (pornește doar în producție) sau este oprit.</p>
          {d.priceSyncWrites && <Alert>„Scriere activată” este <b>bifată</b> în Sincronizare preț și stoc: rulările programate ale sincronizării și ale repreț-ului <b>vor modifica prețurile și stocul</b> din catalog.</Alert>}
        </CardContent>
      </Card>

      {d.jobs.map((j: any) => (
        <Card key={j.key}>
          <CardHeader className="pb-2"><div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-lg">{j.label}</CardTitle>
            {j.running && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />rulează</Badge>}
            <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={j.enabled} disabled={!!busy} onChange={(e) => run(j.key, () => api(`/api/commerce/schedules/${j.key}`, "PATCH", { enabled: e.target.checked }), e.target.checked ? "Job activat." : "Job dezactivat.")} />activ</label>
          </div></CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">{j.description}</p>
            <div className="grid gap-1 text-sm">
              <div><span className="font-medium">Program:</span> {j.scheduleText} <button className="ml-2 text-primary hover:underline inline-flex items-center gap-1 text-xs" onClick={() => setEditing(editing === j.key ? null : j.key)}><Pencil className="h-3 w-3" />editează</button></div>
              <div><span className="font-medium">Următoarea rulare:</span> {j.enabled ? (sch.enabled ? when(j.nextRunAt) : `${when(j.nextRunAt)} (planificatorul este oprit)`) : "— (job dezactivat)"}</div>
              <div><span className="font-medium">Ultima rulare:</span> {j.lastRunAt ? <>{when(j.lastRunAt)} · <Badge variant={variant(j.lastStatus) as any}>{STATUS_RO[j.lastStatus] ?? j.lastStatus}</Badge>{j.lastDurationMs != null ? ` · ${(j.lastDurationMs / 1000).toFixed(1)} s` : ""}{j.lastSummary?.dryRun ? " · dry-run" : ""}</> : "—"}</div>
              {j.lastError && <div className="text-xs text-red-700">{j.lastError}</div>}
              {j.lastSummary?.note && <div className="text-xs text-muted-foreground">{j.lastSummary.note}</div>}
            </div>
            {editing === j.key && <ScheduleEditor job={j} onSave={(schedule) => run(j.key, async () => { await api(`/api/commerce/schedules/${j.key}`, "PATCH", { schedule }); setEditing(null) }, "Program salvat.")} onCancel={() => setEditing(null)} busy={busy === j.key} />}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={!!busy || j.running} onClick={() => { if (confirm(`Rulezi acum „${j.label}”? Poate modifica prețurile/stocul dacă scrierea este activată.`)) void run(j.key, () => api(`/api/commerce/schedules/${j.key}/run`, "POST", { dryRun: false }), "Rulare pornită.") }}><Play className="h-4 w-4 mr-1" />Rulează acum</Button>
              {j.supportsDryRun && <Button size="sm" variant="outline" disabled={!!busy || j.running} onClick={() => run(j.key, () => api(`/api/commerce/schedules/${j.key}/run`, "POST", { dryRun: true }), "Dry-run pornit (nu scrie nimic).")}><FlaskConical className="h-4 w-4 mr-1" />Dry-run</Button>}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle className="text-lg">Conexiuni</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p className="text-xs text-muted-foreground">Cheile și parolele nu se editează aici (nu se păstrează în baza de date): se setează în <code>.env.local</code>. Aici vezi doar dacă sunt configurate.</p>
          {d.connections.map((c: any) => <div key={c.key} className="flex items-center gap-3"><Badge variant={c.ok ? "default" : "secondary"}>{c.ok ? "configurat" : "lipsește"}</Badge><span className="font-medium">{c.label}</span><span className="text-xs text-muted-foreground">{c.key} · {c.usedBy}</span></div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Istoric rulări</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Început</th><th className="pr-3">Job</th><th className="pr-3">Declanșare</th><th className="pr-3">Stare</th><th className="pr-3">Durată</th><th className="pr-3">Rezumat</th></tr></thead>
            <tbody>{d.runs.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Nicio rulare încă.</td></tr>}
              {d.runs.map((r: any) => (
                <Fragment key={r.id}>
                  <tr className="border-t cursor-pointer hover:bg-muted/40" onClick={() => setOpenRun(openRun === r.id ? null : r.id)}>
                    <td className="py-2 pr-3 whitespace-nowrap">{when(r.startedAt)}</td><td className="pr-3">{r.label}</td>
                    <td className="pr-3">{r.trigger === "schedule" ? "programat" : "manual"}{r.dryRun ? " · dry-run" : ""}</td>
                    <td className="pr-3"><Badge variant={variant(r.status) as any}>{STATUS_RO[r.status] ?? r.status}</Badge></td>
                    <td className="pr-3">{r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)} s` : "—"}</td>
                    <td className="pr-3 max-w-md truncate text-muted-foreground">{r.error ?? r.summary?.note ?? ""}</td>
                  </tr>
                  {openRun === r.id && <tr className="border-t bg-muted/30"><td colSpan={6} className="p-3"><pre className="text-xs whitespace-pre-wrap break-words max-h-60 overflow-auto">{JSON.stringify({ ...r.summary, ...(r.error ? { error: r.error } : {}) }, null, 2)}</pre></td></tr>}
                </Fragment>))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function ScheduleEditor({ job, onSave, onCancel, busy }: { job: any; onSave: (s: unknown) => void; onCancel: () => void; busy: boolean }) {
  const s = job.schedule
  const [mode, setMode] = useState<"times" | "interval">(s.mode)
  const [days, setDays] = useState<number[]>(s.days)
  const [times, setTimes] = useState(s.mode === "times" ? s.times.join(", ") : "06:15")
  const [every, setEvery] = useState(String(s.mode === "interval" ? s.everyHours : 2))
  const [from, setFrom] = useState(s.mode === "interval" ? s.from : "05:00")
  const [to, setTo] = useState(s.mode === "interval" ? s.to : "13:00")
  const toggle = (n: number) => setDays(days.includes(n) ? days.filter((x) => x !== n) : [...days, n])
  const payload = mode === "times"
    ? { mode, days, times: times.split(/[,\s]+/).map((t: string) => t.trim()).filter(Boolean) }
    : { mode, days, everyHours: Number(every), from, to }
  return (
    <div className="rounded-md border p-3 grid gap-3 bg-muted/20">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="grid gap-1 text-xs"><span className="font-medium">Tip</span>
          <select className={`${input} w-52`} value={mode} onChange={(e) => setMode(e.target.value as any)}><option value="times">Ore fixe</option><option value="interval">La fiecare N ore, într-un interval</option></select></label>
        {mode === "times"
          ? <label className="grid gap-1 text-xs"><span className="font-medium">Ore (HH:MM, separate prin virgulă)</span><input className={`${input} w-64`} value={times} onChange={(e) => setTimes(e.target.value)} placeholder="13:30, 15:30" /></label>
          : <>
              <label className="grid gap-1 text-xs"><span className="font-medium">La fiecare (ore)</span><input className={`${input} w-24`} inputMode="numeric" value={every} onChange={(e) => setEvery(e.target.value)} /></label>
              <label className="grid gap-1 text-xs"><span className="font-medium">De la</span><input className={`${input} w-28`} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="05:00" /></label>
              <label className="grid gap-1 text-xs"><span className="font-medium">Până la</span><input className={`${input} w-28`} value={to} onChange={(e) => setTo(e.target.value)} placeholder="13:00" /></label>
            </>}
      </div>
      <div className="flex flex-wrap gap-3 items-center text-sm">
        <span className="text-xs font-medium">Zile:</span>
        {DAYS.map(([n, l]) => <label key={n} className="flex items-center gap-1"><input type="checkbox" checked={days.includes(n)} onChange={() => toggle(n)} />{l}</label>)}
        <span className="text-xs text-muted-foreground">Ora României (se ajustează automat la ora de vară/iarnă).</span>
      </div>
      <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => onSave(payload)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează programul"}</Button><Button size="sm" variant="outline" onClick={onCancel}>Renunță</Button></div>
    </div>
  )
}
