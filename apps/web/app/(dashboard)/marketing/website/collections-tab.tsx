"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { Modal } from "@/components/modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { api, ApiError, Collection, Field, FIELD_TYPE_RO, inputCls, KIND_RO, labelCls } from "./shared"

const slugKey = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40)
const blank = (): Partial<Collection> => ({ key: "", name: "", namePlural: "", kind: "listing", fields: [], sortOrder: 0, isActive: true })

export function CollectionsTab({ lineId, onChanged }: { lineId: string; onChanged: () => Promise<void> }) {
  const q = `lineId=${encodeURIComponent(lineId)}`
  const [items, setItems] = useState<Collection[] | null>(null)
  const [editing, setEditing] = useState<Partial<Collection> | null>(null)
  const [saving, setSaving] = useState(false)
  const [issues, setIssues] = useState<string[]>([])

  const load = useCallback(async () => {
    try { setItems(await api<Collection[]>(`/api/website/collections?${q}`)) } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") }
  }, [q])
  useEffect(() => { load() }, [load])

  const isNew = !!editing && !editing.id
  const setField = (i: number, patch: Partial<Field>) => setEditing((c) => c && { ...c, fields: (c.fields ?? []).map((f, j) => (j === i ? { ...f, ...patch } : f)) })

  async function save() {
    if (!editing) return
    setSaving(true); setIssues([])
    try {
      // strip the transient raw-text helper used by the options input
      const fields = (editing.fields ?? []).map(({ _opt, ...f }: Field & { _opt?: string }) => f)
      const body = { name: editing.name, namePlural: editing.namePlural, kind: editing.kind, fields, sortOrder: Number(editing.sortOrder) || 0, ...(isNew ? { key: editing.key } : { isActive: editing.isActive }) }
      await api(isNew ? `/api/website/collections?${q}` : `/api/website/collections/${editing.id}?${q}`, isNew ? "POST" : "PATCH", body)
      toast.success("Colecție salvată"); setEditing(null); await load(); await onChanged()
    } catch (e) { if (e instanceof ApiError) { setIssues([e.message, ...(e.details ?? [])]) } else toast.error("Eroare") }
    finally { setSaving(false) }
  }

  async function remove(c: Collection) {
    if (!confirm(`Ștergi colecția „${c.namePlural}”?`)) return
    try { await api(`/api/website/collections/${c.id}?${q}`, "DELETE"); toast.success("Colecție ștearsă"); await load(); await onChanged() }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") }
  }

  if (!items) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">O colecție este un tip de conținut cu câmpurile lui (ex. „Companii”: CUI, tip, servicii).</p>
        <Button onClick={() => setEditing(blank())}><Plus className="h-4 w-4 mr-1" /> Colecție nouă</Button>
      </div>
      {items.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Nicio colecție. Creează prima ca să poți adăuga intrări.</CardContent></Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <Card key={c.id}><CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="font-semibold">{c.namePlural}</span>{!c.isActive && <Badge variant="destructive">inactivă</Badge>}</div>
                <div className="text-xs text-muted-foreground mt-0.5"><code>{c.key}</code> · {KIND_RO[c.kind] ?? c.kind} · {c.entryCount ?? 0} intrări · {c.fields.length} câmpuri</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" aria-label={`Editează ${c.namePlural}`} onClick={() => { setIssues([]); setEditing(c) }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label={`Șterge ${c.namePlural}`} onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "Colecție nouă" : `Editează „${editing?.namePlural ?? ""}”`} size="lg">
        {editing && (
          <div className="flex flex-col gap-4">
            {issues.length > 0 && <ul className="rounded-md border border-destructive/50 p-3 text-sm text-destructive list-disc pl-6">{issues.map((m, i) => <li key={i}>{m}</li>)}</ul>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Nume (singular)</label><input className={inputCls} value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, ...(isNew && !editing.key ? { key: slugKey(e.target.value).replace(/_/g, "-") } : {}) })} /></div>
              <div><label className={labelCls}>Nume (plural)</label><input className={inputCls} value={editing.namePlural ?? ""} onChange={(e) => setEditing({ ...editing, namePlural: e.target.value, ...(isNew ? { key: slugKey(e.target.value).replace(/_/g, "-") } : {}) })} /></div>
              <div><label className={labelCls}>Cheie (în URL și API)</label><input className={inputCls} value={editing.key ?? ""} disabled={!isNew} onChange={(e) => setEditing({ ...editing, key: e.target.value })} /></div>
              <div><label className={labelCls}>Tip</label>
                <select className={inputCls} value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>{Object.entries(KIND_RO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className={labelCls}>Ordine în meniu</label><input type="number" className={inputCls} value={editing.sortOrder ?? 0} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} /></div>
              {!isNew && <label className="flex items-center gap-2 text-sm self-end pb-2"><input type="checkbox" checked={!!editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Colecție activă (vizibilă în API)</label>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={labelCls + " mb-0"}>Câmpuri personalizate</span>
                <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, fields: [...(editing.fields ?? []), { key: "", label: "", type: "text" }] })}><Plus className="h-3.5 w-3.5 mr-1" /> Câmp</Button>
              </div>
              {(editing.fields ?? []).length === 0 && <p className="text-xs text-muted-foreground">Fără câmpuri suplimentare. Orice intrare are deja titlu, rezumat, text, locație, contact și SEO.</p>}
              <div className="flex flex-col gap-2">
                {(editing.fields ?? []).map((f, i) => (
                  <div key={i} className="rounded-md border p-2 grid grid-cols-12 gap-2 items-center">
                    <input aria-label="Etichetă" className={inputCls + " col-span-4"} placeholder="Etichetă" value={f.label} onChange={(e) => setField(i, { label: e.target.value, ...(f.key === "" || f.key === slugKey(f.label) ? { key: slugKey(e.target.value) } : {}) })} />
                    <input aria-label="Cheie" className={inputCls + " col-span-3"} placeholder="cheie" value={f.key} onChange={(e) => setField(i, { key: e.target.value })} />
                    <select aria-label="Tip câmp" className={inputCls + " col-span-3"} value={f.type} onChange={(e) => setField(i, { type: e.target.value as Field["type"] })}>{Object.entries(FIELD_TYPE_RO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <Button size="icon" variant="ghost" className="col-span-2 justify-self-end" aria-label="Elimină câmpul" onClick={() => setEditing({ ...editing, fields: (editing.fields ?? []).filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
                    {f.type === "select" && <input aria-label="Opțiuni" className={inputCls + " col-span-12"} placeholder="Opțiuni separate prin virgulă" value={(f as Field & { _opt?: string })._opt ?? (f.options ?? []).join(", ")} onChange={(e) => setField(i, { _opt: e.target.value, options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } as Partial<Field>)} />}
                    <div className="col-span-12 flex gap-4 text-xs">
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> Obligatoriu la publicare</label>
                      {(f.type === "text" || f.type === "select") && <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.filterable} onChange={(e) => setField(i, { filterable: e.target.checked })} /> Filtrabil în API</label>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Renunță</Button>
              <Button disabled={saving || !editing.name || !editing.namePlural || (isNew && !editing.key)} onClick={save}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvează</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
