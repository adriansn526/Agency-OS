"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Mail, Phone, MessageSquare, MessagesSquare, Video, StickyNote, Zap, ArrowDownLeft, ArrowUpRight, Loader2, Send, ChevronDown, ChevronRight } from "lucide-react"
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
  phone: string | null
  callResult: string | null
  duration: number | null
  userName: string | null
  metadata: { source?: string; error?: string; attachments?: string[] } | null
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
const SOURCES: Record<string, string> = { offer: "Ofertă", report: "Raport", order: "Comandă", manual: "Manual", transactional: "Automat" }
const CALL_RESULTS: Record<string, string> = { answered: "Răspuns", no_answer: "Fără răspuns", busy: "Ocupat", voicemail: "Mesagerie" }
const MAILBOXES = [{ key: "general", label: "General (office@)" }, { key: "orders", label: "Comenzi (comenzi@)" }, { key: "partners", label: "Parteneri (parteneri@)" }]

const inputCls = "w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"

type Mode = "email" | "note" | "call" | "video"

/** Unified timeline + composer for a lead or a client. A converted lead and its client share one history (server-side). */
export function EntityCommunications({ leadId, clientId, businessLineId, defaultEmail, defaultPhone }: {
  leadId?: string; clientId?: string; businessLineId?: string | null; defaultEmail?: string | null; defaultPhone?: string | null
}) {
  const [items, setItems] = useState<Comm[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>("email")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [f, setF] = useState({ mailbox: "general", to: "", subject: "", body: "", callResult: "answered", duration: "" })

  const qs = leadId ? `leadId=${leadId}` : `clientId=${clientId}`
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/communications?${qs}&limit=200`)
      const j = await r.json()
      setItems(j.data ?? [])
    } finally { setLoading(false) }
  }, [qs])
  useEffect(() => { load() }, [load])

  const counts = useMemo(() => items.reduce<Record<string, number>>((a, c) => { a[c.channel] = (a[c.channel] ?? 0) + 1; return a }, {}), [items])
  const shown = filter === "all" ? items : items.filter((c) => c.channel === filter)
  const groups = useMemo(() => {
    const g = new Map<string, Comm[]>()
    for (const c of shown) {
      const k = new Date(c.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })
      g.set(k, [...(g.get(k) ?? []), c])
    }
    return [...g.entries()]
  }, [shown])

  async function submit() {
    setBusy(true); setMsg(null)
    try {
      let res: Response
      if (mode === "email") {
        res = await fetch("/api/communications/send", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, clientId, purpose: f.mailbox, to: f.to || undefined, subject: f.subject, body: f.body }),
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
      setMsg({ ok: true, text: mode === "email" ? "Email trimis" : "Înregistrat" })
      await load()
    } finally { setBusy(false) }
  }

  const canSubmit = mode === "email" ? f.subject.trim() && f.body.trim() && (f.to || defaultEmail) : f.body.trim() || f.subject.trim()

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="bg-surface rounded-xl border border-border p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {([["email", "Email"], ["note", "Notă"], ["call", "Apel"], ["video", "Întâlnire"]] as [Mode, string][]).map(([k, label]) => {
            const Icon = CHANNELS[k]!.icon
            return (
              <button key={k} onClick={() => { setMode(k); setMsg(null) }} className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                mode === k ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/50")}>
                <Icon size={12} /> {label}
              </button>
            )
          })}
          <span className="ml-auto text-[10px] text-muted-foreground">WhatsApp și SMS: în curând</span>
        </div>

        {mode === "email" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={inputCls} value={f.mailbox} onChange={(e) => setF({ ...f, mailbox: e.target.value })}>
              {MAILBOXES.map((m) => <option key={m.key} value={m.key}>De la: {m.label}</option>)}
            </select>
            <input className={inputCls} type="email" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder={defaultEmail ? `Către: ${defaultEmail}` : "Către"} />
          </div>
        )}
        {(mode === "email" || mode === "video") && (
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
          placeholder={mode === "email" ? "Mesaj" : mode === "note" ? "Notă internă (nu se trimite nimănui)" : "Detalii"} />
        <div className="flex items-center gap-2">
          <button onClick={submit} disabled={busy || !canSubmit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} {mode === "email" ? "Trimite email" : "Salvează"}
          </button>
          {msg && <span className={cn("text-xs", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setFilter("all")} className={cn("px-2 py-1 text-[10px] font-medium rounded-md", filter === "all" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/50")}>
          Toate · {items.length}
        </button>
        {Object.entries(CHANNELS).filter(([k]) => counts[k]).map(([k, c]) => (
          <button key={k} onClick={() => setFilter(k)} className={cn("px-2 py-1 text-[10px] font-medium rounded-md", filter === k ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/50")}>
            {c.label} · {counts[k]}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? <Loader2 size={16} className="animate-spin text-muted-foreground" /> : groups.length === 0 ? (
        <div className="bg-surface rounded-xl border border-dashed border-border p-8 text-center">
          <MessageSquare size={28} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Nicio comunicare încă</p>
          <p className="text-xs text-muted-foreground">Emailurile trimise din sistem (oferte, rapoarte, comenzi) apar aici automat.</p>
        </div>
      ) : groups.map(([day, list]) => (
        <div key={day} className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{day}</p>
          {list.map((c) => {
            const ch = CHANNELS[c.channel] ?? CHANNELS.system!
            const Icon = ch.icon
            const isOpen = open.has(c.id)
            const failed = c.emailStatus === "failed"
            const toggle = () => setOpen((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })
            return (
              <div key={c.id} className={cn("rounded-lg border bg-surface", failed ? "border-destructive/40" : "border-border", c.kind === "event" && "opacity-80")}>
                <button onClick={toggle} className="w-full flex items-start gap-2.5 p-2.5 text-left">
                  <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", ch.color)}><Icon size={12} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {c.kind !== "note" && c.kind !== "event" && (c.direction === "inbound" ? <ArrowDownLeft size={11} className="text-blue-400" /> : <ArrowUpRight size={11} className="text-muted-foreground" />)}
                      <span className="truncate text-xs font-medium text-foreground">{c.subject}</span>
                      {failed && <span className="rounded bg-destructive/10 px-1.5 text-[9px] font-semibold text-destructive">EȘUAT</span>}
                      {c.metadata?.source && <span className="rounded bg-muted px-1.5 text-[9px] text-muted-foreground">{SOURCES[c.metadata.source] ?? c.metadata.source}</span>}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {c.channel === "email" ? `${c.fromAddr ?? ""} → ${c.toAddr ?? ""}` : c.channel === "call" ? [c.callResult && CALL_RESULTS[c.callResult], c.duration ? `${Math.round(c.duration / 60)} min` : null].filter(Boolean).join(" · ") : c.body.slice(0, 100)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[10px] text-muted-foreground">
                    {new Date(c.createdAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                    {c.userName && c.userName !== "System" && <span className="block">{c.userName}</span>}
                  </span>
                  {isOpen ? <ChevronDown size={12} className="mt-1 text-muted-foreground" /> : <ChevronRight size={12} className="mt-1 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border px-3 py-2 text-xs text-foreground-secondary">
                    {failed && c.metadata?.error && <p className="mb-1.5 text-destructive">Eroare: {c.metadata.error}</p>}
                    <p className="whitespace-pre-wrap break-words">{c.body || "—"}</p>
                    {c.metadata?.attachments?.length ? <p className="mt-1.5 text-[11px] text-muted-foreground">Atașamente: {c.metadata.attachments.join(", ")}</p> : null}
                    {c.mailbox && <p className="mt-1.5 text-[10px] text-muted-foreground">Căsuță: {c.mailbox}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
