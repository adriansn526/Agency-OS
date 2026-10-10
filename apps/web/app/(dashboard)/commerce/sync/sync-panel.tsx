"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Play, FlaskConical, RefreshCw, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"

/* eslint-disable @typescript-eslint/no-explicit-any */
type Overview = any

const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—")
const fmtN = (n: unknown) => (typeof n === "number" ? n.toLocaleString("ro-RO") : "—")
const statusVariant = (s: string) => (s === "success" ? "default" : s === "unchanged" ? "secondary" : s === "running" ? "outline" : "destructive")
const STATUS_RO: Record<string, string> = { success: "reușit", unchanged: "nemodificat", running: "rulează", aborted: "oprit", failed: "eșuat" }
const JOB_RO: Record<string, string> = { feed_sync: "Preț și stoc", reprice: "Repreț la curs" }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function SyncPanel({ initial }: { initial: Overview }) {
  const router = useRouter()
  const [data, setData] = useState<Overview>(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const s = data.settings
  const [form, setForm] = useState(() => formFrom(initial))
  const [approveMarkup, setApproveMarkup] = useState(false)
  const [openRun, setOpenRun] = useState<string | null>(null)

  async function reload() {
    const r = await fetch("/api/commerce/sync").then((x) => x.json()).catch(() => null)
    if (r) { setData(r); return r }
    return null
  }
  // while a run is in progress, poll
  useEffect(() => {
    if (!data.running) return
    const t = setInterval(async () => { const r = await reload(); if (r && !r.running) { setBusy(null); router.refresh() } }, 3000)
    return () => clearInterval(t)
  }, [data.running]) // eslint-disable-line react-hooks/exhaustive-deps

  async function post(url: string, body: unknown, method = "POST") {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || j.message || "Eroare")
    return j
  }

  async function run(job: "feed" | "reprice", dryRun: boolean) {
    if (!dryRun && !confirm(job === "feed" ? "Rulezi acum sincronizarea de preț și stoc? Modificările apar imediat în storefront." : "Recalculezi acum toate prețurile la cursul BNR? Modificările apar imediat în storefront.")) return
    setMsg(null); setBusy(`${job}-${dryRun}`)
    try {
      await post("/api/commerce/sync/run", { job, dryRun })
      setMsg({ ok: true, text: dryRun ? "Dry-run pornit. Raportul apare mai jos în „Ultimele rulări”." : "Sincronizarea a pornit." })
      setTimeout(reload, 1500)
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" }) }
    finally { setTimeout(() => setBusy(null), 2000) }
  }

  async function saveSettings() {
    setMsg(null); setBusy("save")
    try {
      const body = {
        enabled: form.enabled, sourceCurrency: form.sourceCurrency, vatPct: Number(form.vatPct), markupPct: Number(form.markupPct),
        rounding: form.rounding, minPriceRon: Number(form.minPriceRon), maxChangePct: Number(form.maxChangePct), fxMinChangePct: Number(form.fxMinChangePct),
        vatIncludedLabel: form.vatIncludedLabel === "auto" ? null : form.vatIncludedLabel === "yes",
        stockMapping: form.stockMapping, approveMarkup,
      }
      await post("/api/commerce/sync/settings", body, "PUT")
      setMsg({ ok: true, text: "Setările au fost salvate. Prețurile se schimbă doar la următoarea rulare (nu se repreț automat)." })
      setApproveMarkup(false)
      const r = await reload(); if (r) setForm(formFrom(r))
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" }) }
    finally { setBusy(null) }
  }

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id)
    try { await post(`/api/commerce/sync/review/${id}`, { action }); await reload() }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" }) }
    finally { setBusy(null) }
  }

  if (!data.ready) {
    return <Alert variant="destructive">{data.error ?? "Sincronizarea nu este configurată."}</Alert>
  }

  const last = data.runs?.find((r: any) => !r.dryRun)
  const markupPending = Number(form.markupPct) > 0 && !s.markupApprovedAt && !approveMarkup
  const reviewPrice = (data.reviews ?? []).filter((r: any) => r.kind === "price_change")
  const reviewNew = (data.reviews ?? []).filter((r: any) => r.kind === "new_product")

  return (
    <div className="grid gap-6">
      {msg && <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert>}
      {!s.enabled && (
        <Alert>
          Scrierea este <b>oprită</b>: orice rulare este doar dry-run (raport, fără modificări în catalog). Activeaz-o din setări după ce ai verificat raportul.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ultima rulare</CardTitle></CardHeader><CardContent>
          {last ? (<><Badge variant={statusVariant(last.status) as any}>{STATUS_RO[last.status] ?? last.status}</Badge><div className="text-xs text-muted-foreground mt-2">{JOB_RO[last.job]} · {fmtDate(last.startedAt)}</div></>) : <span className="text-sm text-muted-foreground">încă nicio rulare cu scriere</span>}
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Fișiere aplicate</CardTitle></CardHeader><CardContent className="text-sm">
          {(data.files ?? []).length ? data.files.map((f: any) => (
            <div key={f.name}><span className="font-medium">{f.name === "pricelist" ? "PRICELIST" : "OUTOFSTOCK"}</span> <span className="text-muted-foreground">{fmtDate(f.remoteMtime)} · {fmtN(f.rows)} rânduri</span></div>
          )) : <span className="text-muted-foreground">—</span>}
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Curs aplicat în prețuri</CardTitle></CardHeader><CardContent className="text-sm">
          {s.applied ? (<><div className="text-2xl font-bold">{s.applied.fxRate}</div><div className="text-xs text-muted-foreground">BNR {s.applied.fxDate} · {fmtDate(s.applied.at)}</div></>) : <span className="text-muted-foreground">nerecalculat încă (prețuri vechi)</span>}
          {data.latestStoredRate && <div className="text-xs text-muted-foreground mt-1">ultimul curs stocat: {data.latestStoredRate.rate} ({data.latestStoredRate.date})</div>}
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">De revizuit</CardTitle></CardHeader><CardContent className="text-sm">
          <div>{fmtN(data.pendingCounts?.price_change ?? 0)} variații de preț</div>
          <div>{fmtN(data.pendingCounts?.new_product ?? 0)} produse noi</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Rulare</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => run("feed", false)} disabled={!!busy || data.running || !s.enabled}><Play className="h-4 w-4 mr-2" />Rulează acum (preț + stoc)</Button>
          <Button variant="outline" onClick={() => run("feed", true)} disabled={!!busy || data.running}><FlaskConical className="h-4 w-4 mr-2" />Dry-run preț + stoc</Button>
          <Button onClick={() => run("reprice", false)} disabled={!!busy || data.running || !s.enabled}><RefreshCw className="h-4 w-4 mr-2" />Repreț la curs acum</Button>
          <Button variant="outline" onClick={() => run("reprice", true)} disabled={!!busy || data.running}><FlaskConical className="h-4 w-4 mr-2" />Dry-run repreț</Button>
          {data.running && <span className="inline-flex items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mr-2 animate-spin" />rulează…</span>}
          <p className="basis-full text-xs text-muted-foreground">Programare automată: preț și stoc zilnic de la 05:00 (reîncercare la 2 ore până la 13:00; furnizorul regenerează fișierele în jur de 04:23); repreț la curs la 13:30 și 15:30, zilele lucrătoare, după publicarea cursului BNR.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Formula de preț</CardTitle></CardHeader>
        <CardContent className="grid gap-5">
          <p className="text-sm text-muted-foreground">preț = cost furnizor × curs BNR × (1 + adaos%) × (1 + TVA%), rotunjit o singură dată la final. Adaosul implicit este 0 și nu se aplică fără aprobarea ta.</p>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Moneda furnizorului"><select className={input} value={form.sourceCurrency} onChange={(e) => setForm({ ...form, sourceCurrency: e.target.value })}><option>EUR</option><option>USD</option><option>RON</option></select></Field>
            <Field label="Sursa cursului"><input className={input} value="BNR (curs.bnr.ro)" disabled /></Field>
            <Field label="TVA (%)"><input className={input} inputMode="decimal" value={form.vatPct} onChange={(e) => setForm({ ...form, vatPct: e.target.value })} /></Field>
            <Field label="Adaos (%)" hint={s.markupApprovedAt ? `aprobat ${fmtDate(s.markupApprovedAt)}` : "implicit 0; peste 0 cere aprobare"}><input className={input} inputMode="decimal" value={form.markupPct} onChange={(e) => setForm({ ...form, markupPct: e.target.value })} /></Field>
            <Field label="Rotunjire"><select className={input} value={form.rounding} onChange={(e) => setForm({ ...form, rounding: e.target.value })}><option value="none">fără (2 zecimale)</option><option value="99">până la ,99</option><option value="90">până la ,90</option><option value="integer">număr întreg</option></select></Field>
            <Field label="Preț minim (RON)"><input className={input} inputMode="decimal" value={form.minPriceRon} onChange={(e) => setForm({ ...form, minPriceRon: e.target.value })} /></Field>
            <Field label="Variație maximă automată (%)" hint="peste acest prag, prețul merge la revizuire"><input className={input} inputMode="decimal" value={form.maxChangePct} onChange={(e) => setForm({ ...form, maxChangePct: e.target.value })} /></Field>
            <Field label="Prag repreț la curs (%)" hint="0 = la orice schimbare de curs; ex. 0,3 evită rescrierea zilnică a catalogului"><input className={input} inputMode="decimal" value={form.fxMinChangePct} onChange={(e) => setForm({ ...form, fxMinChangePct: e.target.value })} /></Field>
            <Field label="Etichetă „TVA inclus” în storefront" hint="folosită de GET /api/storefront/meta"><select className={input} value={form.vatIncludedLabel} onChange={(e) => setForm({ ...form, vatIncludedLabel: e.target.value })}><option value="auto">automat (după TVA)</option><option value="yes">TVA inclus</option><option value="no">fără TVA</option></select></Field>
            <Field label="Disponibilitate publică" hint="supplier_confirm: ≥1 depozit → la comandă; ambele 0 → stoc epuizat"><select className={input} value={form.stockMapping} onChange={(e) => setForm({ ...form, stockMapping: e.target.value })}><option value="unknown">toate „la comandă” (actual)</option><option value="supplier_confirm">supplier_confirm</option></select></Field>
          </div>
          {Number(form.markupPct) > 0 && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={approveMarkup} onChange={(e) => setApproveMarkup(e.target.checked)} />Aprob aplicarea adaosului de {form.markupPct}% în prețurile din catalog</label>
          )}
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />Scriere activată (altfel toate rulările sunt dry-run)</label>
          {markupPending && <Alert variant="destructive">Adaosul peste 0 nu este aprobat: rulările vor fi refuzate până bifezi aprobarea.</Alert>}
          <div><Button onClick={saveSettings} disabled={busy === "save"}>{busy === "save" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Salvează setările</Button></div>
        </CardContent>
      </Card>

      {reviewPrice.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Variații mari de preț — de revizuit ({fmtN(data.pendingCounts?.price_change)})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">SKU</th><th className="pr-3">Produs</th><th className="pr-3">Cost</th><th className="pr-3">Preț RON</th><th className="pr-3">Variație</th><th></th></tr></thead>
              <tbody>{reviewPrice.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3 font-mono">{r.supplierCode}</td><td className="pr-3 max-w-xs truncate">{r.name ?? "—"}</td>
                  <td className="pr-3">{r.oldCost} → {r.newCost} €</td><td className="pr-3">{r.oldPriceRon} → {r.newPriceRon}</td>
                  <td className={`pr-3 font-medium ${Number(r.changePct) > 0 ? "text-red-600" : "text-green-600"}`}>{Number(r.changePct) > 0 ? "+" : ""}{r.changePct}%</td>
                  <td className="text-right whitespace-nowrap"><Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, "approve")}><Check className="h-4 w-4" /></Button> <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, "reject")}><X className="h-4 w-4" /></Button></td>
                </tr>))}</tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {reviewNew.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Produse noi de la furnizor — inactive, de aprobat ({fmtN(data.pendingCounts?.new_product)})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">SKU</th><th className="pr-3">Denumire</th><th className="pr-3">Cost</th><th></th></tr></thead>
              <tbody>{reviewNew.map((r: any) => (
                <tr key={r.id} className="border-t"><td className="py-2 pr-3 font-mono">{r.supplierCode}</td><td className="pr-3 max-w-md truncate">{r.name ?? "—"}</td><td className="pr-3">{r.newCost} €</td>
                  <td className="text-right whitespace-nowrap"><Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, "approve")}><Check className="h-4 w-4" /></Button> <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, "reject")}><X className="h-4 w-4" /></Button></td></tr>))}</tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Ultimele rulări</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Început</th><th className="pr-3">Job</th><th className="pr-3">Mod</th><th className="pr-3">Stare</th><th className="pr-3">Durată</th><th className="pr-3">Rezumat</th></tr></thead>
            <tbody>{(data.runs ?? []).map((r: any) => (
              <>
                <tr key={r.id} className="border-t cursor-pointer hover:bg-muted/40" onClick={() => setOpenRun(openRun === r.id ? null : r.id)}>
                  <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(r.startedAt)}</td><td className="pr-3">{JOB_RO[r.job] ?? r.job}</td>
                  <td className="pr-3">{r.dryRun ? "dry-run" : "scriere"}</td><td className="pr-3"><Badge variant={statusVariant(r.status) as any}>{STATUS_RO[r.status] ?? r.status}</Badge></td>
                  <td className="pr-3">{r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)} s` : "—"}</td><td className="pr-3 max-w-md truncate text-muted-foreground">{summarize(r)}</td>
                </tr>
                {openRun === r.id && (<tr key={`${r.id}-d`} className="border-t bg-muted/30"><td colSpan={6} className="p-3"><RunDetails run={r} /></td></tr>)}
              </>))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function formFrom(o: Overview) {
  const s = o.settings
  if (!s) return { enabled: false, sourceCurrency: "EUR", vatPct: "21", markupPct: "0", rounding: "none", minPriceRon: "0", maxChangePct: "30", fxMinChangePct: "0", vatIncludedLabel: "auto", stockMapping: "unknown" }
  return {
    enabled: !!s.enabled, sourceCurrency: s.sourceCurrency, vatPct: String(s.vatPct), markupPct: String(s.markupPct), rounding: s.rounding,
    minPriceRon: String(s.minPriceRon), maxChangePct: String(s.maxChangePct), fxMinChangePct: String(s.fxMinChangePct),
    vatIncludedLabel: s.vatIncludedLabel == null ? "auto" : s.vatIncludedLabel ? "yes" : "no",
    stockMapping: o.feed?.stockFlagMeaning === "supplier_confirm" ? "supplier_confirm" : "unknown",
  }
}

function summarize(r: any): string {
  if (r.error) return r.error
  const st = r.stats ?? {}
  const body = st.stats ?? {}
  if (r.job === "reprice") return body.priceChanged != null ? `${fmtN(body.priceChanged)} prețuri modificate, ${fmtN(body.queuedForReview)} la revizuire` : (st.notes ?? [])[0] ?? ""
  const p = body.pricelist
  if (!p) return (st.notes ?? [])[0] ?? ""
  return `${fmtN(p.new)} noi, ${fmtN(p.updated)} modificate, ${fmtN(p.unchanged)} neschimbate, ${fmtN(p.queuedForReview)} la revizuire, ${fmtN(p.deactivated)} dezactivate`
}

function RunDetails({ run }: { run: any }) {
  const st = run.stats ?? {}
  const body = st.stats ?? {}
  return (
    <div className="grid gap-3 text-xs">
      {(st.warnings ?? []).map((w: string, i: number) => <div key={i} className="text-amber-700">⚠ {w}</div>)}
      {(st.errors ?? []).map((w: string, i: number) => <div key={i} className="text-red-700">✖ {w}</div>)}
      {(st.notes ?? []).map((w: string, i: number) => <div key={i}>{w}</div>)}
      <pre className="whitespace-pre-wrap break-words bg-background rounded border p-2 max-h-72 overflow-auto">{JSON.stringify(body, null, 2)}</pre>
      {(st.topPriceChanges ?? []).length > 0 && (
        <div><div className="font-medium mb-1">Top variații de preț</div>
          <table className="w-full"><tbody>{st.topPriceChanges.map((t: any) => (
            <tr key={t.code} className="border-t"><td className="font-mono pr-3">{t.code}</td><td className="pr-3">{t.oldPrice} → {t.newPrice} RON</td><td className="pr-3">{t.pct}%</td><td>{t.queued ? "la revizuire" : "aplicat"}</td></tr>))}</tbody></table>
        </div>)}
    </div>
  )
}
