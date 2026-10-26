"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { api, ApiError, fmtDate, inputCls } from "./shared"

const STATUS: Record<string, string> = { sent: "Trimisă", accepted: "Acceptată", declined: "Refuzată", expired: "Expirată", full: "Ocupată" }
const REASON: Record<string, string> = { abonament: "abonament", gratuit: "gratuit", tarif: "tarif", livrare: "la livrare" }
const ron = (n: number) => `${n.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} lei`

export function RequestsTab({ lineId }: { lineId: string }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [data, setData] = useState<any>(null)
  const load = useCallback(async () => {
    try { setData(await api(`/api/website/requests?lineId=${encodeURIComponent(lineId)}&month=${month}`)) } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") }
  }, [lineId, month])
  useEffect(() => { load() }, [load])

  if (!data) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</div>
  const total = data.owed.reduce((s: number, o: any) => s + o.totalRon, 0)
  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-sm font-semibold">De facturat pe</h2>
          <input aria-label="Luna" type="month" className={inputCls + " w-44"} value={month} onChange={(e) => setMonth(e.target.value)} />
          <span className="text-sm text-muted-foreground">Total: <b className="text-foreground">{ron(total)}</b></span>
        </div>
        {data.owed.length === 0 ? <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nicio cerere taxată în această lună.</CardContent></Card> : (
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-3">Firmă</th><th className="p-3">Cereri acceptate</th><th className="p-3 text-right">Sumă</th></tr></thead>
            <tbody>{data.owed.map((o: any) => <tr key={o.entryId} className="border-b last:border-0"><td className="p-3">{o.title}</td><td className="p-3">{o.accepted}</td><td className="p-3 text-right font-medium">{ron(o.totalRon)}</td></tr>)}</tbody>
          </table></CardContent></Card>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Sumele se facturează manual din ERP. Cererile gratuite, din abonament și neacceptate nu apar aici.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Cereri recente</h2>
        {data.items.length === 0 ? <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nicio cerere încă.</CardContent></Card> : (
          <div className="flex flex-col gap-2">
            {data.items.map((r: any) => (
              <Card key={r.id}><CardContent className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{r.type === "direct" ? "Directă" : "Generală"}</Badge>
                  <b>{r.category}</b><span className="text-muted-foreground">{[r.city, r.county].filter(Boolean).join(", ")}</span>
                  <span className="text-muted-foreground">· {r.customerName} · {fmtDate(r.createdAt)}</span>
                  {r.status === "unrouted" && <Badge variant="destructive">Nicio firmă potrivită</Badge>}
                </div>
                {r.deliveries.length > 0 && <div className="flex flex-wrap gap-2 text-xs">
                  {r.deliveries.map((d: any) => <span key={d.entryId} className="rounded-md border px-2 py-1">{d.title} · {STATUS[d.status] ?? d.status}{d.chargedRon != null && d.status === "accepted" ? ` · ${ron(d.chargedRon)}${d.chargeReason ? ` (${REASON[d.chargeReason] ?? d.chargeReason})` : ""}` : ""}</span>)}
                </div>}
                <p className="text-xs text-muted-foreground" title={r.sourcePage ?? undefined}>
                  Sursă: <b className="text-foreground">{r.source?.label ?? "direct sau necunoscută"}</b>
                  {[r.source?.medium, r.source?.campaign, r.source?.content].filter(Boolean).length > 0 && <> ({[r.source?.medium, r.source?.campaign, r.source?.content].filter(Boolean).join(" · ")})</>}
                  {r.source?.page && <> · pagina {r.source.page}</>}
                </p>
                {r.routing?.mode === "general" && <p className="text-xs text-muted-foreground">Regulă: {r.routing.rule?.name ?? "implicită"} · {r.routing.candidates} firme potrivite, {r.routing.selected} alese</p>}
              </CardContent></Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
