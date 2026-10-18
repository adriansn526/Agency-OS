"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

interface Def { key: string; label: string; type: "text" | "number" | "select" | "date" | "rating"; options?: string[] }

/** The fields defined for the lead's type (Setări → linii de business) and the pilot switch. Saves only what changed; other data on the lead is untouched. */
export function CustomFieldsCard({ lead, defs, onSaved }: { lead: any; defs: Def[]; onSaved: (customFields: Record<string, unknown>) => void }) {
  const cf = (lead.customFields ?? {}) as Record<string, unknown>
  const initial = useMemo(() => Object.fromEntries(defs.map((d) => [d.key, cf[d.key] == null ? "" : String(cf[d.key])])), [defs, lead.customFields]) // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<Record<string, string>>(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => setDraft(initial), [initial])
  const dirty = defs.filter((d) => draft[d.key] !== initial[d.key])
  const pilot = cf.pilot === "da"

  async function patch(set: Record<string, string | number | null>, ok: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}/custom-fields`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ set }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Nu am putut salva")
      const next = { ...cf }
      for (const [k, v] of Object.entries(set)) { if (v === null || v === "") delete next[k]; else next[k] = v }
      onSaved(next); toast.success(ok)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Eroare") } finally { setBusy(false) }
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4 space-y-3" aria-label="Câmpuri personalizate">
      <h3 className="text-sm font-semibold text-foreground">Câmpuri personalizate</h3>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={pilot} disabled={busy} onChange={(e) => patch({ pilot: e.target.checked ? "da" : null }, e.target.checked ? "Adăugată în pilot" : "Scoasă din pilot")} />
        <span><b>În pilot</b> <span className="text-muted-foreground">— apare în coada de apeluri (Apeluri) și în filtrul „Pilot”.</span></span>
      </label>
      {defs.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {defs.map((d) => (
            <div key={d.key}>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1" htmlFor={`cf-${d.key}`}>{d.label}</label>
              {d.type === "select" ? (
                <select id={`cf-${d.key}`} className={inputCls} value={draft[d.key] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [d.key]: e.target.value }))}>
                  <option value="">—</option>{d.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input id={`cf-${d.key}`} className={inputCls} type={d.type === "date" ? "date" : d.type === "number" || d.type === "rating" ? "number" : "text"} step={d.type === "rating" ? "0.1" : undefined} value={draft[d.key] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [d.key]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>
      )}
      {dirty.length > 0 && (
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={busy} onClick={() => patch(Object.fromEntries(dirty.map((d) => [d.key, draft[d.key] === "" ? null : d.type === "number" || d.type === "rating" ? Number(draft[d.key]) : draft[d.key]!])), "Câmpuri salvate")}>{busy ? "Se salvează…" : `Salvează (${dirty.length})`}</Button>
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setDraft(initial)}>Anulează</button>
        </div>
      )}
    </div>
  )
}
