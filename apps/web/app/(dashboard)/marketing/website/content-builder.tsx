"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, ExternalLink, History, Loader2, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PageBlockDef, PageField, PageNode } from "@/lib/website/pages/blocks"
import { api, ApiError, inputCls, labelCls, textareaCls } from "./shared"

interface Media { id: string; url: string; alt: string | null }
interface Loaded { entry: { id: string; title: string; slug: string; status: string; collection: string }; layout: { version: 2; blocks: PageNode[] }; catalog: PageBlockDef[]; media: Media[] }
interface Version { id: string; createdAt: string; source: string; blocks: number }

const newId = () => `b${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-3)}`
const MAX_DEPTH = 3

/** Copy with fresh ids (a duplicated block, with everything nested in it). */
const cloneNode = (n: PageNode): PageNode => ({ ...n, id: newId(), props: JSON.parse(JSON.stringify(n.props)), ...(n.slots ? { slots: Object.fromEntries(Object.entries(n.slots).map(([k, v]) => [k, v.map(cloneNode)])) } : {}) })
const move = <T,>(a: T[], i: number, d: -1 | 1): T[] => { const j = i + d; if (j < 0 || j >= a.length) return a; const c = [...a]; [c[i], c[j]] = [c[j]!, c[i]!]; return c }
const summaryOf = (n: PageNode) => { const v = [n.props.title, n.props.text, n.props.body, n.props.headline].find((x) => typeof x === "string" && x) as string | undefined; return v ? v.slice(0, 60) : "" }

// ─── Field editors ─────────────────────────────────────────────────────────────

function MediaPick({ media, value, onChange, multi, max }: { media: Media[]; value: string | string[]; onChange: (v: any) => void; multi: boolean; max: number }) {
  if (media.length === 0) return <p className="text-xs text-muted-foreground">Nu există imagini. Încarcă imagini în galeria intrării (în formularul intrării, secțiunea Imagini), apoi revino.</p>
  const picked = Array.isArray(value) ? value : value ? [value] : []
  const toggle = (id: string) => {
    if (!multi) return onChange(picked[0] === id ? "" : id)
    onChange(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < max ? [...picked, id] : picked)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {media.map((m) => {
        const on = picked.includes(m.id), order = picked.indexOf(m.id) + 1
        return (
          <button key={m.id} type="button" onClick={() => toggle(m.id)} aria-pressed={on} title={m.alt ?? ""}
            className={`relative h-16 w-16 overflow-hidden rounded-md border-2 ${on ? "border-primary" : "border-border opacity-80 hover:opacity-100"}`}>
            <img src={m.url} alt={m.alt ?? ""} className="h-full w-full object-cover" />
            {on && multi && <span className="absolute right-0.5 top-0.5 rounded bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{order}</span>}
          </button>
        )
      })}
    </div>
  )
}

function FieldEditor({ f, value, onChange, media, id }: { f: PageField; value: any; onChange: (v: any) => void; media: Media[]; id: string }) {
  switch (f.kind) {
    case "text": return <input id={id} className={inputCls} maxLength={f.max} placeholder={f.placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    case "textarea": return <textarea id={id} className={textareaCls} maxLength={f.max} placeholder={f.placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    case "number": return <input id={id} type="number" className={inputCls} min={f.min} max={f.max} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
    case "bool": return <label className="flex items-center gap-2 text-sm"><input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.label}</label>
    case "select": return <select id={id} className={inputCls} value={value || f.options?.[0]?.value || ""} onChange={(e) => onChange(e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    case "list": return <textarea id={id} className={textareaCls} placeholder="Câte un element pe linie" value={Array.isArray(value) ? value.join("\n") : ""} onChange={(e) => onChange(e.target.value.split("\n"))} onBlur={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, f.maxItems ?? 20))} />
    case "pairs": {
      const p = f.pair!, rows: Record<string, string>[] = Array.isArray(value) ? value : []
      return (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <input className={inputCls} maxLength={p.aMax} placeholder={p.aLabel} value={r[p.a] ?? ""} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, [p.a]: e.target.value } : x)))} />
              <input className={inputCls} maxLength={p.bMax} placeholder={p.bLabel} value={r[p.b] ?? ""} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, [p.b]: e.target.value } : x)))} />
              <Button type="button" size="sm" variant="ghost" aria-label="Șterge rândul" onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {rows.length < (f.maxItems ?? 10) && <Button type="button" size="sm" variant="outline" onClick={() => onChange([...rows, { [p.a]: "", [p.b]: "" }])}><Plus className="h-4 w-4 mr-1" /> Adaugă</Button>}
        </div>
      )
    }
    case "media": return <MediaPick media={media} value={value ?? ""} onChange={onChange} multi={false} max={1} />
    case "medias": return <MediaPick media={media} value={Array.isArray(value) ? value : []} onChange={onChange} multi max={f.maxItems ?? 12} />
  }
}

// ─── Block list (recursive: containers hold lists in their slots) ──────────────

