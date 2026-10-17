"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, X } from "lucide-react"
import { Modal } from "@/components/modal"
import { Button } from "@/components/ui/button"
import { OP_LABEL, SELECTION_LABEL, KIND_LABEL, type FieldOption } from "@/lib/website/rules/describe"
import type { Op, RuleKind } from "@/lib/website/rules/types"
import { api, ApiError, inputCls, labelCls } from "./shared"
import { EntryPicker } from "./entry-picker"

export interface RuleRow { id: string; kind: RuleKind; name: string; priority: number; isActive: boolean; conditions: any[]; action: any; validFrom: string | null; validTo: string | null }
interface CondDraft { field: string; op: Op; raw: string; list: string[] }
interface Draft { name: string; isActive: boolean; validFrom: string; validTo: string; conditions: CondDraft[]; action: Record<string, any> }

const DEFAULT_DRAFT_ACTION: Record<RuleKind, Record<string, any>> = {
  pricing: { amountRon: "0", freeFirstN: "0" },
  routing: { mode: "single", maxFirms: "3", maxAcceptances: "3", selection: "nearest" },
  billing: { chargeAt: "acceptance" },
  recommendation: { minReviews: "5", minRating: "4.5", requireVerified: true },
}
const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : "")
const opsFor = (f: FieldOption | undefined): Op[] => (f?.key === "entry" ? ["eq"] : f?.ops ?? ["eq"])

function toDraft(rule: RuleRow | null, kind: RuleKind): Draft {
  if (!rule) return { name: "", isActive: true, validFrom: "", validTo: "", conditions: [], action: { ...DEFAULT_DRAFT_ACTION[kind] } }
  const a: Record<string, any> = { ...rule.action }
  for (const k of ["amountRon", "freeFirstN", "maxFirms", "maxAcceptances", "minReviews", "minRating"]) if (k in a) a[k] = String(a[k])
  return {
    name: rule.name, isActive: rule.isActive, validFrom: dateOnly(rule.validFrom), validTo: dateOnly(rule.validTo), action: a,
    conditions: rule.conditions.map((c: any) => ({ field: c.field, op: c.op, raw: Array.isArray(c.value) ? "" : c.value === undefined ? "" : String(c.value), list: Array.isArray(c.value) ? c.value : [] })),
  }
}

/** Typed condition for the API from what the user entered; null when the row is incomplete. */
function toCondition(c: CondDraft, f: FieldOption | undefined): any | null {
  if (c.op === "exists") return { field: c.field, op: "exists", value: c.raw !== "false" }
  if (c.op === "in") {
    const list = c.list.length ? c.list : c.raw.split(",").map((s) => s.trim()).filter(Boolean)
    return list.length ? { field: c.field, op: "in", value: list } : null
  }
  if (c.raw.trim() === "") return null
  if (f?.type === "number" || c.op === "gte" || c.op === "lte") { const n = Number(c.raw.replace(",", ".")); return Number.isFinite(n) ? { field: c.field, op: c.op, value: n } : null }
  if (f?.type === "boolean") return { field: c.field, op: c.op, value: c.raw === "true" }
  return { field: c.field, op: c.op, value: c.raw.trim() }
}

function ValueInput({ lineId, c, f, onChange }: { lineId: string; c: CondDraft; f: FieldOption | undefined; onChange: (patch: Partial<CondDraft>) => void }) {
  if (c.op === "exists") return <select aria-label="Valoare" className={inputCls} value={c.raw === "false" ? "false" : "true"} onChange={(e) => onChange({ raw: e.target.value })}><option value="true">este completat</option><option value="false">nu este completat</option></select>
  if (f?.key === "entry") return <EntryPicker lineId={lineId} value={c.raw} onChange={(id) => onChange({ raw: id })} />
  if (c.op === "in") {
    if (f?.options?.length) return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 py-1">{f.options.map((o) => (
        <label key={o} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={c.list.includes(o)} onChange={(e) => onChange({ list: e.target.checked ? [...c.list, o] : c.list.filter((x) => x !== o) })} /> {o}</label>
      ))}</div>
    )
    return <input aria-label="Valori" className={inputCls} placeholder="valori separate prin virgulă" value={c.raw} onChange={(e) => onChange({ raw: e.target.value })} />
  }
  if (f?.type === "boolean") return <select aria-label="Valoare" className={inputCls} value={c.raw} onChange={(e) => onChange({ raw: e.target.value })}><option value="">—</option><option value="true">Da</option><option value="false">Nu</option></select>
  if (f?.options?.length) return <select aria-label="Valoare" className={inputCls} value={c.raw} onChange={(e) => onChange({ raw: e.target.value })}><option value="">—</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
  if (f?.type === "number") return <input aria-label="Valoare" type="number" step="any" className={inputCls} value={c.raw} onChange={(e) => onChange({ raw: e.target.value })} />
  return <input aria-label="Valoare" className={inputCls} value={c.raw} onChange={(e) => onChange({ raw: e.target.value })} />
}

