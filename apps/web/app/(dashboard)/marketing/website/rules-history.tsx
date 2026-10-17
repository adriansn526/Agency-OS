"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { diffSummary, KIND_LABEL } from "@/lib/website/rules/describe"
import { api, fmtDate } from "./shared"

const ACTION_RO: Record<string, string> = { create: "Creată", update: "Modificată", delete: "Ștearsă", reorder: "Reordonată" }

export function RulesHistory({ lineId, reloadKey }: { lineId: string; reloadKey: number }) {
  const [items, setItems] = useState<any[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const load = useCallback(async (p: number, append: boolean) => {
    const r = await api(`/api/website/rules/audit?lineId=${encodeURIComponent(lineId)}&page=${p}`)
    setTotal(r.total); setItems((cur) => (append && cur ? [...cur, ...r.items] : r.items)); setPage(p)
  }, [lineId])
  useEffect(() => { load(1, false).catch(() => setItems([])) }, [load, reloadKey])

  if (!items) return <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</div>
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nicio modificare înregistrată încă.</p>
  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y rounded-lg border">
        {items.map((i) => {
          const name = (i.afterData ?? i.beforeData)?.name
          const lines = i.action === "reorder" ? ["ordine schimbată"] : i.action === "update" ? diffSummary(i.beforeData, i.afterData) : []
          return (
            <li key={i.id} className="px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-2">
                <b>{ACTION_RO[i.action] ?? i.action}</b><span>{KIND_LABEL[i.kind as keyof typeof KIND_LABEL] ?? i.kind}{name ? ` · ${name}` : ""}</span>
                <span className="ml-auto text-xs text-muted-foreground">{i.userName ?? "—"} · {fmtDate(i.createdAt)} {new Date(i.createdAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {lines.length > 0 && <ul className="mt-1 text-xs text-muted-foreground list-disc pl-5">{lines.slice(0, 6).map((l, k) => <li key={k} className="break-all">{l}</li>)}{lines.length > 6 && <li>… încă {lines.length - 6}</li>}</ul>}
            </li>
          )
        })}
      </ul>
      {items.length < total && <Button size="sm" variant="outline" className="self-center" onClick={() => load(page + 1, true)}>Mai multe</Button>}
    </div>
  )
}
