"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { computePrice, type PricingChannel, type PricingRuleInput } from "@/lib/commerce/pricing"

export interface RuleRow {
  id: string; name: string; priority: number; categoryId: string | null; brand: string | null; quality: string | null
  costMin: number | null; costMax: number | null; markupPct: number; minMarginRon: number | null
  bulkySurchargeRon: number; competitorUndercutRon: number | null; isActive: boolean; appliedTo: number
}
export interface CategoryOpt { id: string; label: string; descendants: string[] }

// Form state keeps numbers as strings so the inputs can be edited freely
interface Draft {
  id: string | null; name: string; priority: string; categoryId: string; brand: string; quality: string
  costMin: string; costMax: string; markupPct: string; minMarginRon: string; bulkySurchargeRon: string; competitorUndercutRon: string; isActive: boolean
}
const EMPTY: Draft = { id: null, name: "", priority: "100", categoryId: "", brand: "", quality: "", costMin: "", costMax: "", markupPct: "", minMarginRon: "", bulkySurchargeRon: "0", competitorUndercutRon: "", isActive: true }

const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const fmt = (n: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(n)
const toNum = (s: string): number | null => { const t = s.trim().replace(",", "."); if (t === "") return null; const n = Number(t); return Number.isFinite(n) ? n : NaN }
const QUALITIES = ["OE", "A", "B", "aftermarket"]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

function validate(d: Draft): string | null {
  if (!d.name.trim()) return "Numele regulii este obligatoriu."
  const pr = toNum(d.priority)
  if (pr == null || !Number.isInteger(pr) || pr < 0 || pr > 10000) return "Prioritatea trebuie să fie un număr întreg între 0 și 10000."
  const mk = toNum(d.markupPct)
  if (mk == null || Number.isNaN(mk) || mk < 0 || mk > 1000) return "Markup-ul trebuie să fie între 0 și 1000%."
  for (const [v, l] of [[d.costMin, "Cost minim"], [d.costMax, "Cost maxim"], [d.minMarginRon, "Marja minimă"], [d.competitorUndercutRon, "Reducerea față de concurență"]] as const) {
    const n = toNum(v)
    if (Number.isNaN(n) || (n != null && n < 0)) return `${l} nu este valid.`
  }
  const b = toNum(d.bulkySurchargeRon)
  if (b == null || Number.isNaN(b) || b < 0) return "Suprataxa pentru produse voluminoase nu este validă."
  const lo = toNum(d.costMin), hi = toNum(d.costMax)
  if (lo != null && hi != null && lo >= hi) return "Costul minim trebuie să fie mai mic decât cel maxim."
  return null
}
function payload(d: Draft, businessLineId: string) {
  return {
    ...(d.id ? {} : { businessLineId }),
    name: d.name.trim(), priority: Number(toNum(d.priority)), categoryId: d.categoryId || null, brand: d.brand.trim() || null, quality: d.quality || null,
    costMin: toNum(d.costMin), costMax: toNum(d.costMax), markupPct: Number(toNum(d.markupPct)), minMarginRon: toNum(d.minMarginRon),
    bulkySurchargeRon: Number(toNum(d.bulkySurchargeRon)), competitorUndercutRon: toNum(d.competitorUndercutRon), isActive: d.isActive,
  }
}
const fromRow = (r: RuleRow): Draft => ({
  id: r.id, name: r.name, priority: String(r.priority), categoryId: r.categoryId ?? "", brand: r.brand ?? "", quality: r.quality ?? "",
  costMin: r.costMin?.toString() ?? "", costMax: r.costMax?.toString() ?? "", markupPct: String(r.markupPct), minMarginRon: r.minMarginRon?.toString() ?? "",
  bulkySurchargeRon: String(r.bulkySurchargeRon), competitorUndercutRon: r.competitorUndercutRon?.toString() ?? "", isActive: r.isActive,
})

export function RulesManager({ businessLineId, rules, categories, brands, channel, eurRate }: {
  businessLineId: string; rules: RuleRow[]; categories: CategoryOpt[]; brands: string[]; channel: PricingChannel; eurRate: number | null
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  // ── Simulator (runs in the browser with the same engine as the server; can include the unsaved draft) ──
  const [sim, setSim] = useState({ cost: "50", category: "", brand: "", quality: "", bulky: false, competitor: "", useDraft: true })
  const toInput = (r: { id: string; priority: number; categoryId: string | null; brand: string | null; quality: string | null; costMin: number | null; costMax: number | null; markupPct: number; minMarginRon: number | null; bulkySurchargeRon: number; competitorUndercutRon: number | null }): PricingRuleInput => ({
    id: r.id, priority: r.priority, brand: r.brand, quality: r.quality, markupPct: r.markupPct,
    categoryIds: r.categoryId ? catById.get(r.categoryId)?.descendants ?? [r.categoryId] : null,
    costMin: r.costMin, costMax: r.costMax, minMarginRon: r.minMarginRon, bulkySurchargeRon: r.bulkySurchargeRon, competitorUndercutRon: r.competitorUndercutRon,
  })
  const simResult = useMemo(() => {
    const cost = toNum(sim.cost)
    if (cost == null || Number.isNaN(cost) || !eurRate) return null
    let list = rules.filter((r) => r.isActive).map((r) => ({ ...r }))
    const useDraft = sim.useDraft && draft && !validate(draft)
    if (useDraft && draft) {
      const p = payload(draft, businessLineId)
      list = list.filter((r) => r.id !== draft.id)
      if (draft.isActive) list.push({ id: draft.id ?? "__draft__", name: p.name, priority: p.priority, categoryId: p.categoryId, brand: p.brand, quality: p.quality, costMin: p.costMin, costMax: p.costMax, markupPct: p.markupPct, minMarginRon: p.minMarginRon, bulkySurchargeRon: p.bulkySurchargeRon, competitorUndercutRon: p.competitorUndercutRon, isActive: true, appliedTo: 0 })
    }
    const sorted = list.map(toInput).sort((a, b) => b.priority - a.priority)
    const comp = toNum(sim.competitor)
    const res = computePrice(
      { costPrice: cost, costCurrency: "EUR", categoryId: sim.category || null, brand: sim.brand.trim() || null, quality: sim.quality || null, bulkyClass: sim.bulky ? "large" : null, manualPriceRon: null, competitorMinRon: comp != null && !Number.isNaN(comp) ? comp : null },
      channel, sorted, { EUR: eurRate },
    )
    const rule = res?.ruleId ? list.find((r) => (r.id ?? "__draft__") === res.ruleId) : null
    return { res, ruleName: rule ? (useDraft && (rule.id === "__draft__" || rule.id === draft?.id) ? `${rule.name} (ciornă)` : rule.name) : null, cost }
  }, [sim, rules, draft, channel, eurRate, catById, businessLineId])

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Operațiunea a eșuat")
      router.refresh()
      return true
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" }); return false } finally { setBusy(false) }
  }
  async function save() {
    if (!draft) return
    const err = validate(draft)
    if (err) { setMsg({ ok: false, text: err }); return }
    const ok = draft.id
      ? await call(`/api/commerce/pricing-rules/${draft.id}`, "PATCH", payload(draft, businessLineId))
      : await call(`/api/commerce/pricing-rules`, "POST", payload(draft, businessLineId))
    if (ok) { setDraft(null); setMsg({ ok: true, text: "Regula a fost salvată. Prețurile din catalog se schimbă după „Recalculează prețurile” din Setări canal." }) }
  }
  async function remove(r: RuleRow) {
    if (!confirm(`Ștergi regula „${r.name}”? ${r.appliedTo ? `Este aplicată pe ${r.appliedTo.toLocaleString("ro-RO")} produse; acestea trec pe următoarea regulă la recalculare.` : ""}`)) return
    if (await call(`/api/commerce/pricing-rules/${r.id}`, "DELETE")) setMsg({ ok: true, text: "Regula a fost ștearsă." })
  }
  const toggle = (r: RuleRow) => call(`/api/commerce/pricing-rules/${r.id}`, "PATCH", { isActive: !r.isActive })

  const conds = (r: RuleRow) => [
    r.categoryId ? `categorie: ${catById.get(r.categoryId)?.label ?? "?"}` : null,
    r.brand ? `brand: ${r.brand}` : null,
    r.quality ? `calitate: ${r.quality}` : null,
    r.costMin != null || r.costMax != null ? `cost aterizat: ${r.costMin != null ? `≥ ${r.costMin}` : ""}${r.costMin != null && r.costMax != null ? " și " : ""}${r.costMax != null ? `< ${r.costMax}` : ""} RON` : null,
  ].filter(Boolean).join(" · ") || "orice produs"

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  return (
    <div className="grid gap-6">
      {msg && <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Reguli ({rules.length})</CardTitle>
          <Button size="sm" onClick={() => { setDraft({ ...EMPTY }); setMsg(null) }} disabled={!!draft}><Plus className="mr-1 h-4 w-4" /> Regulă nouă</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-3">Prior.</th><th className="p-3">Regulă</th><th className="p-3">Condiții</th><th className="p-3 text-right">Markup</th><th className="p-3 text-right">Marjă min.</th><th className="p-3 text-right">Voluminos</th><th className="p-3 text-right">Produse</th><th className="p-3">Activă</th><th className="p-3" />
              </tr></thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className={`border-b last:border-0 ${r.isActive ? "" : "opacity-50"}`}>
                    <td className="p-3 font-mono">{r.priority}</td>
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{conds(r)}{r.competitorUndercutRon != null ? ` · −${r.competitorUndercutRon} RON față de concurență` : ""}</td>
                    <td className="p-3 text-right">{r.markupPct}%</td>
                    <td className="p-3 text-right">{r.minMarginRon != null ? fmt(r.minMarginRon) : <span className="text-muted-foreground">canal ({fmt(channel.minMarginRon)})</span>}</td>
                    <td className="p-3 text-right">{r.bulkySurchargeRon ? `+${fmt(r.bulkySurchargeRon)}` : "—"}</td>
                    <td className="p-3 text-right">{r.appliedTo.toLocaleString("ro-RO")}</td>
                    <td className="p-3"><input type="checkbox" checked={r.isActive} disabled={busy} onChange={() => toggle(r)} aria-label="Activă" /></td>
                    <td className="p-3 whitespace-nowrap text-right">
                      <button className="mr-3 text-primary" title="Editează" onClick={() => { setDraft(fromRow(r)); setMsg(null) }}><Pencil className="h-4 w-4" /></button>
                      <button className="text-destructive" title="Șterge" disabled={busy} onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nicio regulă. Toate produsele folosesc markup-ul implicit al canalului ({channel.defaultMarkupPct}%).</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="p-3 text-xs text-muted-foreground">„Produse” = listări la care regula a fost aplicată la ultima recalculare. Fără nicio regulă potrivită se folosește markup-ul implicit ({channel.defaultMarkupPct}%) din setările canalului.</p>
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{draft.id ? "Editează regula" : "Regulă nouă"}</CardTitle></CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nume"><input className={input} value={draft.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} /></Field>
              <Field label="Prioritate" hint="Mai mare = se verifică prima."><input className={input} inputMode="numeric" value={draft.priority} onChange={(e) => set({ priority: e.target.value })} /></Field>
              <Field label="Markup (%)" hint="Peste costul aterizat (cost × curs × transport)."><input className={input} inputMode="decimal" value={draft.markupPct} onChange={(e) => set({ markupPct: e.target.value })} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Categorie" hint="Include și subcategoriile.">
                <select className={input} value={draft.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                  <option value="">Oricare</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Brand">
                <input className={input} list="rule-brands" value={draft.brand} maxLength={60} placeholder="Oricare" onChange={(e) => set({ brand: e.target.value })} />
                <datalist id="rule-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
              </Field>
              <Field label="Calitate">
                <select className={input} value={draft.quality} onChange={(e) => set({ quality: e.target.value })}>
                  <option value="">Oricare</option>
                  {QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Cost aterizat de la (RON)" hint="Inclusiv. Gol = fără limită."><input className={input} inputMode="decimal" value={draft.costMin} onChange={(e) => set({ costMin: e.target.value })} /></Field>
              <Field label="Cost aterizat până la (RON)" hint="Exclusiv. Gol = fără limită."><input className={input} inputMode="decimal" value={draft.costMax} onChange={(e) => set({ costMax: e.target.value })} /></Field>
              <Field label="Marjă minimă (RON)" hint="Gol = cea din canal."><input className={input} inputMode="decimal" value={draft.minMarginRon} onChange={(e) => set({ minMarginRon: e.target.value })} /></Field>
              <Field label="Suprataxă voluminoase (RON)"><input className={input} inputMode="decimal" value={draft.bulkySurchargeRon} onChange={(e) => set({ bulkySurchargeRon: e.target.value })} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Sub prețul concurenței cu (RON)" hint="Gol = nu urmărește concurența."><input className={input} inputMode="decimal" value={draft.competitorUndercutRon} onChange={(e) => set({ competitorUndercutRon: e.target.value })} /></Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={draft.isActive} onChange={(e) => set({ isActive: e.target.checked })} /> Regulă activă</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvează</Button>
              <Button variant="outline" onClick={() => { setDraft(null); setMsg(null) }} disabled={busy}>Anulează</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Simulator</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Cost furnizor (EUR)"><input className={input} inputMode="decimal" value={sim.cost} onChange={(e) => setSim({ ...sim, cost: e.target.value })} /></Field>
            <Field label="Categorie">
              <select className={input} value={sim.category} onChange={(e) => setSim({ ...sim, category: e.target.value })}>
                <option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Brand"><input className={input} list="rule-brands" value={sim.brand} onChange={(e) => setSim({ ...sim, brand: e.target.value })} /></Field>
            <Field label="Calitate">
              <select className={input} value={sim.quality} onChange={(e) => setSim({ ...sim, quality: e.target.value })}>
                <option value="">—</option>{QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={sim.bulky} onChange={(e) => setSim({ ...sim, bulky: e.target.checked })} /> Produs voluminos</label>
            <label className="flex items-center gap-2">Preț concurență (RON, cu TVA): <input className={`${input} w-28`} inputMode="decimal" value={sim.competitor} onChange={(e) => setSim({ ...sim, competitor: e.target.value })} /></label>
            {draft && <label className="flex items-center gap-2"><input type="checkbox" checked={sim.useDraft} onChange={(e) => setSim({ ...sim, useDraft: e.target.checked })} /> Include regula din formular (nesalvată)</label>}
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            {!eurRate ? "Nu există un curs BNR salvat." : !simResult || !simResult.res ? "Completează un cost valid." : (
              <div className="grid gap-1">
                <div>Preț final cu TVA: <b className="text-base">{fmt(simResult.res.priceRon)}</b> <Badge variant="secondary">{simResult.res.priceSource === "competitor" ? "după concurență" : "regulă/markup"}</Badge></div>
                <div className="text-muted-foreground">
                  Regulă aplicată: {simResult.ruleName ?? `niciuna — markup implicit ${channel.defaultMarkupPct}%`} · cost aterizat {fmt(simResult.res.landedRon)} (curs BNR {eurRate}) · prag minim {fmt(simResult.res.floorRon)}
                  {simResult.res.landedRon > 0 && ` · adaos efectiv ${(((simResult.res.priceRon / (1 + channel.vatRate / 100)) / simResult.res.landedRon - 1) * 100).toFixed(1)}% net`}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Simulatorul folosește același motor ca recalcularea. Un preț setat manual pe un produs are întotdeauna prioritate față de reguli.</p>
        </CardContent>
      </Card>
    </div>
  )
}
