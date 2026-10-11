"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Copy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { JOB_LABEL, ORDER_STATUSES, SERVICE_LABEL_RO } from "@/lib/commerce/orders/constants"

/* eslint-disable @typescript-eslint/no-explicit-any */
const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const ron = (n: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(n)
const when = (d: string) => new Date(d).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || "Eroare")
  return j
}

export function OrderDetail({ initial }: { initial: any }) {
  const [d, setD] = useState(initial)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [when2, setWhen] = useState("")
  const o = d.order

  async function reload() { setD(await api(`/api/commerce/orders/${o.id}`, "GET")) }
  const run = async (key: string, f: () => Promise<unknown>, ok?: string) => { setBusy(key); setMsg(null); try { await f(); await reload(); if (ok) setMsg({ ok: true, text: ok }) } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" }) } finally { setBusy(null) } }
  const ship = o.shippingAddress as any, bill = o.billingAddress as any

  return (
    <div className="grid gap-6">
      {msg && <Alert variant={msg.ok ? "default" : "destructive"}>{msg.text}</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stare</CardTitle></CardHeader><CardContent className="grid gap-2">
          <select className={input} value={o.status} disabled={!!busy} onChange={(e) => run("status", () => api(`/api/commerce/orders/${o.id}`, "PATCH", { status: e.target.value }), "Stare actualizată.")}>
            {ORDER_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <div className="text-xs text-muted-foreground">Plată: {o.paymentMethod === "cod" ? "ramburs" : o.paymentMethod} · {o.paymentStatus}</div>
          {o.leadId && <Link className="text-xs text-primary hover:underline" href={`/crm/lead-uri/${o.leadId}`}>Lead în CRM →</Link>}
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Client</CardTitle></CardHeader><CardContent className="text-sm">
          <div className="font-medium">{o.customer.name}</div><div>{o.customer.phone}</div><div className="text-muted-foreground">{o.customer.email}</div>
          {bill && <div className="text-xs text-muted-foreground mt-1">Adresă client: {bill.address}, {bill.city}, {bill.county}</div>}
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{ship?.deliverTo === "partner" ? "Livrare la service" : "Livrare"}</CardTitle></CardHeader><CardContent className="text-sm">
          {ship?.deliverTo === "partner" && <div className="font-medium">{ship.partnerName}</div>}
          <div>{ship?.address}</div><div>{ship?.city}{ship?.county ? `, ${ship.county}` : ""}{ship?.postalCode ? `, ${ship.postalCode}` : ""}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Produse și servicii</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>{d.items.map((i: any) => (
              <tr key={i.id} className="border-t first:border-t-0"><td className="py-2 pr-3">{i.kind === "service" && <Badge variant="secondary" className="mr-2">serviciu</Badge>}{i.name}<div className="text-xs text-muted-foreground">{i.kind === "service" ? "" : `Cod ${i.supplierCode}`}</div></td>
                <td className="pr-3 text-center">{i.qty}</td><td className="text-right whitespace-nowrap">{ron(i.totalRon)}</td></tr>))}
              <tr className="border-t"><td className="py-2 text-right font-medium" colSpan={2}>Total (TVA inclus {ron(o.vatTotal)})</td><td className="text-right font-bold">{ron(o.total)}</td></tr>
            </tbody>
          </table>
          {o.notes && <p className="text-sm mt-3"><span className="font-medium">Observații client:</span> {o.notes}</p>}
        </CardContent>
      </Card>

      {d.jobs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Lucrare la service — {d.partner?.name}</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            {d.partner && <div className="text-sm text-muted-foreground">{d.partner.address}, {d.partner.city}{d.partner.phone ? ` · ${d.partner.phone}` : ""}{d.partner.contactPerson ? ` · ${d.partner.contactPerson}` : ""}{d.partner.email ? ` · ${d.partner.email}` : ""}</div>}
            {d.jobs.map((j: any) => (
              <div key={j.id} className="rounded-md border p-3 grid gap-2">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium">{SERVICE_LABEL_RO[j.service]}</span><span className="text-muted-foreground">{j.forProductName}</span>
                  <Badge variant={j.status === "cancelled" ? "destructive" : j.status === "settled" || j.status === "done" ? "default" : "secondary"}>{JOB_LABEL[j.status]}</Badge>
                  <span className="ml-auto">client {ron(j.saleRon)} · de plătit service {ron(j.settlementRon)}</span>
                </div>
                {(j.paintCode || j.vin) && <div className="text-xs text-muted-foreground">{j.paintCode && `Cod vopsea: ${j.paintCode}`}{j.paintCode && j.vin ? " · " : ""}{j.vin && `VIN: ${j.vin}`}</div>}
                {j.scheduledAt && <div className="text-xs text-muted-foreground">Programată: {when(j.scheduledAt)}</div>}
                {j.settledAt && <div className="text-xs text-muted-foreground">Decontată {when(j.settledAt)} · {j.settlementRef}</div>}
                <div className="flex flex-wrap gap-2 items-center">
                  {["pending", "scheduled"].includes(j.status) && (<>
                    <input type="datetime-local" className={`${input} max-w-52`} value={when2} onChange={(e) => setWhen(e.target.value)} />
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(j.id, () => api(`/api/commerce/orders/${o.id}/jobs/${j.id}`, "PATCH", { action: "schedule", ...(when2 ? { scheduledAt: new Date(when2).toISOString() } : {}) }), "Lucrare programată.")}>Programează</Button>
                    <Button size="sm" disabled={!!busy} onClick={() => run(j.id, () => api(`/api/commerce/orders/${o.id}/jobs/${j.id}`, "PATCH", { action: "done" }), "Lucrare marcată finalizată: apare la decontări.")}>Finalizată</Button>
                  </>)}
                  {["pending", "scheduled", "done"].includes(j.status) && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => { if (confirm("Anulezi lucrarea?")) void run(j.id, () => api(`/api/commerce/orders/${o.id}/jobs/${j.id}`, "PATCH", { action: "cancel" }), "Lucrare anulată.") }}>Anulează</Button>}
                  {["done", "cancelled"].includes(j.status) && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(j.id, () => api(`/api/commerce/orders/${o.id}/jobs/${j.id}`, "PATCH", { action: "reopen" }), "Lucrare redeschisă.")}>Redeschide</Button>}
                  {j.status === "done" && <Link href="/commerce/settlements" className="text-xs text-primary hover:underline">Se decontează din pagina Decontări →</Link>}
                </div>
              </div>))}
            {d.partnerMessage && (
              <div className="grid gap-2">
                <div className="text-sm font-medium">Mesaj pentru service (copiază și trimite)</div>
                <pre className="whitespace-pre-wrap text-xs bg-muted/40 rounded border p-3">{d.partnerMessage}</pre>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(d.partnerMessage); setMsg({ ok: true, text: "Mesaj copiat." }) }}><Copy className="h-4 w-4 mr-1" />Copiază</Button>
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("pn", () => api(`/api/commerce/orders/${o.id}`, "PATCH", { partnerNotified: true }), "Notificare înregistrată.")}>Marchează service-ul notificat</Button>
                </div>
              </div>)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Istoric</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex gap-2"><input className={input} placeholder="Adaugă o notă internă" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" disabled={!note.trim() || !!busy} onClick={() => run("note", async () => { await api(`/api/commerce/orders/${o.id}`, "PATCH", { note }); setNote("") }, "Notă adăugată.")}>{busy === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adaugă"}</Button></div>
          <ul className="text-sm grid gap-1">{d.events.map((e: any) => <li key={e.id} className="flex gap-3"><span className="text-xs text-muted-foreground whitespace-nowrap w-32">{when(e.createdAt)}</span><span>{e.message ?? e.type}</span></li>)}</ul>
        </CardContent>
      </Card>
    </div>
  )
}
