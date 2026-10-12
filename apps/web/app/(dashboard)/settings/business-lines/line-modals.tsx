"use client"

import { useState } from "react"
import Link from "next/link"
import { X, Check, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const EMOJIS = ["🏢", "🍕", "🏗️", "🛡️", "🛒", "💼", "🔧", "📱", "🎓", "🏥", "🚚", "🎨", "👤", "🤝", "📋", "🏭"]
const COLORS = ["#2563eb", "#f97316", "#0891b2", "#7c3aed", "#10b981", "#ef4444", "#ec4899", "#6366f1"]
const inputCls = "w-full h-9 px-3 bg-muted/50 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
const label = "text-xs font-semibold text-foreground-secondary mb-1.5 block"

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40)

function Shell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">{children}</div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">{footer}</div>
      </div>
    </div>
  )
}

/* ── Edit business line (name / icon / colour / domain). The slug never changes. ── */

export function EditLineModal({ line, onClose, onSaved }: { line: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState<string>(line.name)
  const [icon, setIcon] = useState<string>(line.icon)
  const [color, setColor] = useState<string>(line.color)
  const [domain, setDomain] = useState<string>(line.domain ?? "")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true); setErr(null)
    const res = await fetch(`/api/settings/business-lines/${line.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, icon, color, domain }) })
    setBusy(false)
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error || "Salvarea a eșuat"); return }
    onSaved()
  }

  return (
    <Shell title={`Editează linia — ${line.name}`} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Anulează</button>
        <button onClick={save} disabled={busy || !name.trim()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"><Check size={16} /> Salvează</button>
      </>
    }>
      <div><label className={label}>Nume</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><label className={label}>Domeniu (opțional)</label><input className={inputCls} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="ecaroseria.ro" /></div>
      <div>
        <label className={label}>Icon</label>
        <div className="flex flex-wrap gap-1.5">{EMOJIS.map((e) => <button key={e} onClick={() => setIcon(e)} className={cn("w-9 h-9 rounded-lg text-lg", icon === e ? "bg-primary/10 border-2 border-primary" : "bg-muted/50 border border-border hover:bg-muted")}>{e}</button>)}</div>
      </div>
      <div>
        <label className={label}>Culoare</label>
        <div className="flex flex-wrap gap-2">{COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={cn("w-8 h-8 rounded-full", color === c && "ring-2 ring-offset-2 ring-offset-surface scale-110")} style={{ backgroundColor: c }} />)}</div>
      </div>
      <p className="text-[11px] text-muted-foreground">Identificatorul liniei (<code>{line.slug}</code>) nu se schimbă la redenumire, ca să nu se strice integrările (expeditori email, storefront, scripturi).</p>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </Shell>
  )
}

/* ── Create / edit an entity type (pipeline stages are edited in Settings → Pipelines) ── */

interface FieldRow { key: string; label: string; type: "text" | "number" | "select" | "date" | "rating"; options: string }

export function EntityTypeModal({ lineId, entityType, onClose, onSaved }: { lineId: string; entityType?: any; onClose: () => void; onSaved: () => void }) {
  const editing = Boolean(entityType)
  const [name, setName] = useState<string>(entityType?.name ?? "")
  const [namePlural, setNamePlural] = useState<string>(entityType?.namePlural ?? "")
  const [icon, setIcon] = useState<string>(entityType?.icon ?? "📋")
  const [flow, setFlow] = useState<string>(entityType?.financialFlow ?? "income")
  const [stages, setStages] = useState("Nou\nÎn lucru\nFinalizat")
  const [fields, setFields] = useState<FieldRow[]>((entityType?.customFields ?? []).map((f: any) => ({ key: f.key, label: f.label, type: f.type, options: (f.options ?? []).join(", ") })))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const setField = (i: number, patch: Partial<FieldRow>) => setFields((p) => p.map((f, j) => (j === i ? { ...f, ...patch } : f)))

  async function save() {
    setBusy(true); setErr(null)
    const used = new Set<string>()
    const customFields = fields.filter((f) => f.label.trim()).map((f) => {
      let key = f.key || slug(f.label) || "camp"
      const base = key; for (let n = 2; used.has(key); n++) key = `${base}_${n}`
      used.add(key)
      const options = f.type === "select" ? f.options.split(",").map((o) => o.trim()).filter(Boolean) : undefined
      return { key, label: f.label.trim(), type: f.type, ...(options?.length ? { options } : {}) }
    })
    const body: any = { name, namePlural, icon, financialFlow: flow, customFields }
    if (!editing) {
      const keys = new Set<string>()
      body.pipeline = stages.split("\n").map((s) => s.trim()).filter(Boolean).map((l, i) => {
        let k = slug(l) || `etapa_${i + 1}`; const b = k; for (let n = 2; keys.has(k); n++) k = `${b}_${n}`
        keys.add(k)
        return { key: k, label: l, color: ["info", "warning", "accent", "success", "cyan", "orange"][i % 6] }
      })
    }
    const res = await fetch(editing ? `/api/settings/business-lines/${lineId}/entity-types/${entityType.id}` : `/api/settings/business-lines/${lineId}/entity-types`, {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    setBusy(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.details?.[0]?.message ? `${j.details[0].path?.join(".")}: ${j.details[0].message}` : j.error || "Salvarea a eșuat")
      return
    }
    onSaved()
  }

  return (
    <Shell title={editing ? `Editează tipul — ${entityType.namePlural}` : "Tip de entitate nou"} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Anulează</button>
        <button onClick={save} disabled={busy || !name.trim() || !namePlural.trim()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"><Check size={16} /> {editing ? "Salvează" : "Creează"}</button>
      </>
    }>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={label}>Nume (singular)</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Service partener" /></div>
        <div><label className={label}>Nume (plural)</label><input className={inputCls} value={namePlural} onChange={(e) => setNamePlural(e.target.value)} placeholder="Service-uri partenere" /></div>
      </div>
      <div>
        <label className={label}>Icon</label>
        <div className="flex flex-wrap gap-1.5">{EMOJIS.map((e) => <button key={e} onClick={() => setIcon(e)} className={cn("w-9 h-9 rounded-lg text-lg", icon === e ? "bg-primary/10 border-2 border-primary" : "bg-muted/50 border border-border hover:bg-muted")}>{e}</button>)}</div>
      </div>
      <div>
        <label className={label}>Flux financiar</label>
        <select className={inputCls} value={flow} onChange={(e) => setFlow(e.target.value)}>
          <option value="income">Venituri (clienți)</option>
          <option value="expense">Cheltuieli (furnizori, parteneri)</option>
          <option value="both">Mixt</option>
        </select>
      </div>
      {editing ? (
        <p className="text-[11px] text-muted-foreground">Etapele pipeline-ului ({entityType.pipeline?.length ?? 0}) se editează în <Link href="/settings/pipelines" className="text-primary underline">Setări → Pipeline-uri</Link>.</p>
      ) : (
        <div>
          <label className={label}>Etapele pipeline-ului (câte una pe rând, în ordine)</label>
          <textarea className={cn(inputCls, "h-24 py-2")} value={stages} onChange={(e) => setStages(e.target.value)} />
          <p className="mt-1 text-[11px] text-muted-foreground">Le poți modifica ulterior în Setări → Pipeline-uri.</p>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={cn(label, "mb-0")}>Câmpuri personalizate</label>
          <button onClick={() => setFields((p) => [...p, { key: "", label: "", type: "text", options: "" }])} className="flex items-center gap-1 text-[11px] text-primary"><Plus size={12} /> Adaugă câmp</button>
        </div>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={cn(inputCls, "h-8 flex-1")} value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="Nume câmp" />
              <select className={cn(inputCls, "h-8 w-28")} value={f.type} onChange={(e) => setField(i, { type: e.target.value as FieldRow["type"] })}>
                <option value="text">Text</option><option value="number">Număr</option><option value="select">Listă</option><option value="date">Dată</option><option value="rating">Rating</option>
              </select>
              {f.type === "select" && <input className={cn(inputCls, "h-8 flex-1")} value={f.options} onChange={(e) => setField(i, { options: e.target.value })} placeholder="opțiuni, separate prin virgulă" />}
              <button onClick={() => setFields((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
            </div>
          ))}
          {fields.length === 0 && <p className="text-[11px] text-muted-foreground">Niciun câmp personalizat.</p>}
        </div>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </Shell>
  )
}
