"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api, ApiError, fmtDate } from "./shared"

/** Services firms asked for. The team answers by creating the service in Colecții → Servicii, then marks the suggestion done. */
export function SuggestionsCard({ lineId }: { lineId: string }) {
  const q = `lineId=${encodeURIComponent(lineId)}`
  const [items, setItems] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const load = useCallback(async () => setItems((await api<{ items: any[] }>(`/api/website/service-suggestions?${q}`)).items), [q])
  useEffect(() => { load().catch(() => setItems([])) }, [load])
  if (!items || items.length === 0) return null
  return (
    <Card className="lg:col-span-3">
      <CardHeader><CardTitle>Servicii sugerate de firme ({items.length})</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Adaugă serviciul în Colecții → Servicii (tip „categorie", cu un grup), apoi marchează sugestia ca rezolvată. Apare imediat în „Profilul meu" al tuturor firmelor.</p>
        <ul className="divide-y divide-border rounded-md border border-border">
          {items.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 p-3 text-sm">
              <div><div className="font-medium">{s.title}</div><div className="text-xs text-muted-foreground">{s.firm} · {fmtDate(s.at)}{s.note ? ` · ${s.note}` : ""}</div></div>
              <Button size="sm" variant="outline" disabled={busy === s.id} onClick={async () => { setBusy(s.id); try { await api(`/api/website/service-suggestions/${s.id}/done?${q}`, "POST"); await load(); toast.success("Marcat rezolvat") } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setBusy(null) } }}>Rezolvat</Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
