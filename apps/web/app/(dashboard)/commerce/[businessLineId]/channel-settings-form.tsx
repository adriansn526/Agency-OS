"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { computePrice } from "@/lib/commerce/pricing"

interface Settings {
  isEnabled: boolean
  storefrontUrl: string
  vatRate: number
  transportPct: number
  defaultMarkupPct: number
  minMarginRon: number
  roundingMode: string
}

const ROUNDING = [
  { value: "99", label: "Până la ,99 (ex. 124,99)" },
  { value: "90", label: "Până la ,90 (ex. 124,90)" },
  { value: "integer", label: "Număr întreg (ex. 125)" },
  { value: "none", label: "Fără rotunjire (2 zecimale)" },
]
interface Preview {
  listings: number; changed: number; up: number; down: number; avgChangePct: number; medianChangePct: number; p5ChangePct: number; p95ChangePct: number
  samples: Array<{ sku: string; name: string | null; currentRon: number; newRon: number; changePct: number }>
}
const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("ro-RO")}%`
const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const fmt = (n: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(n)

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function ChannelSettingsForm({
  businessLineId, initial, eurRate, eurRateDate, activeListings, lastPriceUpdate,
}: {
  businessLineId: string
  initial: Settings
  eurRate: number | null
  eurRateDate: string | null
  activeListings: number
  lastPriceUpdate: string | null
}) {
  const [saved, setSaved] = useState(initial)
  const [s, setS] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [repricing, setRepricing] = useState(false)
  const [repriceInfo, setRepriceInfo] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const dirty = JSON.stringify(s) !== JSON.stringify(saved)
  const num = (v: string) => (v === "" ? NaN : Number(v.replace(",", ".")))
  const valid = [s.vatRate, s.transportPct, s.defaultMarkupPct, s.minMarginRon].every((n) => Number.isFinite(n) && n >= 0)

  // Live example: a part that costs 50 EUR (default markup; pricing rules, when matching, take precedence)
  const example = eurRate && valid
    ? computePrice(
        { costPrice: 50, costCurrency: "EUR", categoryId: null, brand: null, quality: null, bulkyClass: null, manualPriceRon: null, competitorMinRon: null },
        s, [], { EUR: eurRate },
      )
    : null

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/commerce/channels/${businessLineId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s, storefrontUrl: s.storefrontUrl.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Nu s-au putut salva setările")
      setSaved(s)
      setMsg({ ok: true, text: "Setările au fost salvate. Prețurile din catalog se schimbă abia după „Recalculează prețurile”." })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" })
    } finally { setSaving(false) }
  }

  async function poll() {
    const r = await fetch(`/api/commerce/channels/${businessLineId}/reprice`).then((x) => x.json()).catch(() => null)
    if (!r) return
    if (r.running) { setRepricing(true); return }
    setRepricing(false)
    if (r.error) setRepriceInfo(`Eroare la recalculare: ${r.error}`)
    else if (r.result) setRepriceInfo(`Recalculare încheiată: ${r.result.priceUpdates} prețuri modificate din ${r.result.priced} (curs EUR ${r.result.eurRate}).`)
  }
  useEffect(() => { void poll() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!repricing) return
    const t = setInterval(poll, 4000)
    return () => clearInterval(t)
  }, [repricing]) // eslint-disable-line react-hooks/exhaustive-deps

  async function runPreview() {
    setPreviewing(true); setRepriceInfo(null); setPreview(null)
    try {
      const res = await fetch(`/api/commerce/channels/${businessLineId}/reprice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dryRun: true }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Previzualizarea a eșuat")
      setPreview(data.preview)
    } catch (e) { setRepriceInfo(`Eroare: ${e instanceof Error ? e.message : "previzualizare eșuată"}`) } finally { setPreviewing(false) }
  }

  async function reprice() {
    if (!preview) return
    if (!confirm(`Aplici recalcularea? ${preview.changed.toLocaleString("ro-RO")} prețuri se schimbă (medie ${pct(preview.avgChangePct)}, mediană ${pct(preview.medianChangePct)}) și apar imediat în storefront. Acțiunea nu se poate anula automat.`)) return
    setRepriceInfo(null)
    const res = await fetch(`/api/commerce/channels/${businessLineId}/reprice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apply: true }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setRepriceInfo(data.error || "Nu s-a putut porni recalcularea"); return }
    setPreview(null)
    setRepricing(true)
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Parametri de preț</CardTitle></CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="TVA (%)" hint="Se adaugă la prețul net.">
              <input className={input} inputMode="decimal" value={s.vatRate} onChange={(e) => setS({ ...s, vatRate: num(e.target.value) })} />
            </Field>
            <Field label="Transport / cost de aducere (%)" hint="Adaos peste costul furnizorului, înainte de markup.">
              <input className={input} inputMode="decimal" value={s.transportPct} onChange={(e) => setS({ ...s, transportPct: num(e.target.value) })} />
            </Field>
            <Field label="Markup implicit (%)" hint="Se aplică când nicio regulă de preț nu se potrivește.">
              <input className={input} inputMode="decimal" value={s.defaultMarkupPct} onChange={(e) => setS({ ...s, defaultMarkupPct: num(e.target.value) })} />
            </Field>
            <Field label="Marjă minimă (RON)" hint="Prețul net nu scade sub cost + această marjă.">
              <input className={input} inputMode="decimal" value={s.minMarginRon} onChange={(e) => setS({ ...s, minMarginRon: num(e.target.value) })} />
            </Field>
            <Field label="Rotunjire">
              <select className={input} value={s.roundingMode} onChange={(e) => setS({ ...s, roundingMode: e.target.value })}>
                {ROUNDING.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="URL storefront" hint="Opțional, ex. https://ecaroseria.ro">
              <input className={input} value={s.storefrontUrl} onChange={(e) => setS({ ...s, storefrontUrl: e.target.value })} placeholder="https://" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.isEnabled} onChange={(e) => setS({ ...s, isEnabled: e.target.checked })} />
            Canal activ (dacă îl dezactivezi, recalcularea prețurilor nu mai rulează)
          </label>

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="font-medium mb-1">Exemplu: piesă cu cost 50 EUR</div>
            {example
              ? <div>Preț final cu TVA: <b>{fmt(example.priceRon)}</b> <span className="text-muted-foreground">(cost de aducere {fmt(example.landedRon)}; curs BNR {eurRate} din {eurRateDate}; regulile de preț pot schimba rezultatul)</span></div>
              : <div className="text-muted-foreground">{eurRate ? "Completează valori valide." : "Nu există un curs BNR salvat."}</div>}
          </div>

          {msg && <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={!dirty || !valid || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Salvează
            </Button>
            {dirty && <Button variant="outline" onClick={() => { setS(saved); setMsg(null) }}>Anulează modificările</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recalculare prețuri</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p className="text-muted-foreground">
            {activeListings.toLocaleString("ro-RO")} produse active. Ultima actualizare de preț: {lastPriceUpdate ? new Date(lastPriceUpdate).toLocaleString("ro-RO") : "—"}.
            Salvarea setărilor nu modifică prețurile existente. Întâi previzualizezi impactul, apoi poți aplica recalcularea.
          </p>
          {dirty && <Alert>Ai modificări nesalvate; recalcularea folosește doar setările salvate.</Alert>}
          {repriceInfo && <Alert variant={repriceInfo.startsWith("Eroare") ? "destructive" : "default"}>{repriceInfo}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={runPreview} disabled={previewing || repricing || !saved.isEnabled}>
              {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {previewing ? "Se calculează…" : "Previzualizează impactul"}
            </Button>
            <Button onClick={reprice} disabled={!preview || repricing || previewing}>
              {repricing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {repricing ? "Se recalculează…" : "Aplică recalcularea"}
            </Button>
          </div>
          {preview && (
            <div className="rounded-md border bg-muted/40 p-3 grid gap-2">
              <div className="font-medium">Impact asupra a {preview.listings.toLocaleString("ro-RO")} produse (nu s-a modificat nimic încă)</div>
              <div>
                {preview.changed.toLocaleString("ro-RO")} prețuri s-ar schimba: {preview.up.toLocaleString("ro-RO")} cresc, {preview.down.toLocaleString("ro-RO")} scad.
                Variație medie <b>{pct(preview.avgChangePct)}</b>, mediană <b>{pct(preview.medianChangePct)}</b>, 90% dintre produse între {pct(preview.p5ChangePct)} și {pct(preview.p95ChangePct)}.
              </div>
              <div className="text-xs text-muted-foreground">Cele mai mari schimbări:</div>
              <ul className="text-xs grid gap-0.5">
                {preview.samples.map((x) => (
                  <li key={x.sku}><span className="font-mono">{x.sku}</span> {x.name ? `· ${x.name.slice(0, 50)}` : ""}: {fmt(x.currentRon)} → <b>{fmt(x.newRon)}</b> ({pct(x.changePct)})</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
