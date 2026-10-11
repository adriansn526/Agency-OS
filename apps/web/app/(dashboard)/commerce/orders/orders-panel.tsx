"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ORDER_STATUSES } from "@/lib/commerce/orders/constants"

/* eslint-disable @typescript-eslint/no-explicit-any */
const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const label = (k: string) => ORDER_STATUSES.find((s) => s.key === k)?.label ?? k
const ron = (n: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(n)

export function OrdersPanel({ initial }: { initial: { counts: Record<string, number>; orders: any[] } }) {
  const [data, setData] = useState(initial)
  const [status, setStatus] = useState("")
  const [q, setQ] = useState("")
  const [service, setService] = useState(false)
  const [loading, setLoading] = useState(false)

  async function load(next: { status?: string; q?: string; service?: boolean }) {
    const st = next.status ?? status, qq = next.q ?? q, sv = next.service ?? service
    setLoading(true)
    try {
      const p = new URLSearchParams(); if (st) p.set("status", st); if (qq) p.set("q", qq); if (sv) p.set("service", "1")
      const r = await fetch(`/api/commerce/orders?${p}`).then((x) => x.json())
      if (r.orders) setData(r)
    } finally { setLoading(false) }
  }
  const total = Object.values(data.counts).reduce((a, b) => a + b, 0)

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        <div className="flex flex-wrap gap-2 items-center">
          {[["", "toate"], ...ORDER_STATUSES.map((s) => [s.key, s.label])].map(([k, l]) => (
            <button key={k} onClick={() => { setStatus(k!); void load({ status: k }) }} className={`text-xs rounded-full border px-3 py-1 ${status === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}{k ? ` (${data.counts[k!] ?? 0})` : ` (${total})`}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input className={`${input} max-w-xs`} placeholder="Caută număr, nume, telefon, e-mail" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load({ q }) }} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={service} onChange={(e) => { setService(e.target.checked); void load({ service: e.target.checked }) }} />doar cu serviciu</label>
          {loading && <span className="text-xs text-muted-foreground">se încarcă…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Comandă</th><th className="pr-3">Data</th><th className="pr-3">Client</th><th className="pr-3">Total</th><th className="pr-3">Stare</th><th className="pr-3">Serviciu</th></tr></thead>
            <tbody>
              {data.orders.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Nicio comandă.</td></tr>}
              {data.orders.map((o) => (
                <tr key={o.id} className="border-t hover:bg-muted/40">
                  <td className="py-2 pr-3 font-medium"><Link className="text-primary hover:underline" href={`/commerce/orders/${o.id}`}>{o.number}</Link></td>
                  <td className="pr-3 whitespace-nowrap">{new Date(o.createdAt).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="pr-3">{o.customerName}<div className="text-xs text-muted-foreground">{o.customerPhone}</div></td>
                  <td className="pr-3 whitespace-nowrap">{ron(o.total)}</td>
                  <td className="pr-3"><Badge variant={o.status === "cancelled" || o.status === "returned" ? "destructive" : o.status === "delivered" ? "default" : "secondary"}>{label(o.status)}</Badge></td>
                  <td className="pr-3">{o.hasService ? <span>{o.partnerName ?? "—"}<div className="text-xs text-muted-foreground">{o.jobStatuses.join(", ")}</div></span> : "—"}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
