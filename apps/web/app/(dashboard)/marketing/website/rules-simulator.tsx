"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { describeAction, describeCondition, TRACE_LABEL, KIND_LABEL, type FieldOption } from "@/lib/website/rules/describe"
import type { RuleKind } from "@/lib/website/rules/types"
import { api, ApiError, Collection, inputCls, labelCls } from "./shared"
import { EntryPicker } from "./entry-picker"

const facts = (raw: Record<string, string>, fields: FieldOption[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v === "" || v === undefined) continue
    const f = fields.find((x) => x.key === k)
    if (f?.type === "boolean") out[k] = v === "true"
    else if (f?.type === "number") { const n = Number(v.replace(",", ".")); if (Number.isFinite(n)) out[k] = n }
    else if (f?.list) out[k] = v.split(",").map((s) => s.trim()).filter(Boolean)
    else out[k] = v
  }
  return out
}

/** "What would apply if…": evaluates the saved rules for a situation and explains every rule. Changes nothing. */
export function RulesSimulator({ lineId, kind, fields, collections }: { lineId: string; kind: RuleKind; fields: FieldOption[]; collections: Collection[] }) {
  const [raw, setRaw] = useState<Record<string, string>>({})
  const [at, setAt] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const set = (k: string, v: string) => setRaw((r) => ({ ...r, [k]: v }))
  const field = (k: string) => fields.find((f) => f.key === k)

  // choosing a firm fills in what is known about it, so the test starts from a realistic situation
  const fillFrom = (e: any) => {
    const col = collections.find((c) => c.id === e.collectionId)
    const next: Record<string, string> = { ...raw, entry: e.id, collection: col?.key ?? raw.collection ?? "", county: e.county ?? "", city: e.city ?? "", verified: String(!!e.verified) }
    for (const [k, v] of Object.entries(e.data ?? {})) next[`data.${k}`] = Array.isArray(v) ? v.join(", ") : String(v)
    setRaw(next)
  }

  async function run() {
    setBusy(true)
    try { setResult(await api(`/api/website/rules/simulate?lineId=${encodeURIComponent(lineId)}`, "POST", { kind, facts: facts(raw, fields), ...(at ? { at } : {}) })) }
    catch (e) { toast.error(e instanceof ApiError ? [e.message, ...(e.details ?? [])].join(" — ") : "Eroare") }
    finally { setBusy(false) }
  }

  const customKeys = fields.filter((f) => f.key.startsWith("data."))
  const text = (k: string, label: string, ph = "") => <div><label className={labelCls} htmlFor={`s-${k}`}>{label}</label><input id={`s-${k}`} className={inputCls} placeholder={ph} value={raw[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></div>
  const select = (k: string, label: string, options: string[]) => <div><label className={labelCls} htmlFor={`s-${k}`}>{label}</label><select id={`s-${k}`} className={inputCls} value={raw[k] ?? ""} onChange={(e) => set(k, e.target.value)}><option value="">—</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-4">
      <div>
        <h3 className="font-semibold">Simulator — {KIND_LABEL[kind]}</h3>
        <p className="text-xs text-muted-foreground">Descrie o situație și vezi ce regulă se aplică și de ce. Nu modifică nimic.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className={labelCls}>Firma (completează restul automat)</label><EntryPicker lineId={lineId} value={raw.entry ?? ""} onChange={(id) => set("entry", id)} onPick={fillFrom} /></div>
        {select("collection", "Colecție", collections.map((c) => c.key))}
        {select("requestType", "Tip cerere", ["direct", "general"])}
        {text("county", "Județ")}{text("city", "Oraș")}
        {select("verified", "Verificat", ["true", "false"])}
        {text("specialization", "Specializare (virgulă pentru mai multe)", "Instalații sanitare")}
        {text("budget", "Buget (RON)", "15000")}{text("urgency", "Urgență", "mare")}
        {customKeys.map((f) => <div key={f.key}>{f.options?.length ? select(f.key, f.label, f.options) : text(f.key, f.label)}</div>)}
        <div><label className={labelCls} htmlFor="s-at">La data (opțional)</label><input id="s-at" type="date" className={inputCls} value={at} onChange={(e) => setAt(e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={run} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />} Simulează</Button>
        <Button variant="ghost" onClick={() => { setRaw({}); setAt(""); setResult(null) }}>Golește</Button>
      </div>

      {result && (
        <div className="rounded-lg border p-3 flex flex-col gap-3" aria-live="polite">
          <div>
            <div className="text-xs text-muted-foreground">Rezultat</div>
            <div className="text-lg font-semibold" data-testid="sim-action">{describeAction(kind, result.action)}</div>
            <div className="text-xs mt-0.5">{result.via === "rule" ? <>Din regula <b>{result.rule.name}</b></> : <>Nicio regulă nu se potrivește: <b>valoarea implicită</b> a sistemului</>}</div>
          </div>
          <ol className="flex flex-col gap-1.5 text-xs">
            {result.trace.map((t: any, i: number) => (
              <li key={t.ruleId} className="flex items-start gap-2">
                <span className="w-4 text-muted-foreground">{i + 1}.</span>
                <span className="flex-1"><b>{t.name}</b>
                  {t.status === "no_match" && t.failed?.length > 0 && <span className="block text-muted-foreground">nu se potrivește: {t.failed.map((c: any) => describeCondition(c, fields)).join("; ")}</span>}
                </span>
                <Badge variant={t.status === "matched" ? "default" : "secondary"}>{TRACE_LABEL[t.status] ?? t.status}</Badge>
              </li>
            ))}
            {result.trace.length === 0 && <li className="text-muted-foreground">Nu există reguli de acest tip.</li>}
          </ol>
        </div>
      )}
    </div>
  )
}
