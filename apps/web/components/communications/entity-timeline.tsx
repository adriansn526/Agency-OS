"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Mail, Phone, MessageSquare, MessagesSquare, Video, StickyNote, Zap, ArrowDownLeft, ArrowUpRight, Loader2, Send, ChevronDown, ChevronRight, Reply, X, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Comm {
  id: string
  channel: string
  direction: string
  kind: string
  subject: string
  body: string
  fromAddr: string | null
  toAddr: string | null
  emailStatus: string | null
  mailbox: string | null
  threadId: string | null
  externalId: string | null
  phone: string | null
  callResult: string | null
  duration: number | null
  userName: string | null
  metadata: { source?: string; error?: string; attachments?: string[]; unmatched?: boolean } | null
  createdAt: string
}

const CHANNELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  email: { label: "Email", icon: Mail, color: "text-amber-400 bg-amber-500/10" },
  call: { label: "Apel", icon: Phone, color: "text-emerald-400 bg-emerald-500/10" },
  whatsapp: { label: "WhatsApp", icon: MessagesSquare, color: "text-green-400 bg-green-500/10" },
  sms: { label: "SMS", icon: MessageSquare, color: "text-blue-400 bg-blue-500/10" },
  video: { label: "Întâlnire", icon: Video, color: "text-purple-400 bg-purple-500/10" },
  note: { label: "Notă", icon: StickyNote, color: "text-yellow-400 bg-yellow-500/10" },
  system: { label: "Sistem", icon: Zap, color: "text-slate-400 bg-slate-500/10" },
}
const SOURCES: Record<string, string> = { offer: "Ofertă", report: "Raport", order: "Comandă", manual: "Manual", reply: "Răspuns", transactional: "Automat", imap: "Primit" }
const CALL_RESULTS: Record<string, string> = { answered: "Răspuns", no_answer: "Fără răspuns", busy: "Ocupat", voicemail: "Mesagerie" }

const inputCls = "w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"

type Mode = "email" | "note" | "call" | "video"
type View = "threads" | "flat"

