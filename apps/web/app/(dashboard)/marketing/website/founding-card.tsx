"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api, ApiError, fmtDate, inputCls, labelCls } from "./shared"

/** Founding-partner programme: capacity per county × service, price-lock period, benefit text, and who holds each place. */
export function FoundingCard({ lineId }: { lineId: string }) {
  const q = `lineId=${encodeURIComponent(lineId)}`
  const [data, setData] = useState<any>(null)
  const [form, setForm] = useState<{ enabled: boolean; perCombo: number; lockMonths: number; benefit: string; includeSubscription: boolean; subscriptionValueRon: number; subscriptionFounderRon: number; graceDays: number; minProfileScore: number; maxMissedRequests: number } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => { const d = await api(`/api/website/founding?${q}`); setData(d); setForm(d.config) }, [q])
  useEffect(() => { load().catch(() => undefined) }, [load])
  async function run(name: string, fn: () => Promise<void>, ok: string) {
    setBusy(name)
    try { await fn(); toast.success(ok) } catch (e) { toast.error(e instanceof ApiError ? [e.message, ...(e.details ?? [])].join(" — ") : "Eroare") } finally { setBusy(null) }
  }
  if (!data || !form) return null
  const dirty = JSON.stringify(form) !== JSON.stringify(data.config)

  return (
    <Card className="lg:col-span-3">
      <CardHeader><CardTitle>Parteneri fondatori</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Locuri limitate pe fiecare județ și serviciu, ocupate în ordinea acceptării. Când e oprit, nu se ocupă niciun loc și campaniile nu menționează oferta.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Program activ</label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={labelCls} htmlFor="f-per">Locuri pe județ și serviciu</label><input id="f-per" type="number" min={1} max={50} className={inputCls} value={form.perCombo} onChange={(e) => setForm({ ...form, perCombo: Number(e.target.value) })} /></div>
          <div><label className={labelCls} htmlFor="f-lock">Luni de preț garantat (0 = fără)</label><input id="f-lock" type="number" min={0} max={36} className={inputCls} value={form.lockMonths} onChange={(e) => setForm({ ...form, lockMonths: Number(e.target.value) })} /></div>
          <div className="sm:col-span-3"><label className={labelCls} htmlFor="f-ben">Ce primește un partener fondator (apare în mesajul de campanie)</label><input id="f-ben" maxLength={240} className={inputCls} value={form.benefit} onChange={(e) => setForm({ ...form, benefit: e.target.value })} placeholder="ex: preț de lansare garantat 12 luni și prioritate la cereri" /></div>
        </div>
        <div className="rounded-md border border-border p-3 flex flex-col gap-3">
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={form.includeSubscription} onChange={(e) => setForm({ ...form, includeSubscription: e.target.checked })} /><span><b>Abonament inclus pe durata prețului garantat</b> <span className="text-muted-foreground">— fondatorul primește planul „abonament” (cererile directe vin complete și fără taxă) până la sfârșitul perioadei; la eliberarea locului planul se retrage.</span></span></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className={labelCls} htmlFor="f-val">Preț public abonament (lei/lună, 0 = nu se arată)</label><input id="f-val" type="number" min={0} className={inputCls} value={form.subscriptionValueRon} onChange={(e) => setForm({ ...form, subscriptionValueRon: Number(e.target.value) })} /></div>
            <div><label className={labelCls} htmlFor="f-fv">Preț fondator după perioada gratuită (lei/lună)</label><input id="f-fv" type="number" min={0} className={inputCls} value={form.subscriptionFounderRon} onChange={(e) => setForm({ ...form, subscriptionFounderRon: Number(e.target.value) })} /></div>
            <div><label className={labelCls} htmlFor="f-grace">Verificare loc după (zile)</label><input id="f-grace" type="number" min={0} max={365} className={inputCls} value={form.graceDays} onChange={(e) => setForm({ ...form, graceDays: Number(e.target.value) })} /></div>
            <div><label className={labelCls} htmlFor="f-score">Profil completat minim (%; 0 = nu se verifică)</label><input id="f-score" type="number" min={0} max={100} className={inputCls} value={form.minProfileScore} onChange={(e) => setForm({ ...form, minProfileScore: Number(e.target.value) })} /></div>
            <div><label className={labelCls} htmlFor="f-miss">Cereri fără răspuns tolerate (0 = nu se verifică)</label><input id="f-miss" type="number" min={0} max={50} className={inputCls} value={form.maxMissedRequests} onChange={(e) => setForm({ ...form, maxMissedRequests: Number(e.target.value) })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Prețurile apar pe ecranul de acceptare (și nu modifică facturarea, care rămâne manuală). Locurile care nu respectă criteriile sunt doar semnalate mai jos; le eliberezi tu.</p>
        </div>
        <div><Button size="sm" disabled={!dirty || busy === "save"} onClick={() => run("save", async () => { setData(await api(`/api/website/founding?${q}`, "PUT", form)) }, "Salvat")}>Salvează setările</Button>{form.enabled && !form.benefit && <span className="ml-3 text-xs text-muted-foreground">Fără text de beneficiu, campaniile nu menționează oferta.</span>}</div>

        {data.inactive?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Locuri de verificat ({data.inactive.length})</h3>
            <ul className="divide-y divide-border rounded-md border border-amber-500/40">
              {data.inactive.map((i: any) => (
                <li key={i.slotId} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span><b>{i.title}</b> · {i.categoryTitle} · {i.county}<span className="block text-xs text-muted-foreground">{i.reasons.join(" · ")}</span></span>
                  <Button size="sm" variant="outline" disabled={busy === i.slotId} onClick={() => { if (confirm(`Eliberezi locul ocupat de ${i.title}? Dacă nu mai are alte locuri, abonamentul inclus se retrage.`)) void run(i.slotId, async () => { await api(`/api/website/founding/${i.slotId}?${q}`, "DELETE"); await load() }, "Loc eliberat") }}>Eliberează</Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-2">Locuri ocupate ({data.totalSlots})</h3>
          {data.combos.length === 0 ? <p className="text-sm text-muted-foreground">Niciun loc ocupat încă.</p> : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {data.combos.map((c: any) => (
                <li key={`${c.county}-${c.category}`} className="p-3 text-sm">
                  <div className="flex items-center justify-between"><span className="font-medium">{c.categoryTitle} · {c.county}</span><span className="text-muted-foreground">{c.taken}/{c.total} ocupate · {c.left} libere</span></div>
                  <ul className="mt-1 space-y-1">
                    {c.firms.map((f: any) => (
                      <li key={f.slotId} className="flex items-center justify-between text-muted-foreground"><span>{f.title} · din {fmtDate(f.claimedAt)}{f.lockUntil ? ` · preț garantat până la ${fmtDate(f.lockUntil)}` : ""}</span>
                        <Button size="sm" variant="ghost" aria-label={`Eliberează locul lui ${f.title}`} disabled={busy === f.slotId} onClick={() => { if (confirm(`Eliberezi locul ocupat de ${f.title}?`)) void run(f.slotId, async () => { await api(`/api/website/founding/${f.slotId}?${q}`, "DELETE"); await load() }, "Loc eliberat") }}>Eliberează</Button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