export function RuleEditor({ lineId, kind, rule, fields, limits, onClose, onSaved }: {
  lineId: string; kind: RuleKind; rule: RuleRow | null; fields: FieldOption[]; limits: { maxPriceRon: number }; onClose: () => void; onSaved: () => void
}) {
  const [d, setD] = useState<Draft>(() => toDraft(rule, kind))
  const [saving, setSaving] = useState(false)
  const [issues, setIssues] = useState<string[]>([])
  const alertRef = useRef<HTMLUListElement>(null)
  useEffect(() => { if (issues.length) alertRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }) }, [issues])

  const setAction = (patch: Record<string, any>) => setD((x) => ({ ...x, action: { ...x.action, ...patch } }))
  const setCond = (i: number, patch: Partial<CondDraft>) => setD((x) => ({ ...x, conditions: x.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) }))
  const num = (s: any) => Number(String(s).replace(",", "."))

  async function save() {
    setSaving(true); setIssues([])
    const problems: string[] = []
    const conditions = d.conditions.map((c, i) => {
      const cond = toCondition(c, fields.find((f) => f.key === c.field))
      if (!cond) problems.push(`Condiția ${i + 1} nu este completată corect`)
      return cond
    })
    if (problems.length) { setIssues(problems); setSaving(false); return }

    const a = d.action
    const action =
      kind === "pricing" ? { amountRon: num(a.amountRon), freeFirstN: num(a.freeFirstN || 0) }
      : kind === "routing" ? (a.mode === "multi" ? { mode: "multi", maxFirms: num(a.maxFirms), maxAcceptances: num(a.maxAcceptances), selection: a.selection } : { mode: "single", maxFirms: 1, maxAcceptances: 1, selection: a.selection })
      : kind === "billing" ? { chargeAt: a.chargeAt }
      : { minReviews: num(a.minReviews), minRating: num(a.minRating), requireVerified: !!a.requireVerified }

    const body = { ...(rule ? {} : { kind }), name: d.name.trim(), isActive: d.isActive, conditions, action, validFrom: d.validFrom || null, validTo: d.validTo || null }
    try {
      await api(rule ? `/api/website/rules/${rule.id}?lineId=${encodeURIComponent(lineId)}` : `/api/website/rules?lineId=${encodeURIComponent(lineId)}`, rule ? "PATCH" : "POST", body)
      toast.success(rule ? "Regulă salvată" : "Regulă creată"); onSaved()
    } catch (e) {
      if (e instanceof ApiError) { setIssues([e.message, ...(e.details ?? [])]); toast.error(e.details?.[0] ?? e.message) } else toast.error("Eroare")
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={`${rule ? "Editează regula" : "Regulă nouă"} · ${KIND_LABEL[kind]}`} description="Prima regulă care se potrivește (de sus în jos) se aplică." size="lg">
      <div className="flex flex-col gap-5">
        {issues.length > 0 && <ul ref={alertRef} role="alert" className="rounded-md border border-destructive/50 p-3 text-sm text-destructive list-disc pl-6">{issues.map((m, i) => <li key={i}>{m}</li>)}</ul>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className={labelCls} htmlFor="r-name">Nume (doar pentru tine)</label><input id="r-name" className={inputCls} placeholder="ex: Instalatori Cluj" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="r-from">Valabilă de la</label><input id="r-from" type="date" className={inputCls} value={d.validFrom} onChange={(e) => setD({ ...d, validFrom: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="r-to">Până la (ziua aceasta nu mai e inclusă)</label><input id="r-to" type="date" className={inputCls} value={d.validTo} onChange={(e) => setD({ ...d, validTo: e.target.value })} /></div>
          <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} /> Regulă activă</label>
        </div>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Când se aplică <span className="font-normal text-muted-foreground">(toate condițiile, fără condiții = oricând)</span></h3>
            <Button size="sm" variant="outline" onClick={() => setD({ ...d, conditions: [...d.conditions, { field: fields[0]?.key ?? "county", op: opsFor(fields[0])[0] ?? "eq", raw: "", list: [] }] })}><Plus className="h-3.5 w-3.5 mr-1" /> Condiție</Button>
          </div>
          {d.conditions.length === 0 && <p className="text-xs text-muted-foreground">Regulă generală: se aplică oricărei situații care ajunge la ea. Pune-o ultima.</p>}
          <div className="flex flex-col gap-2">
            {d.conditions.map((c, i) => {
              const f = fields.find((x) => x.key === c.field)
              return (
                <div key={i} className="rounded-md border p-2 grid grid-cols-12 gap-2 items-start">
                  <select aria-label="Câmp" className={inputCls + " col-span-4"} value={c.field} onChange={(e) => { const nf = fields.find((x) => x.key === e.target.value); setCond(i, { field: e.target.value, op: opsFor(nf)[0] ?? "eq", raw: "", list: [] }) }}>
                    {fields.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                    {!f && <option value={c.field}>{c.field}</option>}
                  </select>
                  <select aria-label="Operator" className={inputCls + " col-span-3"} value={c.op} onChange={(e) => setCond(i, { op: e.target.value as Op, raw: "", list: [] })}>
                    {opsFor(f).map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
                  </select>
                  <div className="col-span-4"><ValueInput lineId={lineId} c={c} f={f} onChange={(p) => setCond(i, p)} /></div>
                  <Button size="icon" variant="ghost" className="col-span-1" aria-label="Elimină condiția" onClick={() => setD({ ...d, conditions: d.conditions.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-2">Ce se întâmplă</h3>
          {kind === "pricing" && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} htmlFor="a-amount">Preț per cerere (RON, max {limits.maxPriceRon})</label><input id="a-amount" type="number" min={0} max={limits.maxPriceRon} step="0.01" className={inputCls} value={d.action.amountRon} onChange={(e) => setAction({ amountRon: e.target.value })} /></div>
              <div><label className={labelCls} htmlFor="a-free">Primele cereri gratuite</label><input id="a-free" type="number" min={0} className={inputCls} value={d.action.freeFirstN} onChange={(e) => setAction({ freeFirstN: e.target.value })} /></div>
              <p className="col-span-2 text-xs text-muted-foreground">0 RON = gratuit. „Primele cereri gratuite” se numără pe firmă.</p>
            </div>
          )}
          {kind === "routing" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex gap-5 text-sm">
                <label className="flex items-center gap-2"><input type="radio" name="mode" checked={d.action.mode === "single"} onChange={() => setAction({ mode: "single" })} /> O singură firmă</label>
                <label className="flex items-center gap-2"><input type="radio" name="mode" checked={d.action.mode === "multi"} onChange={() => setAction({ mode: "multi" })} /> Mai multe firme primesc aceeași cerere</label>
              </div>
              {d.action.mode === "multi" && <>
                <div><label className={labelCls} htmlFor="a-firms">Câte firme primesc cererea (2–10)</label><input id="a-firms" type="number" min={2} max={10} className={inputCls} value={d.action.maxFirms} onChange={(e) => setAction({ maxFirms: e.target.value })} /></div>
                <div><label className={labelCls} htmlFor="a-acc">Câte pot accepta (max cât firmele)</label><input id="a-acc" type="number" min={1} max={10} className={inputCls} value={d.action.maxAcceptances} onChange={(e) => setAction({ maxAcceptances: e.target.value })} /></div>
              </>}
              <div className="col-span-2"><label className={labelCls} htmlFor="a-sel">Cum se aleg firmele</label>
                <select id="a-sel" className={inputCls} value={d.action.selection} onChange={(e) => setAction({ selection: e.target.value })}>{Object.entries(SELECTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </div>
          )}
          {kind === "billing" && (
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-start gap-2"><input type="radio" name="chargeAt" className="mt-1" checked={d.action.chargeAt === "acceptance"} onChange={() => setAction({ chargeAt: "acceptance" })} /> <span><b>La acceptare</b> — firma plătește doar când acceptă cererea și vede datele de contact.</span></label>
              <label className="flex items-start gap-2"><input type="radio" name="chargeAt" className="mt-1" checked={d.action.chargeAt === "delivery"} onChange={() => setAction({ chargeAt: "delivery" })} /> <span><b>La livrare</b> — firma plătește când cererea îi este trimisă, chiar dacă nu o acceptă.</span></label>
            </div>
          )}
          {kind === "recommendation" && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} htmlFor="a-rev">Minim de recenzii aprobate</label><input id="a-rev" type="number" min={0} className={inputCls} value={d.action.minReviews} onChange={(e) => setAction({ minReviews: e.target.value })} /></div>
              <div><label className={labelCls} htmlFor="a-rate">Media minimă (0–5)</label><input id="a-rate" type="number" min={0} max={5} step="0.1" className={inputCls} value={d.action.minRating} onChange={(e) => setAction({ minRating: e.target.value })} /></div>
              <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.action.requireVerified} onChange={(e) => setAction({ requireVerified: e.target.checked })} /> Doar firme verificate</label>
            </div>
          )}
        </section>

        <div className="flex justify-end gap-2 sticky -bottom-6 -mx-6 -mb-6 px-6 py-3 border-t border-border bg-surface">
          <Button variant="ghost" onClick={onClose}>Renunță</Button>
          <Button disabled={saving || d.name.trim().length < 1} onClick={save}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvează</Button>
        </div>
      </div>
    </Modal>
  )
}