const fmtDay = (d: string) => new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
const fmtShort = (d: string) => new Date(d).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const cleanSubject = (s: string) => s.replace(/^\s*((re|fw|fwd|răspuns|raspuns)\s*:\s*)+/i, "").trim() || "(fără subiect)"
const nameOf = (a: string | null) => (a ? a.replace(/<[^>]*>/, "").replace(/"/g, "").trim() || a : "")

/** Splits a plain-text email body into the new text and the quoted history ("> …" lines / "X a scris:" header) */
function splitQuoted(body: string): { fresh: string; quoted: string } {
  const lines = body.split("\n")
  const hdr = lines.findIndex((l, i) => /^(în|in|on)\s.+(a scris|wrote):?\s*$/i.test(l.trim()) && lines.slice(i + 1).some((x) => x.trim().startsWith(">")))
  const firstQuote = lines.findIndex((l) => l.trim().startsWith(">"))
  const cut = hdr >= 0 ? hdr : firstQuote
  if (cut <= 0 && !(cut === 0 && hdr === 0)) return { fresh: body, quoted: "" }
  return { fresh: lines.slice(0, cut).join("\n").trim(), quoted: lines.slice(cut).join("\n").trim() }
}

type Entry = { kind: "thread"; id: string; msgs: Comm[]; last: string } | { kind: "single"; id: string; c: Comm; last: string }

/** Unified timeline + composer for a lead or a client. Email conversations are grouped into threads; a converted lead and its client share one history (server-side). */
export function EntityCommunications({ leadId, clientId, businessLineId, defaultEmail, defaultPhone }: {
  leadId?: string; clientId?: string; businessLineId?: string | null; defaultEmail?: string | null; defaultPhone?: string | null
}) {
  const [items, setItems] = useState<Comm[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [view, setView] = useState<View>("threads")
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>("email")
  const [replyTo, setReplyTo] = useState<Comm | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [mailboxes, setMailboxes] = useState<{ key: string; label: string; from: string }[]>([])
  const [f, setF] = useState({ mailbox: "general", to: "", subject: "", body: "", callResult: "answered", duration: "" })
  const composerRef = useRef<HTMLDivElement>(null)

  const qs = leadId ? `leadId=${leadId}` : `clientId=${clientId}`
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/communications?${qs}&limit=200`)
      const j = await r.json()
      setItems(j.data ?? [])
    } finally { setLoading(false) }
  }, [qs])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!businessLineId) return
    fetch(`/api/settings/business-lines/${businessLineId}/mail`).then((r) => r.json()).then((j) => {
      const list = ((j.data ?? []) as { purpose: string; label: string | null; fromEmail: string; enabled: boolean }[]).filter((m) => m.enabled)
      setMailboxes(list.map((m) => ({ key: m.purpose, label: m.label || m.purpose, from: m.fromEmail })))
      setF((p) => (list.some((m) => m.purpose === p.mailbox) || !list[0] ? p : { ...p, mailbox: list[0].purpose }))
    }).catch(() => {})
  }, [businessLineId])

  const counts = useMemo(() => items.reduce<Record<string, number>>((a, c) => { a[c.channel] = (a[c.channel] ?? 0) + 1; return a }, {}), [items])
  const shown = filter === "all" ? items : items.filter((c) => c.channel === filter)

  // threads: email messages sharing a threadId (>1 message, or a reply), ordered by last activity
  const entries: Entry[] = useMemo(() => {
    const byThread = new Map<string, Comm[]>()
    for (const c of shown) if (c.channel === "email" && c.threadId) byThread.set(c.threadId, [...(byThread.get(c.threadId) ?? []), c])
    const out: Entry[] = []
    const seen = new Set<string>()
    for (const c of shown) {
      if (c.channel === "email" && c.threadId) {
        if (seen.has(c.threadId)) continue
        seen.add(c.threadId)
        const msgs = byThread.get(c.threadId)!.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        out.push({ kind: "thread", id: c.threadId, msgs, last: msgs[msgs.length - 1]!.createdAt })
      } else out.push({ kind: "single", id: c.id, c, last: c.createdAt })
    }
    return out.sort((a, b) => b.last.localeCompare(a.last))
  }, [shown])

  const days = useMemo(() => {
    const g = new Map<string, Comm[]>()
    for (const c of shown) g.set(fmtDay(c.createdAt), [...(g.get(fmtDay(c.createdAt)) ?? []), c])
    return [...g.entries()]
  }, [shown])

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  function startReply(c: Comm) {
    setReplyTo(c); setMode("email"); setMsg(null)
    if (c.mailbox && mailboxes.some((m) => m.key === c.mailbox)) setF((p) => ({ ...p, mailbox: c.mailbox! }))
    setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50)
  }
  const cancelReply = () => setReplyTo(null)

  async function submit() {
    setBusy(true); setMsg(null)
    try {
      let res: Response
      if (mode === "email") {
        res = await fetch("/api/communications/send", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(replyTo
            ? { leadId, clientId, replyToId: replyTo.id, purpose: f.mailbox, body: f.body }
            : { leadId, clientId, purpose: f.mailbox, to: f.to || undefined, subject: f.subject, body: f.body }),
        })
      } else {
        res = await fetch("/api/communications", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId, clientId, businessLineId, channel: mode, direction: "outbound", kind: mode === "note" ? "note" : "message",
            subject: f.subject || (mode === "note" ? "Notă" : mode === "call" ? "Apel" : "Întâlnire"), body: f.body,
            phone: mode === "call" ? defaultPhone : undefined, callResult: mode === "call" ? f.callResult : undefined,
            duration: mode === "call" && f.duration ? Math.round(Number(f.duration) * 60) : undefined,
          }),
        })
      }
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ ok: false, text: j.error || "Operațiunea a eșuat" }); return }
      setF((p) => ({ ...p, subject: "", body: "", duration: "" }))
      if (mode === "email") setReplyTo(null)
      setMsg({ ok: true, text: mode === "email" ? "Email trimis" : "Înregistrat" })
      await load()
    } finally { setBusy(false) }
  }

  const canSubmit = mode === "email"
    ? f.body.trim() && (replyTo ? true : f.subject.trim() && (f.to || defaultEmail))
    : f.body.trim() || f.subject.trim()

  /** One message (used flat and inside a thread) */
  const row = (c: Comm, inThread: boolean) => {
    const ch = CHANNELS[c.channel] ?? CHANNELS.system!
    const Icon = ch.icon
    const failed = c.emailStatus === "failed"
    const bounced = c.emailStatus === "bounced"
    const isOpen = open.has(c.id) || (inThread && open.has(`m:${c.id}`))
    const { fresh, quoted } = c.channel === "email" ? splitQuoted(c.body) : { fresh: c.body, quoted: "" }
    return (
      <div key={c.id} className={cn("rounded-lg border bg-surface", failed || bounced ? "border-destructive/40" : "border-border", c.kind === "event" && "opacity-80", inThread && (c.direction === "inbound" ? "mr-8" : "ml-8"))}>
        <button onClick={() => toggle(c.id)} className="w-full flex items-start gap-2.5 p-2.5 text-left">
          <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", ch.color)}><Icon size={12} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              {c.kind !== "note" && c.kind !== "event" && (c.direction === "inbound" ? <ArrowDownLeft size={11} className="text-blue-400" /> : <ArrowUpRight size={11} className="text-muted-foreground" />)}
              <span className="truncate text-xs font-medium text-foreground">{inThread ? (c.direction === "inbound" ? nameOf(c.fromAddr) : `Noi${c.mailbox ? ` (${c.mailbox})` : ""}`) : c.subject}</span>
              {failed && <span className="rounded bg-destructive/10 px-1.5 text-[9px] font-semibold text-destructive">EȘUAT</span>}
              {bounced && <span className="rounded bg-destructive/10 px-1.5 text-[9px] font-semibold text-destructive">NELIVRAT</span>}
              {c.metadata?.source && !inThread && <span className="rounded bg-muted px-1.5 text-[9px] text-muted-foreground">{SOURCES[c.metadata.source] ?? c.metadata.source}</span>}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {isOpen ? "" : c.channel === "email" ? (fresh || c.body).replace(/\s+/g, " ").slice(0, 110) : c.channel === "call" ? [c.callResult && CALL_RESULTS[c.callResult], c.duration ? `${Math.round(c.duration / 60)} min` : null].filter(Boolean).join(" · ") : c.body.slice(0, 100)}
            </span>
          </span>
          <span className="shrink-0 text-right text-[10px] text-muted-foreground">{inThread ? fmtShort(c.createdAt) : fmtTime(c.createdAt)}{c.userName && c.userName !== "System" && !inThread && <span className="block">{c.userName}</span>}</span>
          {isOpen ? <ChevronDown size={12} className="mt-1 text-muted-foreground" /> : <ChevronRight size={12} className="mt-1 text-muted-foreground" />}
        </button>
        {isOpen && (
          <div className="border-t border-border px-3 py-2 text-xs text-foreground-secondary">
            {c.channel === "email" && <p className="mb-1.5 text-[10px] text-muted-foreground">De la {c.fromAddr ?? "—"} → {c.toAddr ?? "—"}{c.mailbox ? ` · căsuță: ${c.mailbox}` : ""}</p>}
            {failed && c.metadata?.error && <p className="mb-1.5 text-destructive">Eroare: {c.metadata.error}</p>}
            <p className="whitespace-pre-wrap break-words">{fresh || "—"}</p>
            {quoted && (
              <details className="mt-1.5"><summary className="cursor-pointer text-[10px] text-muted-foreground">Arată mesajul citat</summary><p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{quoted}</p></details>
            )}
            {c.metadata?.attachments?.length ? <p className="mt-1.5 text-[11px] text-muted-foreground">Atașamente: {c.metadata.attachments.join(", ")}</p> : null}
            {c.channel === "email" && c.kind === "message" && (
              <button onClick={() => startReply(c)} className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"><Reply size={11} /> Răspunde</button>
            )}
          </div>
        )}
      </div>
    )
  }

  const threadCard = (e: Extract<Entry, { kind: "thread" }>) => {
    const key = `t:${e.id}`
    const isOpen = open.has(key)
    const first = e.msgs[0]!
    const last = e.msgs[e.msgs.length - 1]!
    const people = [...new Set(e.msgs.map((m) => (m.direction === "inbound" ? nameOf(m.fromAddr) : "Noi")))].filter(Boolean)
    const awaiting = last.direction === "inbound" // client wrote last: waiting for our answer
    const anyBad = e.msgs.some((m) => m.emailStatus === "failed" || m.emailStatus === "bounced")
    const replyTarget = [...e.msgs].reverse().find((m) => m.kind === "message") ?? last
    return (
      <div key={key} className={cn("rounded-xl border bg-surface/50", awaiting ? "border-blue-500/40" : "border-border")}>
        <button onClick={() => toggle(key)} className="w-full flex items-start gap-2.5 p-3 text-left">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-amber-400 bg-amber-500/10"><MessageCircle size={14} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground">{cleanSubject(first.subject)}</span>
              <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{e.msgs.length}</span>
              {awaiting && <span className="rounded bg-blue-500/10 px-1.5 text-[9px] font-semibold text-blue-400">AȘTEAPTĂ RĂSPUNS</span>}
              {anyBad && <span className="rounded bg-destructive/10 px-1.5 text-[9px] font-semibold text-destructive">PROBLEMĂ LIVRARE</span>}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{people.join(", ")} · {(last.channel === "email" ? splitQuoted(last.body).fresh || last.body : last.body).replace(/\s+/g, " ").slice(0, 90)}</span>
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{fmtShort(e.last)}</span>
          {isOpen ? <ChevronDown size={14} className="mt-1 text-muted-foreground" /> : <ChevronRight size={14} className="mt-1 text-muted-foreground" />}
        </button>
        {isOpen && (
          <div className="space-y-1.5 border-t border-border p-3">
            {e.msgs.map((m) => row(m, true))}
            <button onClick={() => startReply(replyTarget)} className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"><Reply size={12} /> Răspunde în conversație</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div ref={composerRef} className="bg-surface rounded-xl border border-border p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {([["email", "Email"], ["note", "Notă"], ["call", "Apel"], ["video", "Întâlnire"]] as [Mode, string][]).map(([k, label]) => {
            const Icon = CHANNELS[k]!.icon
            return (
              <button key={k} onClick={() => { setMode(k); setMsg(null); if (k !== "email") setReplyTo(null) }} className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                mode === k ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/50")}>
                <Icon size={12} /> {label}
              </button>
            )
          })}
          <span className="ml-auto text-[10px] text-muted-foreground">WhatsApp și SMS: în curând</span>
        </div>

        {mode === "email" && replyTo && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2 text-[11px]">
            <Reply size={12} className="mt-0.5 text-primary" />
            <span className="min-w-0 flex-1 text-foreground-secondary">
              <b>Răspuns la:</b> {cleanSubject(replyTo.subject)}<br />
              <span className="text-muted-foreground">către {replyTo.direction === "inbound" ? nameOf(replyTo.fromAddr) || replyTo.fromAddr : replyTo.toAddr} · rămâne în aceeași conversație, mesajul citat se adaugă automat</span>
            </span>
            <button onClick={cancelReply} className="text-muted-foreground hover:text-foreground" title="Renunță la răspuns, scrie un mesaj nou"><X size={13} /></button>
          </div>
        )}
        {mode === "email" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={inputCls} value={f.mailbox} onChange={(e) => setF({ ...f, mailbox: e.target.value })}>
              {mailboxes.length === 0 && <option value="general">De la: expeditor implicit</option>}
              {mailboxes.map((m) => <option key={m.key} value={m.key}>De la: {m.label} ({m.from})</option>)}
            </select>
            {!replyTo && <input className={inputCls} type="email" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder={defaultEmail ? `Către: ${defaultEmail}` : "Către"} />}
          </div>
        )}
        {((mode === "email" && !replyTo) || mode === "video") && (
          <input className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder={mode === "email" ? "Subiect" : "Titlu întâlnire"} />
        )}
        {mode === "call" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={inputCls} value={f.callResult} onChange={(e) => setF({ ...f, callResult: e.target.value })}>
              {Object.entries(CALL_RESULTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input className={inputCls} type="number" min="0" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} placeholder="Durată (minute)" />
          </div>
        )}
        <textarea className={cn(inputCls, "h-24")} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })}
          placeholder={mode === "email" ? (replyTo ? "Răspunsul tău" : "Mesaj") : mode === "note" ? "Notă internă (nu se trimite nimănui)" : "Detalii"} />
        <div className="flex items-center gap-2">
          <button onClick={submit} disabled={busy || !canSubmit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} {mode === "email" ? (replyTo ? "Trimite răspunsul" : "Trimite email") : "Salvează"}
          </button>
          {msg && <span className={cn("text-xs", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</span>}
        </div>
      </div>

      {/* Filters + view */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setFilter("all")} className={cn("px-2 py-1 text-[10px] font-medium rounded-md", filter === "all" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/50")}>
          Toate · {items.length}
        </button>
        {Object.entries(CHANNELS).filter(([k]) => counts[k]).map(([k, c]) => (
          <button key={k} onClick={() => setFilter(k)} className={cn("px-2 py-1 text-[10px] font-medium rounded-md", filter === k ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/50")}>
            {c.label} · {counts[k]}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">
          {([["threads", "Conversații"], ["flat", "Cronologie"]] as [View, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={cn("px-2 py-1 text-[10px] font-medium rounded-md", view === k ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground")}>{l}</button>
          ))}
        </span>
      </div>

      {/* Timeline */}
      {loading ? <Loader2 size={16} className="animate-spin text-muted-foreground" /> : shown.length === 0 ? (
        <div className="bg-surface rounded-xl border border-dashed border-border p-8 text-center">
          <MessageSquare size={28} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Nicio comunicare încă</p>
          <p className="text-xs text-muted-foreground">Emailurile trimise din sistem (oferte, rapoarte, comenzi) și răspunsurile primite apar aici automat.</p>
        </div>
      ) : view === "threads" ? (
        <div className="space-y-2">{entries.map((e) => (e.kind === "thread" ? threadCard(e) : row(e.c, false)))}</div>
      ) : days.map(([day, list]) => (
        <div key={day} className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{day}</p>
          {list.map((c) => row(c, false))}
        </div>
      ))}
    </div>
  )
}
