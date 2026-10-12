"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Search, UserPlus, Link2, Archive, ArchiveRestore, ChevronDown, ChevronRight, Inbox, Bot, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Msg { id: string; subject: string; body: string; fromAddr: string | null; toAddr: string | null; createdAt: string; attachments: string[] }
interface Thread {
  threadId: string; count: number; subject: string; from: string | null; fromEmail: string | null; lastAt: string; mailbox: string | null
  businessLine: { id: string; name: string; slug: string } | null; autoReply: boolean; messages: Msg[]
}
interface Line { id: string; name: string; entityTypes: { id: string; namePlural: string; financialFlow: string }[] }
interface Owner { type: "lead" | "client"; id: string; companyName: string; contactPerson: string; email: string }

const inputCls = "px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
const fmt = (d: string) => new Date(d).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const nameOf = (a: string | null) => (a ? a.replace(/<[^>]*>/, "").replace(/"/g, "").trim() || a : "")

/** Inbound email nobody owns yet: attach to a lead/client, create a lead from the sender, or archive. */
export function SharedInbox({ onCount }: { onCount?: (n: number) => void }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [lineId, setLineId] = useState("")
  const [q, setQ] = useState("")
  const [archived, setArchived] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [panel, setPanel] = useState<{ id: string; kind: "create" | "attach" } | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; text: string; href?: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const p = new URLSearchParams()
    if (lineId) p.set("businessLineId", lineId)
    if (q) p.set("q", q)
    if (archived) p.set("archived", "1")
    const r = await fetch(`/api/communications/inbox?${p}`).then((x) => x.json()).catch(() => ({ data: [] }))
    setThreads(r.data ?? [])
    setLoading(false)
    if (!archived && !lineId && !q) onCount?.((r.data ?? []).length)
  }, [lineId, q, archived, onCount])

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t) }, [load, q])
  useEffect(() => {
    fetch("/api/settings/pipelines").then((r) => r.json()).then((j) => setLines(((j.data ?? []) as Line[]))).catch(() => {})
  }, [])

  async function post(url: string, body: unknown, okText: (j: any) => { text: string; href?: string }) {
    setBusy(true); setFlash(null)
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setFlash({ ok: false, text: j.error || "Operațiunea a eșuat", href: j.details?.leadId ? `/crm/lead-uri/${j.details.leadId}` : j.details?.clientId ? `/crm/clienti/${j.details.clientId}` : undefined }); return false }
    setFlash({ ok: true, ...okText(j.data ?? j) }); setPanel(null); setOpen(null)
    await load()
    return true
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className={inputCls} value={lineId} onChange={(e) => setLineId(e.target.value)}>
          <option value="">Toate liniile</option>
          {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={cn(inputCls, "w-full pl-7")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută în expeditor, subiect, conținut…" />
        </div>
        <button onClick={() => setArchived(!archived)} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg", archived ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/50")}>
          <Archive size={12} /> {archived ? "Arhivate" : "Arhivate"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">Emailuri primite de la adrese care nu aparțin încă niciunui lead sau client. Atașează-le unui contact existent, creează un lead din expeditor sau arhivează-le (nu se șterge nimic).</p>

      {flash && (
        <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs", flash.ok ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive")}>
          <span className="flex-1">{flash.text}</span>
          {flash.href && <Link href={flash.href} className="font-medium underline">Deschide</Link>}
          <button onClick={() => setFlash(null)}><X size={12} /></button>
        </div>
      )}

      {loading ? <Loader2 size={16} className="animate-spin text-muted-foreground" /> : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
          <Inbox size={30} className="mb-2 opacity-50" />
          <p className="text-sm font-medium">{archived ? "Nicio conversație arhivată" : "Inbox-ul este gol"}</p>
          <p className="text-xs mt-1">{archived ? "" : "Mesajele de la adrese necunoscute apar aici după ce activezi primirea IMAP pe o căsuță."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const isOpen = open === t.threadId
            const line = lines.find((l) => l.id === t.businessLine?.id)
            return (
              <div key={t.threadId} className="rounded-xl border border-border bg-surface">
                <button onClick={() => setOpen(isOpen ? null : t.threadId)} className="w-full flex items-start gap-3 p-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{nameOf(t.from) || t.fromEmail}</span>
                      {t.count > 1 && <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{t.count}</span>}
                      {t.autoReply && <span className="flex items-center gap-1 rounded bg-slate-500/10 px-1.5 text-[9px] font-semibold text-slate-400"><Bot size={9} /> AUTOMAT</span>}
                      {t.businessLine && <span className="rounded bg-muted px-1.5 text-[9px] text-muted-foreground">{t.businessLine.name}</span>}
                      {t.mailbox && <span className="rounded bg-muted px-1.5 text-[9px] text-muted-foreground">{t.mailbox}</span>}
                    </div>
                    <p className="truncate text-xs text-foreground-secondary">{t.subject}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{t.fromEmail} · {t.messages[t.messages.length - 1]?.body.replace(/\s+/g, " ").slice(0, 100)}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{fmt(t.lastAt)}</span>
                  {isOpen ? <ChevronDown size={14} className="mt-1 text-muted-foreground" /> : <ChevronRight size={14} className="mt-1 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-border p-3">
                    <div className="space-y-2">
                      {t.messages.map((m) => (
                        <div key={m.id} className="rounded-lg bg-muted/30 p-2.5 text-xs">
                          <p className="mb-1 text-[10px] text-muted-foreground">{m.fromAddr} → {m.toAddr} · {fmt(m.createdAt)}</p>
                          <p className="whitespace-pre-wrap break-words text-foreground-secondary">{m.body || "—"}</p>
                          {m.attachments.length > 0 && <p className="mt-1 text-[10px] text-muted-foreground">Atașamente: {m.attachments.join(", ")}</p>}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!archived && (
                        <>
                          <button onClick={() => setPanel(panel?.id === t.threadId && panel.kind === "create" ? null : { id: t.threadId, kind: "create" })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><UserPlus size={12} /> Creează lead</button>
                          <button onClick={() => setPanel(panel?.id === t.threadId && panel.kind === "attach" ? null : { id: t.threadId, kind: "attach" })} className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/70"><Link2 size={12} /> Atașează la existent</button>
                        </>
                      )}
                      <button disabled={busy} onClick={() => post("/api/communications/inbox/archive", { threadId: t.threadId, archived: !archived }, () => ({ text: archived ? "Restaurat în inbox" : "Arhivat" }))} className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50">
                        {archived ? <><ArchiveRestore size={12} /> Restaurează</> : <><Archive size={12} /> Arhivează</>}
                      </button>
                    </div>

                    {panel?.id === t.threadId && panel.kind === "create" && <CreateLead thread={t} line={line} busy={busy} onSubmit={(b) => post("/api/communications/inbox/create-lead", { threadId: t.threadId, ...b }, (d) => ({ text: `Lead creat, ${d.attached} ${d.attached === 1 ? "mesaj atașat" : "mesaje atașate"}`, href: `/crm/lead-uri/${d.leadId}` }))} />}
                    {panel?.id === t.threadId && panel.kind === "attach" && <AttachTo thread={t} busy={busy} onPick={(o) => post("/api/communications/inbox/assign", { threadId: t.threadId, [o.type === "lead" ? "leadId" : "clientId"]: o.id }, () => ({ text: `Conversația a fost atașată la ${o.companyName}`, href: o.type === "lead" ? `/crm/lead-uri/${o.id}` : `/crm/clienti/${o.id}` }))} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CreateLead({ thread, line, busy, onSubmit }: { thread: Thread; line?: Line; busy: boolean; onSubmit: (b: Record<string, string>) => void }) {
  const types = line?.entityTypes ?? []
  const [entityType, setEntityType] = useState(types.find((t) => t.financialFlow === "income")?.id ?? types[0]?.id ?? "")
  const [company, setCompany] = useState("")
  const [person, setPerson] = useState(nameOf(thread.from).includes("@") ? "" : nameOf(thread.from))
  const [phone, setPhone] = useState("")
  return (
    <div className="grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:grid-cols-2">
      <p className="text-[11px] text-muted-foreground sm:col-span-2">Se creează un lead cu adresa <b>{thread.fromEmail}</b> în linia {thread.businessLine?.name}. Mesajele nealocate de la această adresă se atașează automat.</p>
      <select className={inputCls} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
        {types.map((t) => <option key={t.id} value={t.id}>{t.namePlural}</option>)}
      </select>
      <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Companie (opțional)" />
      <input className={inputCls} value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Persoană de contact" />
      <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon (opțional)" />
      <button disabled={busy} onClick={() => onSubmit({ entityType, companyName: company, contactPerson: person, phone })} className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50 sm:col-span-2">
        <Check size={12} /> {busy ? "Se creează…" : "Creează lead-ul"}
      </button>
    </div>
  )
}

function AttachTo({ thread, busy, onPick }: { thread: Thread; busy: boolean; onPick: (o: Owner) => void }) {
  const [q, setQ] = useState(thread.fromEmail?.split("@")[1]?.split(".")[0] ?? "")
  const [res, setRes] = useState<Owner[]>([])
  useEffect(() => {
    if (!thread.businessLine || q.trim().length < 2) { setRes([]); return }
    const t = setTimeout(() => {
      fetch(`/api/communications/inbox/search?businessLineId=${thread.businessLine!.id}&q=${encodeURIComponent(q)}`).then((r) => r.json()).then((j) => setRes(j.data ?? [])).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [q, thread.businessLine])
  const results = useMemo(() => res, [res])
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <input className={cn(inputCls, "w-full")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută lead sau client după companie, persoană sau email…" autoFocus />
      {results.length === 0 ? <p className="text-[11px] text-muted-foreground">{q.trim().length < 2 ? "Scrie cel puțin 2 caractere." : "Niciun rezultat în această linie de business."}</p> : (
        <ul className="space-y-1">
          {results.map((o) => (
            <li key={`${o.type}-${o.id}`}>
              <button disabled={busy} onClick={() => onPick(o)} className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left text-xs hover:border-primary/40 disabled:opacity-50">
                <span className="rounded bg-muted px-1.5 text-[9px] font-semibold uppercase">{o.type === "lead" ? "Lead" : "Client"}</span>
                <span className="font-medium text-foreground">{o.companyName}</span>
                <span className="truncate text-muted-foreground">{o.contactPerson} · {o.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
