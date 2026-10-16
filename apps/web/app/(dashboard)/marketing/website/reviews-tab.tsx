"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Loader2, Star, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { api, ApiError, fmtDate, selectCls, STATUS_RO } from "./shared"

export function ReviewsTab({ lineId, onChanged }: { lineId: string; onChanged: () => Promise<void> }) {
  const [status, setStatus] = useState("pending")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ total: number; pageSize: number; items: any[] } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const q = `lineId=${encodeURIComponent(lineId)}`

  const load = useCallback(async () => {
    try { setData(await api(`/api/website/reviews?${q}&status=${status}&page=${page}`)) } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") }
  }, [q, status, page])
  useEffect(() => { load() }, [load])

  async function act(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id)
    try { await fn(); toast.success(ok); await load(); await onChanged() } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setBusy(null) }
  }
  const moderate = (id: string, s: string, ok: string) => act(id, () => api(`/api/website/reviews/${id}?${q}`, "PATCH", { status: s }), ok)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <select aria-label="Stare" className={selectCls + " w-48"} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          {["pending", "approved", "rejected"].map((s) => <option key={s} value={s}>{STATUS_RO[s]}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{data ? `${data.total} recenzii` : ""}</span>
      </div>
      {!data ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</div>
        : data.items.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Nicio recenzie {(STATUS_RO[status] ?? status).toLowerCase()}.</CardContent></Card>
        : <div className="flex flex-col gap-3">
          {data.items.map((r) => (
            <Card key={r.id}><CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex" aria-label={`${r.rating} din 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />)}</span>
                  <span className="font-medium">{r.authorName}</span>
                  <span className="text-xs text-muted-foreground">despre <b>{r.entry?.title}</b> · {fmtDate(r.createdAt)}</span>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{STATUS_RO[r.status]}</Badge>
                </div>
                {r.title && <div className="font-medium mt-1">{r.title}</div>}
                {r.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{r.body}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                {r.status !== "approved" && <Button size="sm" disabled={busy === r.id} onClick={() => moderate(r.id, "approved", "Recenzie aprobată")}><Check className="h-4 w-4 mr-1" /> Aprobă</Button>}
                {r.status !== "rejected" && <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => moderate(r.id, "rejected", "Recenzie respinsă")}><X className="h-4 w-4 mr-1" /> Respinge</Button>}
                <Button size="icon" variant="ghost" aria-label="Șterge recenzia" disabled={busy === r.id} onClick={() => { if (confirm("Ștergi definitiv recenzia?")) act(r.id, () => api(`/api/website/reviews/${r.id}?${q}`, "DELETE"), "Recenzie ștearsă") }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent></Card>
          ))}
          {data.total > data.pageSize && (
            <div className="flex items-center justify-center gap-3">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Înapoi</Button>
              <span className="text-sm text-muted-foreground">Pagina {page} din {Math.ceil(data.total / data.pageSize)}</span>
              <Button size="sm" variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Înainte</Button>
            </div>
          )}
        </div>}
    </div>
  )
}
