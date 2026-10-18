"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react"
import { Phone } from "lucide-react"
import { useBusinessLine } from "@/components/business-line-context"
import { CallModal } from "@/components/crm/call-modal"
import { dayKey, monthGrid, telHref } from "@/components/crm/call-utils"
import { cn } from "@/lib/utils"

interface Item { id: string; companyName: string; contactPerson: string | null; phone: string | null; county: string | null; city: string | null; status: string; nextAction: string | null; nextActionDate: string | null; acordSms: string | null; rezultatApel: string | null }

const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"]
const WEEKDAYS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"]
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })

function Row({ it, onOpen, when }: { it: Item; onOpen: () => void; when?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-muted/50">
        {when && it.nextActionDate && <span className="w-14 shrink-0 text-xs font-semibold text-amber-600">{new Date(it.nextActionDate) < new Date() ? "întârziat" : hhmm(it.nextActionDate)}</span>}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{it.companyName}</span><span className="block truncate text-xs text-muted-foreground">{[it.city, it.county].filter(Boolean).join(", ")}{it.contactPerson ? ` · ${it.contactPerson}` : ""}{it.rezultatApel ? ` · ${it.rezultatApel}` : ""}</span></span>
        {it.acordSms === "da" && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">SMS ok</span>}
        <span className="hidden text-xs text-muted-foreground sm:inline">{it.phone}</span>
        <Phone size={14} className={cn("shrink-0", telHref(it.phone) ? "text-primary" : "text-muted-foreground/40")} />
      </button>
    </li>
  )
}

export default function ApeluriPage() {
  const { activeLine, activeLineId } = useBusinessLine()
  const slug = activeLine?.slug ?? ""
  const [tab, setTab] = useState<"coada" | "calendar">("coada")
  const [data, setData] = useState<any>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [ym, setYm] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() } })
  const [cal, setCal] = useState<Item[]>([])
  const [selected, setSelected] = useState<string>(dayKey(new Date()))

  const loadQueue = useCallback(async () => { if (!slug) return; const r = await fetch(`/api/crm/calls/queue?line=${encodeURIComponent(slug)}&limit=100`); if (r.ok) setData((await r.json()).data) }, [slug])
  const loadCal = useCallback(async () => {
    if (!slug) return
    const from = new Date(ym.y, ym.m - 0, 1 - 7), to = new Date(ym.y, ym.m + 1, 8)
    const r = await fetch(`/api/crm/calls/calendar?line=${encodeURIComponent(slug)}&from=${from.toISOString()}&to=${to.toISOString()}`)
    if (r.ok) setCal((await r.json()).data.items)
  }, [slug, ym])
  useEffect(() => { void loadQueue() }, [loadQueue])
  useEffect(() => { if (tab === "calendar") void loadCal() }, [tab, loadCal])

  const queue: Item[] = useMemo(() => (data ? [...data.due, ...data.uncalled.items] : []), [data])
  const byDay = useMemo(() => { const m = new Map<string, Item[]>(); for (const it of cal) { const k = dayKey(new Date(it.nextActionDate!)); m.set(k, [...(m.get(k) ?? []), it]) } return m }, [cal])
  const next = () => { const i = queue.findIndex((q) => q.id === openId); const n = queue[i + 1] ?? null; setOpenId(n?.id ?? null) }
  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym])
  const today = dayKey(new Date())

  if (activeLineId === "all" || !slug) return <div className="p-6 text-sm text-muted-foreground">Alege o linie de business din selectorul de sus ca să vezi apelurile.</div>

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-bold">Apeluri</h1><p className="text-sm text-muted-foreground">Coada de sunat, reapelurile programate și calendarul lor.</p></div>
        <div className="flex gap-1 rounded-lg border border-border p-1" role="tablist">
          {(["coada", "calendar"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1.5 text-sm", tab === t ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{t === "coada" ? "Coadă" : "Calendar"}</button>)}
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[["De sunat acum", data.counts.due, "reapeluri scadente"], ["Programate", data.counts.upcoming, "reapeluri viitoare"], ["Nesunate", data.counts.uncalled, "din pilot"]].map(([l, n, s]) => (
            <div key={String(l)} className="rounded-xl border border-border p-4"><div className="text-2xl font-bold">{n as number}</div><div className="text-sm font-medium">{l}</div><div className="text-xs text-muted-foreground">{s}</div></div>
          ))}
        </div>
      )}

      {tab === "coada" ? (
        <div className="space-y-6">
          <section aria-label="Reapeluri scadente">
            <h2 className="mb-2 text-sm font-semibold">Reapeluri scadente ({data?.due.length ?? 0})</h2>
            {!data ? <p className="text-sm text-muted-foreground">Se încarcă…</p> : data.due.length === 0 ? <p className="text-sm text-muted-foreground">Niciun reapel scadent.</p> : <ul className="space-y-2">{data.due.map((it: Item) => <Row key={it.id} it={it} when onOpen={() => setOpenId(it.id)} />)}</ul>}
          </section>
          <section aria-label="De sunat">
            <h2 className="mb-2 text-sm font-semibold">De sunat — pilot, pe județe ({data?.uncalled.total ?? 0})</h2>
            {data && data.uncalled.items.length === 0 ? <p className="text-sm text-muted-foreground">Nicio firmă nesunată în pilot. (Pilotul se pregătește cu scriptul pilot-setup.)</p> : <ul className="space-y-2">{data?.uncalled.items.map((it: Item) => <Row key={it.id} it={it} onOpen={() => setOpenId(it.id)} />)}</ul>}
            {data && data.uncalled.total > data.uncalled.items.length && <p className="mt-2 text-xs text-muted-foreground">Se afișează primele {data.uncalled.items.length}; pe măsură ce le suni, apar următoarele.</p>}
          </section>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <section aria-label="Calendar reapeluri">
            <div className="mb-3 flex items-center justify-between">
              <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted" onClick={() => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))} aria-label="Luna anterioară">←</button>
              <div className="flex items-center gap-3"><h2 className="text-base font-semibold">{MONTHS[ym.m]} {ym.y}</h2><button className="text-xs underline text-muted-foreground" onClick={() => { const n = new Date(); setYm({ y: n.getFullYear(), m: n.getMonth() }); setSelected(dayKey(n)) }}>Azi</button></div>
              <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted" onClick={() => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))} aria-label="Luna următoare">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">{WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1" role="grid">
              {grid.flat().map(({ date, inMonth }) => {
                const k = dayKey(date), n = byDay.get(k)?.length ?? 0
                return (
                  <button key={k} role="gridcell" aria-selected={selected === k} aria-label={`${date.getDate()} ${MONTHS[date.getMonth()]}${n ? `, ${n} reapeluri` : ""}`} onClick={() => setSelected(k)}
                    className={cn("flex h-20 flex-col rounded-lg border p-1.5 text-left text-sm", inMonth ? "border-border" : "border-transparent text-muted-foreground/50", selected === k && "ring-2 ring-primary", k === today && "bg-primary/5", "hover:bg-muted/50")}>
                    <span className={cn("text-xs", k === today && "font-bold text-primary")}>{date.getDate()}</span>
                    {n > 0 && <span className="mt-auto rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">{n} apel{n > 1 ? "uri" : ""}</span>}
                  </button>
                )
              })}
            </div>
          </section>
          <section aria-label="Reapeluri în ziua aleasă">
            <h2 className="mb-2 text-sm font-semibold">{new Date(selected + "T12:00:00").toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" })}</h2>
            {(byDay.get(selected) ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Niciun reapel în această zi.</p> : <ul className="space-y-2">{byDay.get(selected)!.map((it) => <Row key={it.id} it={it} when onOpen={() => setOpenId(it.id)} />)}</ul>}
          </section>
        </div>
      )}

      <CallModal open={!!openId} leadId={openId} lineSlug={slug} onClose={() => setOpenId(null)} onSaved={() => { void loadQueue(); if (tab === "calendar") void loadCal() }} onNext={tab === "coada" && queue.findIndex((q) => q.id === openId) < queue.length - 1 ? next : undefined} />
    </div>
  )
}
