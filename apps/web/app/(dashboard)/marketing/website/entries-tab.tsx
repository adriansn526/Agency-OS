"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { BadgeCheck, Loader2, Plus, Search, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { api, ApiError, Collection, fmtDate, inputCls, selectCls, STATUS_RO } from "./shared"
import { EntryEditor } from "./entry-editor"

export function EntriesTab({ lineId, onChanged, initialEntryId = null }: { lineId: string; onChanged: () => Promise<void>; initialEntryId?: string | null }) {
  const q = `lineId=${encodeURIComponent(lineId)}`
  const [collections, setCollections] = useState<Collection[] | null>(null)
  const [collectionId, setCollectionId] = useState("")
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ total: number; pageSize: number; items: any[] } | null>(null)
  const [editing, setEditing] = useState<string | "new" | null>(initialEntryId)

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { api<Collection[]>(`/api/website/collections?${q}`).then(setCollections).catch((e) => toast.error(e instanceof ApiError ? e.message : "Eroare")) }, [q])

  const load = useCallback(async () => {
    const p = new URLSearchParams({ lineId, page: String(page) })
    if (collectionId) p.set("collectionId", collectionId); if (status) p.set("status", status); if (debounced) p.set("q", debounced)
    try { setData(await api(`/api/website/entries?${p}`)) } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") }
  }, [lineId, page, collectionId, status, debounced])
  useEffect(() => { load() }, [load])

  if (!collections) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</div>
  if (collections.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">Creează întâi o colecție (fila „Colecții”) ca să poți adăuga intrări.</CardContent></Card>

  const colName = (id: string) => collections.find((c) => c.id === id)?.name ?? "—"

  async function remove(e: any) {
    if (!confirm(`Ștergi definitiv „${e.title}”? Recenziile și imaginile ei se șterg odată cu ea.`)) return
    try { await api(`/api/website/entries/${e.id}?${q}`, "DELETE"); toast.success("Intrare ștearsă"); await load(); await onChanged() } catch (err) { toast.error(err instanceof ApiError ? err.message : "Eroare") }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <input aria-label="Caută" className={inputCls + " pl-9"} placeholder="Caută după titlu, oraș sau slug" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select aria-label="Colecție" className={selectCls + " w-48"} value={collectionId} onChange={(e) => { setCollectionId(e.target.value); setPage(1) }}>
          <option value="">Toate colecțiile</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.namePlural}</option>)}
        </select>
        <select aria-label="Stare" className={selectCls + " w-44"} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Toate stările</option>{["draft", "preview", "published", "suspended"].map((s) => <option key={s} value={s}>{STATUS_RO[s]}</option>)}
        </select>
        <Button className="ml-auto" onClick={() => setEditing("new")}><Plus className="h-4 w-4 mr-1" /> Intrare nouă</Button>
      </div>

      {!data ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</div>
        : data.items.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Nicio intrare{debounced || status || collectionId ? " pentru filtrele alese" : " încă"}.</CardContent></Card>
        : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>
                <th className="px-4 py-2 font-medium">Titlu</th><th className="px-4 py-2 font-medium hidden md:table-cell">Colecție</th><th className="px-4 py-2 font-medium hidden md:table-cell">Locație</th>
                <th className="px-4 py-2 font-medium">Stare</th><th className="px-4 py-2 font-medium hidden lg:table-cell">Actualizat</th><th className="px-4 py-2" />
              </tr></thead>
              <tbody className="divide-y">
                {data.items.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setEditing(e.id)}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium flex items-center gap-1.5">{e.title}{e.verified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="verificat" />}{e.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="recomandat" />}</div>
                      <div className="text-xs text-muted-foreground">/{e.slug}{e.ratingCount > 0 && ` · ★ ${Number(e.ratingAvg).toFixed(1)} (${e.ratingCount})`}</div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">{colName(e.collectionId)}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{[e.city, e.county].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-2.5"><Badge variant={e.status === "published" ? "default" : e.status === "suspended" ? "destructive" : "secondary"}>{STATUS_RO[e.status]}</Badge>{e.data?.in_constructie === "da" && <Badge variant="outline" className="ml-1.5">În construcție</Badge>}</td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">{fmtDate(e.updatedAt)}</td>
                    <td className="px-2 py-2.5 text-right"><Button size="icon" variant="ghost" aria-label={`Șterge ${e.title}`} onClick={(ev) => { ev.stopPropagation(); remove(e) }}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Înapoi</Button>
          <span className="text-sm text-muted-foreground">Pagina {page} din {Math.ceil(data.total / data.pageSize)} · {data.total} intrări</span>
          <Button size="sm" variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Înainte</Button>
        </div>
      )}

      {editing && (
        <EntryEditor lineId={lineId} entryId={editing === "new" ? null : editing} collections={collections}
          defaultCollectionId={collectionId || collections.find((c) => c.isActive)?.id || collections[0]!.id}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); await onChanged() }} />
      )}
    </div>
  )
}