function BlockList({ nodes, onChange, catalog, media, depth, parentType }: { nodes: PageNode[]; onChange: (n: PageNode[]) => void; catalog: PageBlockDef[]; media: Media[]; depth: number; parentType: string | null }) {
  const [picking, setPicking] = useState(false)
  const allowed = catalog.filter((d) => !(d.type === "section" && parentType) && !(d.type === "columns" && (parentType === "columns" || depth >= MAX_DEPTH)))
  const add = (d: PageBlockDef) => {
    const node: PageNode = { id: newId(), type: d.type, props: {}, ...(d.slots?.length ? { slots: Object.fromEntries(d.slots.map((s) => [s.key, []])) } : {}) }
    onChange([...nodes, node]); setPicking(false)
  }
  return (
    <div className="space-y-3">
      {nodes.map((n, i) => (
        <BlockCard key={n.id} node={n} def={catalog.find((d) => d.type === n.type)} catalog={catalog} media={media} depth={depth}
          onChange={(x) => onChange(nodes.map((y, j) => (j === i ? x : y)))} onRemove={() => onChange(nodes.filter((_, j) => j !== i))}
          onUp={i > 0 ? () => onChange(move(nodes, i, -1)) : undefined} onDown={i < nodes.length - 1 ? () => onChange(move(nodes, i, 1)) : undefined}
          onDuplicate={() => onChange([...nodes.slice(0, i + 1), cloneNode(n), ...nodes.slice(i + 1)])} />
      ))}
      {picking ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold">Alege blocul</span><Button type="button" size="sm" variant="ghost" aria-label="Închide" onClick={() => setPicking(false)}><X className="h-4 w-4" /></Button></div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {allowed.map((d) => (
              <li key={d.type}><button type="button" onClick={() => add(d)} className="w-full rounded-md border border-border bg-background p-3 text-left hover:border-primary">
                <span className="block text-sm font-medium">{d.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{d.description}</span>
              </button></li>
            ))}
          </ul>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setPicking(true)}><Plus className="h-4 w-4 mr-1" /> Adaugă bloc</Button>
      )}
    </div>
  )
}

