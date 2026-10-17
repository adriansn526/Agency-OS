"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, History, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DEFAULT_ACTIONS } from "@/lib/website/rules/defaults"
import { buildFieldOptions, describeAction, describeCondition, KIND_LABEL } from "@/lib/website/rules/describe"
import { RULE_KINDS, type RuleKind } from "@/lib/website/rules/types"
import { api, ApiError, Collection, fmtDate } from "./shared"
import { RuleEditor, type RuleRow } from "./rule-editor"
import { RulesSimulator } from "./rules-simulator"
import { RulesHistory } from "./rules-history"

const BLURB: Record<RuleKind, string> = {
  pricing: "Cât plătește o firmă pentru fiecare cerere de ofertă primită.",
  routing: "Câtor firme ajunge o cerere: una singură sau aceeași cerere la mai multe firme.",
  billing: "Momentul taxării: la livrarea cererii sau la acceptarea ei de către firmă.",
  recommendation: "Când o firmă primește insigna „Recomandat”: gratuit, pe baza recenziilor aprobate.",
}
// Only "recommendation" is applied by the site today; the others are prepared and tested in the simulator until requests are billed.
const NOT_LIVE: RuleKind[] = ["pricing", "routing", "billing"]

export function RulesTab({ lineId }: { lineId: string }) {
  const q = `lineId=${encodeURIComponent(lineId)}`
  const [kind, setKind] = useState<RuleKind>("recommendation")
  const [data, setData] = useState<{ limits: { maxPriceRon: number }; items: RuleRow[] } | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [editing, setEditing] = useState<RuleRow | "new" | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([api(`/api/website/rules?${q}`), api<Collection[]>(`/api/website/collections?${q}`)])
      setData(r); setCollections(c)
    } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") }
  }, [q])
  useEffect(() => { load() }, [load])

  // firms referenced by rule conditions are shown by name, not by id
  useEffect(() => {
    const ids = new Set<string>()
    for (const r of data?.items ?? []) for (const c of r.conditions) if (c.field === "entry" && typeof c.value === "string") ids.add(c.value)
    const missing = [...ids].filter((id) => !(id in names))
    if (!missing.length) return
    Promise.all(missing.map((id) => api(`/api/website/entries/${id}?${q}`).then((e) => [id, e.title as string] as const).catch(() => [id, id] as const)))
      .then((pairs) => setNames((n) => ({ ...n, ...Object.fromEntries(pairs) })))
  }, [data, names, q])

  const fields = useMemo(() => buildFieldOptions(collections), [collections])
  const rules = useMemo(() => (data?.items ?? []).filter((r) => r.kind === kind), [data, kind])
  const refreshed = async () => { await load(); setHistoryKey((k) => k + 1) }

  async function act(id: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(id)
    try { await fn(); if (ok) toast.success(ok); await refreshed() } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare"); await load() } finally { setBusy(null) }
  }

  const move = (i: number, dir: -1 | 1) => {
    const ids = rules.map((r) => r.id); const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
    // show the new order at once; the server answers 409 if the list changed meanwhile and we reload
    setData((d) => d && { ...d, items: [...d.items.filter((r) => r.kind !== kind), ...ids.map((id, n) => ({ ...d.items.find((r) => r.id === id)!, priority: (n + 1) * 10 }))] })
    act(`move-${ids[j]}`, () => api(`/api/website/rules/reorder?${q}`, "POST", { kind, ids }))
  }

  if (!data) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</div>

  const counts = (k: RuleKind) => data.items.filter((r) => r.kind === k && r.isActive).length

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Tip regulă" className="flex flex-wrap gap-2">
        {RULE_KINDS.map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${kind === k ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
            {KIND_LABEL[k]} <span className="opacity-70">({counts(k)})</span>
          </button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setShowHistory((v) => !v)}><History className="h-4 w-4 mr-1" /> Istoric</Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{KIND_LABEL[kind]}</h2>
          <p className="text-sm text-muted-foreground">{BLURB[kind]} Prima regulă care se potrivește, de sus în jos, se aplică.</p>
        </div>
        <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4 mr-1" /> Adaugă regulă</Button>
      </div>

      {NOT_LIVE.includes(kind) && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">Aceste reguli nu taxează și nu distribuie încă nimic: se activează odată cu inboxul partenerilor. Le poți pregăti acum și le poți încerca în simulator.</div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 flex flex-col gap-2">
          {rules.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nicio regulă. Se aplică valoarea implicită de mai jos.</div>}
          {rules.map((r, i) => (
            <div key={r.id} className={`rounded-lg border p-3 flex gap-3 ${r.isActive ? "" : "opacity-60"}`}>
              <div className="flex flex-col items-center gap-0.5">
                <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`Mută „${r.name}” mai sus`} disabled={i === 0 || !!busy} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`Mută „${r.name}” mai jos`} disabled={i === rules.length - 1 || !!busy} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.name}</span>
                  {!r.isActive && <Badge variant="secondary">oprită</Badge>}
                  {(r.validFrom || r.validTo) && <Badge variant="outline">{r.validFrom ? fmtDate(r.validFrom) : "…"} – {r.validTo ? fmtDate(r.validTo) : "…"}</Badge>}
                </div>
                <div className="text-sm mt-0.5"><b>{describeAction(kind, r.action)}</b></div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.conditions.length === 0 ? <span className="text-xs text-muted-foreground">oricând (regulă generală)</span>
                    : r.conditions.map((c, k) => <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-xs">{describeCondition(c, fields, names)}</span>)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={r.isActive} disabled={busy === r.id} onChange={(e) => act(r.id, () => api(`/api/website/rules/${r.id}?${q}`, "PATCH", { isActive: e.target.checked }), e.target.checked ? "Regulă activată" : "Regulă oprită")} /> activă</label>
                <div className="flex">
                  <Button size="icon" variant="ghost" aria-label={`Editează „${r.name}”`} onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label={`Șterge „${r.name}”`} disabled={busy === r.id} onClick={() => { if (confirm(`Ștergi regula „${r.name}”? Rămâne în istoric.`)) act(r.id, () => api(`/api/website/rules/${r.id}?${q}`, "DELETE"), "Regulă ștearsă") }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-dashed p-3 text-sm flex items-center gap-3 bg-muted/30">
            <span className="w-6 text-center text-muted-foreground">∞</span>
            <div><span className="text-xs text-muted-foreground">Implicit (dacă nicio regulă nu se potrivește)</span><div className="font-medium">{describeAction(kind, DEFAULT_ACTIONS[kind] as unknown as Record<string, unknown>)}</div></div>
          </div>
        </div>
        <div className="lg:col-span-2"><RulesSimulator lineId={lineId} kind={kind} fields={fields} collections={collections} names={names} /></div>
      </div>

      {showHistory && (<section><h3 className="text-sm font-semibold mb-2">Istoric modificări</h3><RulesHistory lineId={lineId} reloadKey={historyKey} /></section>)}

      {editing && (
        <RuleEditor lineId={lineId} kind={kind} rule={editing === "new" ? null : editing} fields={fields} limits={data.limits}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refreshed() }} />
      )}
    </div>
  )
}
