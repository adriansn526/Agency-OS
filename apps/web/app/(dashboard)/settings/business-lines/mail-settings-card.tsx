"use client"

import { useCallback, useEffect, useState } from "react"
import { Mail, Check, AlertTriangle, Send, Loader2, Plus, Trash2, Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface Form {
  enabled: boolean
  label: string
  fromName: string
  fromEmail: string
  replyTo: string
  bcc: string
  signatureHtml: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPass: string
  allowSelfSigned: boolean
  imapEnabled: boolean
  imapHost: string
  imapPort: number
  imapSecure: boolean
  imapUser: string
  imapPass: string
  imapFolder: string
}

interface Row {
  purpose: string
  label: string | null
  hasPassword: boolean
  hasImapPassword: boolean
  lastTestOk: boolean | null
  lastTestError: string | null
  imapLastSyncAt: string | null
  imapLastOk: boolean | null
  imapLastError: string | null
  imapLastCount: number | null
  [k: string]: unknown
}

const PRESETS: Record<string, { label: string; hint: string }> = {
  general: { label: "General", hint: "office@ — oferte, rapoarte, corespondență curentă; folosită și când o căsuță specifică nu e activă" },
  orders: { label: "Comenzi", hint: "comenzi@ — confirmări de comandă către clienți" },
  partners: { label: "Parteneri", hint: "parteneri@ — mesaje către service-uri partenere" },
}

const inputCls = "w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,29}$/

const str = (v: unknown) => (typeof v === "string" ? v : "")
const toForm = (r: Row | undefined, lineName: string, label: string): Form => ({
  enabled: Boolean(r?.enabled), label: str(r?.label) || label,
  fromName: str(r?.fromName) || lineName, fromEmail: str(r?.fromEmail), replyTo: str(r?.replyTo), bcc: str(r?.bcc), signatureHtml: str(r?.signatureHtml),
  smtpHost: str(r?.smtpHost), smtpPort: typeof r?.smtpPort === "number" ? r.smtpPort : 465, smtpSecure: r?.smtpSecure !== false, smtpUser: str(r?.smtpUser), smtpPass: "",
  allowSelfSigned: Boolean(r?.allowSelfSigned),
  imapEnabled: Boolean(r?.imapEnabled), imapHost: str(r?.imapHost), imapPort: typeof r?.imapPort === "number" ? r.imapPort : 993, imapSecure: r?.imapSecure !== false,
  imapUser: str(r?.imapUser), imapPass: "", imapFolder: str(r?.imapFolder) || "INBOX",
})

/** All mailboxes of a business line — as many as needed — each with its own SMTP (sending) and optional IMAP (receiving) account. */
export function MailboxManager({ businessLineId, lineName }: { businessLineId: string; lineName: string }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [newKey, setNewKey] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [adding, setAdding] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/settings/business-lines/${businessLineId}/mail`).then((x) => x.json()).catch(() => ({}))
    setRows((r.data as Row[]) ?? [])
  }, [businessLineId])
  useEffect(() => { load() }, [load])

  if (!rows) return <Loader2 size={14} className="animate-spin text-muted-foreground" />
  const keys = [...rows.map((r) => r.purpose), ...adding.filter((k) => !rows.some((r) => r.purpose === k))]
  const suggestions = Object.keys(PRESETS).filter((k) => !keys.includes(k))

  function add(key: string, label: string) {
    if (!KEY_RE.test(key)) { setErr("Cheia: litere mici, cifre și cratime (max 30)"); return }
    if (keys.includes(key)) { setErr("Există deja o căsuță cu această cheie"); return }
    setErr(null); setAdding((a) => [...a, key]); setNewKey(""); setNewLabel("")
    if (label) PRESETS[key] = PRESETS[key] ?? { label, hint: "" }
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-foreground-secondary">Căsuțe de email ({keys.length})</p>
        {suggestions.map((k) => (
          <button key={k} onClick={() => add(k, PRESETS[k]!.label)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md">
            <Plus size={10} /> {PRESETS[k]!.label}
          </button>
        ))}
        <span className="flex items-center gap-1 ml-auto">
          <input className={cn(inputCls, "w-28")} value={newKey} onChange={(e) => setNewKey(e.target.value.toLowerCase())} placeholder="cheie (ex: suport)" />
          <input className={cn(inputCls, "w-32")} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="nume afișat" />
          <button onClick={() => add(newKey, newLabel)} disabled={!newKey} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"><Plus size={10} /> Adaugă</button>
        </span>
      </div>
      {err && <p className="text-[11px] text-destructive">{err}</p>}
      {keys.length === 0 && <p className="text-[11px] text-muted-foreground">Nicio căsuță. Adaugă una (de exemplu General) ca linia să trimită din propria adresă.</p>}
      {keys.map((k) => (
        <MailboxCard key={k} businessLineId={businessLineId} lineName={lineName} purpose={k} row={rows.find((r) => r.purpose === k)}
          label={rows.find((r) => r.purpose === k)?.label || PRESETS[k]?.label || k} hint={PRESETS[k]?.hint ?? "Căsuță personalizată — o poți alege ca expeditor în compozitor"}
          onChanged={() => { setAdding((a) => a.filter((x) => x !== k)); load() }} />
      ))}
    </div>
  )
}

function MailboxCard({ businessLineId, lineName, purpose, row, label, hint, onChanged }: {
  businessLineId: string; lineName: string; purpose: string; row?: Row; label: string; hint: string; onChanged: () => void
}) {
  const [form, setForm] = useState<Form>(() => toForm(row, lineName, label))
  const [busy, setBusy] = useState<string | null>(null)
  const [testTo, setTestTo] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const saved = Boolean(row)
  const base = `/api/settings/business-lines/${businessLineId}/mail/${purpose}`
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function call(name: string, url: string, init: RequestInit, okText: (j: any) => string) {
    setBusy(name); setMsg(null)
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok || j.ok === false) {
      setMsg({ ok: false, text: j.details?.[0] ? `${j.details[0].path?.join(".")}: ${j.details[0].message}` : j.error || "Operațiunea a eșuat" })
      return false
    }
    setMsg({ ok: true, text: okText(j) })
    return true
  }

  async function save() {
    const ok = await call("save", base, { method: "PUT", body: JSON.stringify({ ...form, smtpPass: form.smtpPass || null, imapPass: form.imapPass || null }) }, () => "Salvat")
    if (ok) { set("smtpPass", ""); set("imapPass", ""); onChanged() }
  }
  const test = () => call("test", `${base}/test`, { method: "POST", body: JSON.stringify({ sendTo: testTo }) }, () => (testTo ? `Conexiune SMTP reușită, test trimis la ${testTo}` : "Conexiune SMTP reușită")).then(onChanged)
  const imapTest = () => call("imap", `${base}/imap-test`, { method: "POST" }, (j) => `IMAP reușit: ${j.messages} mesaje în ${form.imapFolder}`)
  const syncNow = () => call("sync", `${base}/sync`, { method: "POST" }, (j) => j.skipped && !j.fetched ? `Sărit: ${j.skipped}` : `${j.stored} mesaje noi (${j.fetched} citite, ${j.duplicates} deja existente${j.bounces ? `, ${j.bounces} nelivrate` : ""})${j.skipped ? ` — ${j.skipped}` : ""}`).then(onChanged)
  async function remove() {
    if (!confirm(`Ștergi căsuța „${label}”? Istoricul mesajelor rămâne.`)) return
    if (await call("del", base, { method: "DELETE" }, () => "Șters")) onChanged()
  }

  const field = (l: string, el: React.ReactNode, span = false) => (
    <label className={cn("block", span && "sm:col-span-2")}>
      <span className="text-[10px] font-semibold text-foreground-secondary mb-1 block">{l}</span>
      {el}
    </label>
  )

  return (
    <details className="rounded-lg border border-border bg-muted/20 p-3 space-y-3" open={!saved}>
      <summary className="flex cursor-pointer items-center gap-2 list-none">
        <Mail size={14} className="text-muted-foreground" />
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <code className="text-[10px] text-muted-foreground">{purpose}</code>
        {row?.lastTestOk === true && <span className="flex items-center gap-1 text-[10px] text-success"><Check size={10} /> SMTP OK</span>}
        {row?.lastTestOk === false && <span className="flex items-center gap-1 text-[10px] text-destructive"><AlertTriangle size={10} /> SMTP eșuat</span>}
        {row && form.imapEnabled && (row.imapLastOk === false
          ? <span className="flex items-center gap-1 text-[10px] text-destructive"><AlertTriangle size={10} /> IMAP eroare</span>
          : <span className="flex items-center gap-1 text-[10px] text-success"><Download size={10} /> IMAP activ{row.imapLastSyncAt ? ` · ${new Date(row.imapLastSyncAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>)}
        <span className="hidden text-[10px] text-muted-foreground lg:inline truncate">{hint}</span>
        <label className="ml-auto flex items-center gap-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Trimitere activă
        </label>
      </summary>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {field("Nume afișat (în aplicație)", <input className={inputCls} value={form.label} onChange={(e) => set("label", e.target.value)} />)}
        {field("Nume expeditor", <input className={inputCls} value={form.fromName} onChange={(e) => set("fromName", e.target.value)} />)}
        {field("Adresă expeditor (From)", <input className={inputCls} type="email" value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="adresa@domeniu.ro" />)}
        {field("Reply-To (opțional)", <input className={inputCls} type="email" value={form.replyTo} onChange={(e) => set("replyTo", e.target.value)} placeholder="implicit = adresa expeditor" />)}
        {field("Copie ascunsă BCC (opțional)", <input className={inputCls} type="email" value={form.bcc} onChange={(e) => set("bcc", e.target.value)} />)}
        <div />
        <p className="sm:col-span-2 text-[11px] font-semibold text-foreground-secondary pt-1">Trimitere (SMTP)</p>
        {field("Server SMTP", <input className={inputCls} value={form.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} placeholder="mail.domeniu.ro" />)}
        <div className="grid grid-cols-2 gap-2.5">
          {field("Port", <input className={inputCls} type="number" value={form.smtpPort} onChange={(e) => set("smtpPort", Number(e.target.value))} />)}
          {field("Securizare", (
            <select className={inputCls} value={form.smtpSecure ? "ssl" : "starttls"} onChange={(e) => set("smtpSecure", e.target.value === "ssl")}>
              <option value="ssl">SSL/TLS (465)</option>
              <option value="starttls">STARTTLS (587)</option>
            </select>
          ))}
        </div>
        {field("Utilizator SMTP", <input className={inputCls} value={form.smtpUser} onChange={(e) => set("smtpUser", e.target.value)} autoComplete="off" />)}
        {field("Parolă SMTP", <input className={inputCls} type="password" value={form.smtpPass} onChange={(e) => set("smtpPass", e.target.value)} autoComplete="new-password" placeholder={row?.hasPassword ? "•••••••• (neschimbată)" : ""} />)}
        {field("Semnătură HTML (opțional)", <textarea className={cn(inputCls, "h-16 font-mono")} value={form.signatureHtml} onChange={(e) => set("signatureHtml", e.target.value)} />, true)}
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:col-span-2">
          <input type="checkbox" checked={form.allowSelfSigned} onChange={(e) => set("allowSelfSigned", e.target.checked)} />
          Acceptă certificat nevalidat (SMTP și IMAP; doar dacă serverul are certificat self-signed)
        </label>

        <div className="sm:col-span-2 flex items-center gap-3 pt-1">
          <p className="text-[11px] font-semibold text-foreground-secondary">Primire (IMAP)</p>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={form.imapEnabled} onChange={(e) => set("imapEnabled", e.target.checked)} /> Primire activă
          </label>
          <span className="text-[10px] text-muted-foreground">mesajele ajung pe lead/client după adresa expeditorului sau ca răspuns la un email trimis de noi; serverul rămâne neatins (doar citire)</span>
        </div>
        {field("Server IMAP", <input className={inputCls} value={form.imapHost} onChange={(e) => set("imapHost", e.target.value)} placeholder="mail.domeniu.ro" />)}
        <div className="grid grid-cols-2 gap-2.5">
          {field("Port", <input className={inputCls} type="number" value={form.imapPort} onChange={(e) => set("imapPort", Number(e.target.value))} />)}
          {field("Securizare", (
            <select className={inputCls} value={form.imapSecure ? "ssl" : "starttls"} onChange={(e) => set("imapSecure", e.target.value === "ssl")}>
              <option value="ssl">SSL/TLS (993)</option>
              <option value="starttls">STARTTLS (143)</option>
            </select>
          ))}
        </div>
        {field("Utilizator IMAP (gol = ca SMTP)", <input className={inputCls} value={form.imapUser} onChange={(e) => set("imapUser", e.target.value)} autoComplete="off" />)}
        {field("Parolă IMAP (goală = ca SMTP)", <input className={inputCls} type="password" value={form.imapPass} onChange={(e) => set("imapPass", e.target.value)} autoComplete="new-password" placeholder={row?.hasImapPassword ? "•••••••• (neschimbată)" : ""} />)}
        {field("Folder", <input className={inputCls} value={form.imapFolder} onChange={(e) => set("imapFolder", e.target.value)} />)}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={busy !== null} className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50">{busy === "save" ? "Se salvează…" : "Salvează"}</button>
        <input className={cn(inputCls, "w-52")} type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="trimite test la (opțional)" />
        <button onClick={test} disabled={busy !== null || !row?.hasPassword} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/70 rounded-lg disabled:opacity-50"><Send size={12} /> {busy === "test" ? "Se testează…" : "Testează SMTP"}</button>
        <button onClick={imapTest} disabled={busy !== null || !row?.imapHost} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/70 rounded-lg disabled:opacity-50"><Download size={12} /> {busy === "imap" ? "Se testează…" : "Testează IMAP"}</button>
        <button onClick={syncNow} disabled={busy !== null || !row?.imapEnabled} className="px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/70 rounded-lg disabled:opacity-50">{busy === "sync" ? "Se sincronizează…" : "Primește acum"}</button>
        {saved && <button onClick={remove} disabled={busy !== null} className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-destructive/80 hover:text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-lg"><Trash2 size={12} /> Șterge</button>}
      </div>
      {msg && <p className={cn("text-xs break-words", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</p>}
      {!msg && row?.lastTestOk === false && row.lastTestError && <p className="text-[11px] text-destructive break-words">SMTP: {row.lastTestError}</p>}
      {!msg && row?.imapLastOk === false && row.imapLastError && <p className="text-[11px] text-destructive break-words">IMAP: {row.imapLastError}</p>}
      <p className="text-[10px] text-muted-foreground">Testele folosesc setările salvate. Pentru ca mesajele trimise să nu ajungă în spam, domeniul adresei From trebuie să aibă SPF și DKIM pentru serverul SMTP.</p>
    </details>
  )
}