function BlockCard({ node, def, catalog, media, depth, onChange, onRemove, onUp, onDown, onDuplicate }: {
  node: PageNode; def?: PageBlockDef; catalog: PageBlockDef[]; media: Media[]; depth: number
  onChange: (n: PageNode) => void; onRemove: () => void; onUp?: () => void; onDown?: () => void; onDuplicate: () => void
}) {
  const [open, setOpen] = useState(!summaryOf(node) && Object.keys(node.props).length === 0)
  const set = (k: string, v: any) => onChange({ ...node, props: { ...node.props, [k]: v } })
  if (!def) return <div className="rounded-lg border border-destructive/40 p-3 text-sm">Bloc necunoscut „{node.type}”. <Button type="button" size="sm" variant="ghost" onClick={onRemove}>Șterge</Button></div>
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-1 px-3 py-2">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="text-sm font-semibold">{def.label}</span>
          {!open && summaryOf(node) && <span className="truncate text-xs text-muted-foreground">{summaryOf(node)}</span>}
        </button>
        <Button type="button" size="sm" variant="ghost" aria-label="Mută sus" disabled={!onUp} onClick={onUp}><ArrowUp className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Mută jos" disabled={!onDown} onClick={onDown}><ArrowDown className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Duplică" onClick={onDuplicate}><Copy className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Șterge blocul" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          {def.fields.length === 0 && !def.slots && <p className="text-xs text-muted-foreground">Acest bloc nu are câmpuri de completat.</p>}
          {def.fields.map((f) => (
            <div key={f.key}>
              {f.kind !== "bool" && <label className={labelCls} htmlFor={`${node.id}-${f.key}`}>{f.label}</label>}
              <FieldEditor f={f} id={`${node.id}-${f.key}`} value={node.props[f.key]} onChange={(v) => set(f.key, v)} media={media} />
            </div>
          ))}
          {def.slots?.map((s) => (
            <div key={s.key} className="rounded-md border border-dashed border-border p-3">
              <div className="mb-2 text-xs font-semibold">{s.label}</div>
              <BlockList nodes={node.slots?.[s.key] ?? []} catalog={catalog} media={media} depth={depth + 1} parentType={def.type}
                onChange={(list) => onChange({ ...node, slots: { ...(node.slots ?? {}), [s.key]: list } })} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Editor ───────────────────────────────────────────────────────────────────

/** Block editor for the page of a service or a price (Website → Intrări). Full-screen: the block list on a single column, history and preview in the header. */
export function ContentBuilder({ lineId, entryId, onClose }: { lineId: string; entryId: string; onClose: () => void }) {
  const q = `lineId=${encodeURIComponent(lineId)}`
  const base = `/api/website/entries/${entryId}/content`
  const [data, setData] = useState<Loaded | null>(null)
  const [blocks, setBlocks] = useState<PageNode[]>([])
  const [saved, setSaved] = useState("")
  const [saving, setSaving] = useState(false)
  const [issues, setIssues] = useState<string[]>([])
  const [versions, setVersions] = useState<Version[] | null>(null)
  const [preview, setPreview] = useState<{ kind: string; link: string; expiresAt: string | null } | null>(null)

  const load = useCallback(async () => {
    const d = await api<Loaded>(`${base}?${q}`)
    setData(d); setBlocks(d.layout.blocks); setSaved(JSON.stringify(d.layout.blocks))
  }, [base, q])
  useEffect(() => { load().catch((e) => { toast.error(e instanceof ApiError ? e.message : "Eroare"); onClose() }) }, [load, onClose])

  const dirty = JSON.stringify(blocks) !== saved
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h)
  }, [dirty])

  async function save() {
    setSaving(true); setIssues([])
    try {
      const r = await api<{ changed: boolean; layout: { blocks: PageNode[] } }>(`${base}?${q}`, "PUT", { layout: { version: 2, blocks } })
      setBlocks(r.layout.blocks); setSaved(JSON.stringify(r.layout.blocks)); setPreview(null)
      toast.success(r.changed ? (data?.entry.status === "published" ? "Salvat. Pagina publică se actualizează în maximum 5 minute" : "Aranjare salvată") : "Nicio modificare")
    } catch (e) { if (e instanceof ApiError) { setIssues([e.message, ...(e.details ?? [])]); toast.error(e.details?.[0] ?? e.message) } else toast.error("Eroare") }
    finally { setSaving(false) }
  }
  async function makePreview() {
    try { setPreview(await api(`${base}/preview?${q}`, "POST")); void load().catch(() => {}) } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") }
  }
  async function openHistory() {
    if (versions) return setVersions(null)
    try { setVersions(await api<Version[]>(`${base}/versions?${q}`)) } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") }
  }
  async function restore(id: string) {
    if (dirty && !confirm("Ai modificări nesalvate. Le pierzi dacă restaurezi o versiune. Continui?")) return
    try { await api(`${base}/versions?${q}`, "POST", { versionId: id }); await load(); setVersions(null); toast.success("Versiune restaurată") } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") }
  }
  function close() { if (dirty && !confirm("Ai modificări nesalvate. Le pierzi dacă închizi. Închizi?")) return; onClose() }

  // portal: the entry modal is animated (a transformed ancestor would break `fixed`)
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Aranjarea paginii">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">Aranjarea paginii{data ? `: ${data.entry.title}` : ""}</h2>
          <p className="text-xs text-muted-foreground">{data ? `/${({ preturi: "preturi", servicii: "lucrari", ghiduri: "ghiduri" } as Record<string, string>)[data.entry.collection] ?? "lucrari"}/${data.entry.slug}` : ""}{dirty && " · modificări nesalvate"}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={openHistory}><History className="h-4 w-4 mr-1" /> Istoric</Button>
        <Button type="button" size="sm" variant="outline" disabled={dirty} title={dirty ? "Salvează întâi" : undefined} onClick={makePreview}><ExternalLink className="h-4 w-4 mr-1" /> Previzualizare</Button>
        <Button type="button" size="sm" disabled={saving || !dirty} onClick={save}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvează</Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Închide" onClick={close}><X className="h-4 w-4" /></Button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {preview && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              {preview.kind === "public" ? "Pagina este publicată:" : `Link privat de previzualizare (valabil până la ${preview.expiresAt ? new Date(preview.expiresAt).toLocaleDateString("ro-RO") : "—"}; un link nou îl invalidează pe cel vechi):`}{" "}
              <a href={preview.link} target="_blank" rel="noreferrer" className="break-all font-medium text-primary underline">{preview.link}</a>
            </div>
          )}
          {versions && (
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 text-xs font-semibold">Ultimele versiuni salvate</div>
              {versions.length === 0 ? <p className="text-xs text-muted-foreground">Nu există încă.</p> : (
                <ul className="divide-y divide-border">{versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-1.5 text-sm"><span>{new Date(v.createdAt).toLocaleString("ro-RO")} · {v.blocks} blocuri{v.source === "restore" ? " · restaurare" : ""}</span><Button type="button" size="sm" variant="outline" onClick={() => restore(v.id)}>Restaurează</Button></li>
                ))}</ul>
              )}
            </div>
          )}
          {issues.length > 0 && <ul role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive list-disc pl-6">{issues.map((m, i) => <li key={i}>{m}</li>)}</ul>}
          {!data ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <>
              <p className="text-xs text-muted-foreground">
                Blocurile „Tabel de prețuri” și „Întrebări frecvente” afișează listele din câmpurile intrării (prețurile rămân date). Fără niciun bloc, site-ul afișează aranjarea implicită.
                {data.entry.status === "published" && " Pagina este publicată: salvarea o actualizează pe site (cache de 5 minute); versiunile din Istoric se pot restaura."}
              </p>
              <BlockList nodes={blocks} onChange={setBlocks} catalog={data.catalog} media={data.media} depth={1} parentType={null} />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
