"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { JOB_LABEL, SERVICE_LABEL_RO } from "@/lib/commerce/orders/constants"

/* eslint-disable @typescript-eslint/no-explicit-any */
const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const ron = (n: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(n)
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString("ro-RO") : "—")

export function SettlementsPanel({ initial }: { initial: any }) {
  const [data, setData] = useState(initial)
  const [sel, setSel] = useState<Record<string, Set<string>>>({})
  const [ref, setRef] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function reload() { setData(await fetch("/api/commerce/settlements").then((r) => r.json())) }
  const toggle = (pid: string, id: string) => { const n = new Set(sel[pid] ?? []); if (n.has(id)) n.delete(id); else n.add(id); setSel({ ...sel, [pid]: n }) }
  async function settle(pid: string, doneJobs: any[]) {
    const ids = [...(sel[pid] ?? [])]; const total = doneJobs.filter((j) => ids.includes(j.id)).reduce((a, j) => a + j.settlementRon, 0)
    if (!confirm(`Marchezi ${ids.length} lucrări (${ron(total)}) ca decontate cu referința „${ref[pid]}”?`)) return
    setBusy(pid); setMsg(null)
    try {
      const res = await fetch("/api/commerce/settlements/settle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerId: pid, jobIds: ids, ref: ref[pid] }) })
      const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || "Eroare")
      setMsg({ ok: true, text: `${j.settled} lucrări decontate (${ron(j.totalRon)}).` }); setSel({ ...sel, [pid]: new Set() }); await reload()
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" }) } finally { setBusy(null) }
  }

  if (!data.partners?.length) return <p className="text-muted-foreground">Nicio lucrare la service încă.</p>
  return (
    <div className="grid gap-6">
      {msg && <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">De plătit service-urilor (lucrări finalizate)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{ron(data.totals.owedRon)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Plătit deja</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{ron(data.totals.settledRon)}</CardContent></Card>
      </div>
      {data.partners.map((p: any) => {
        const done = p.jobs.filter((j: any) => j.status === "done")
        const chosen = sel[p.partner.id] ?? new Set<string>()
        return (
          <Card key={p.partner.id}>
            <CardHeader><CardTitle className="text-lg">{p.partner.name}{p.partner.city ? ` · ${p.partner.city}` : ""}</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <span>De plătit: <b>{ron(p.owedRon)}</b></span><span>Plătit: {ron(p.settledRon)}</span><span>În lucru: {ron(p.inProgressRon)}</span><span>Marjă (finalizate + decontate): {ron(p.marginRon)}</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-2"></th><th className="pr-3">Comandă</th><th className="pr-3">Serviciu</th><th className="pr-3">Piesă</th><th className="pr-3">Client plătește</th><th className="pr-3">Datorat service</th><th className="pr-3">Stare</th><th className="pr-3">Finalizată</th></tr></thead>
                <tbody>{p.jobs.map((j: any) => (
                  <tr key={j.id} className="border-t">
                    <td className="py-2 pr-2">{j.status === "done" && <input type="checkbox" checked={chosen.has(j.id)} onChange={() => toggle(p.partner.id, j.id)} />}</td>
                    <td className="pr-3"><Link className="text-primary hover:underline" href={`/commerce/orders/${j.orderId}`}>{j.orderNumber}</Link></td>
                    <td className="pr-3">{SERVICE_LABEL_RO[j.service]}</td><td className="pr-3 max-w-xs truncate">{j.forProductName}</td>
                    <td className="pr-3">{ron(j.saleRon)}</td><td className="pr-3">{ron(j.settlementRon)}</td>
                    <td className="pr-3"><Badge variant={j.status === "cancelled" ? "destructive" : j.status === "settled" ? "default" : "secondary"}>{JOB_LABEL[j.status]}</Badge>{j.settlementRef && <div className="text-xs text-muted-foreground">{j.settlementRef} · {day(j.settledAt)}</div>}</td>
                    <td className="pr-3">{day(j.doneAt)}</td>
                  </tr>))}</tbody>
              </table>
              {done.length > 0 && (
                <div className="flex flex-wrap gap-3 items-center">
                  <Button size="sm" variant="outline" onClick={() => setSel({ ...sel, [p.partner.id]: new Set(done.map((j: any) => j.id)) })}>Selectează toate finalizate</Button>
                  <input className={`${input} max-w-60`} placeholder="Referință plată (OP, factură)" value={ref[p.partner.id] ?? ""} onChange={(e) => setRef({ ...ref, [p.partner.id]: e.target.value })} />
                  <Button size="sm" disabled={busy === p.partner.id || chosen.size === 0 || (ref[p.partner.id] ?? "").trim().length < 2} onClick={() => settle(p.partner.id, done)}>Marchează {chosen.size} ca decontate</Button>
                </div>)}
            </CardContent>
          </Card>)
      })}
    </div>
  )
}
