"use client"

import { useEffect, useState } from "react"
import { Mail, Check, AlertTriangle, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Form {
  enabled: boolean
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
}

const EMPTY: Form = {
  enabled: false, fromName: "", fromEmail: "", replyTo: "", bcc: "", signatureHtml: "",
  smtpHost: "", smtpPort: 465, smtpSecure: true, smtpUser: "", smtpPass: "", allowSelfSigned: false,
}

const inputCls = "w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"

/** Own SMTP account and sender identity of one business line. Lines without a saved/enabled row keep using the default sender. */
export const MAILBOX_PURPOSES = [
  { key: "general", label: "General", hint: "office@ — oferte, rapoarte, corespondență curentă; folosită și când lipsește căsuța specifică", placeholder: "office@domeniu.ro" },
  { key: "orders", label: "Comenzi", hint: "comenzi@ — confirmări de comandă și mesaje către clienți", placeholder: "comenzi@domeniu.ro" },
  { key: "partners", label: "Parteneri", hint: "parteneri@ — propuneri de parteneriat și mesaje către service-uri", placeholder: "parteneri@domeniu.ro" },
] as const

export function MailSettingsCard({ businessLineId, lineName, purpose, label, hint, placeholder }: {
  businessLineId: string; lineName: string; purpose: string; label: string; hint: string; placeholder: string
}) {
  const [form, setForm] = useState<Form>({ ...EMPTY, fromName: lineName })
  const [hasPassword, setHasPassword] = useState(false)
  const [status, setStatus] = useState<{ at: string | null; ok: boolean | null; error: string | null }>({ at: null, ok: null, error: null })
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<"save" | "test" | null>(null)
  const [testTo, setTestTo] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/settings/business-lines/${businessLineId}/mail`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        const d = (j.data as any[] | undefined)?.find((x) => x.purpose === purpose)
        if (d) {
          setForm({ ...EMPTY, ...d, replyTo: d.replyTo ?? "", bcc: d.bcc ?? "", signatureHtml: d.signatureHtml ?? "", smtpPass: "" })
          setHasPassword(Boolean(d.hasPassword))
          setStatus({ at: d.lastTestAt, ok: d.lastTestOk, error: d.lastTestError })
        }
        setLoaded(true)
      })
      .catch(() => alive && setLoaded(true))
    return () => { alive = false }
  }, [businessLineId, purpose])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    setBusy("save"); setMsg(null)
    const res = await fetch(`/api/settings/business-lines/${businessLineId}/mail/${purpose}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, smtpPass: form.smtpPass || null }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      setMsg({ ok: false, text: j.details?.[0] ? `${j.details[0].path?.join(".")}: ${j.details[0].message}` : j.error || "Salvarea a eșuat" })
      return
    }
    setHasPassword(Boolean(j.data.hasPassword))
    set("smtpPass", "")
    setMsg({ ok: true, text: "Salvat" })
  }

  async function test() {
    setBusy("test"); setMsg(null)
    const res = await fetch(`/api/settings/business-lines/${businessLineId}/mail/${purpose}/test`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sendTo: testTo }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    setStatus({ at: new Date().toISOString(), ok: res.ok, error: res.ok ? null : j.error ?? null })
    setMsg(res.ok ? { ok: true, text: testTo ? `Conexiune reușită, test trimis la ${testTo}` : "Conexiune SMTP reușită" } : { ok: false, text: j.error || "Testul a eșuat" })
  }

  const field = (label: string, el: React.ReactNode, span = false) => (
    <label className={cn("block", span && "sm:col-span-2")}>
      <span className="text-[10px] font-semibold text-foreground-secondary mb-1 block">{label}</span>
      {el}
    </label>
  )

  return (
    <details className="rounded-lg border border-border bg-muted/20 p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      <summary className="flex cursor-pointer items-center gap-2 list-none">
        <Mail size={14} className="text-muted-foreground" />
        <p className="text-xs font-semibold text-foreground">Căsuță {label}</p>
        <span className="hidden text-[10px] text-muted-foreground sm:inline">{hint}</span>
        {status.ok === true && <span className="flex items-center gap-1 text-[10px] text-success"><Check size={10} /> testat OK</span>}
        {status.ok === false && <span className="flex items-center gap-1 text-[10px] text-destructive"><AlertTriangle size={10} /> ultimul test a eșuat</span>}
        <label className="ml-auto flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
          Activă
        </label>
      </summary>
      {!form.enabled && <p className="text-[11px] text-muted-foreground">Cât timp nu este activă, mesajele de acest tip pleacă din căsuța „General” a liniei sau, dacă nici aceasta nu e activă, din expeditorul implicit.</p>}

      {!loaded ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {field("Nume expeditor", <input className={inputCls} value={form.fromName} onChange={(e) => set("fromName", e.target.value)} />)}
          {field("Adresă expeditor (From)", <input className={inputCls} type="email" value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder={placeholder} />)}
          {field("Reply-To (opțional)", <input className={inputCls} type="email" value={form.replyTo} onChange={(e) => set("replyTo", e.target.value)} placeholder="implicit = adresa expeditor" />)}
          {field("Copie ascunsă BCC (opțional)", <input className={inputCls} type="email" value={form.bcc} onChange={(e) => set("bcc", e.target.value)} />)}
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
          {field("Parolă SMTP", <input className={inputCls} type="password" value={form.smtpPass} onChange={(e) => set("smtpPass", e.target.value)} autoComplete="new-password" placeholder={hasPassword ? "•••••••• (neschimbată)" : ""} />)}
          {field("Semnătură HTML (opțional)", <textarea className={cn(inputCls, "h-20 font-mono")} value={form.signatureHtml} onChange={(e) => set("signatureHtml", e.target.value)} />, true)}
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:col-span-2">
            <input type="checkbox" checked={form.allowSelfSigned} onChange={(e) => set("allowSelfSigned", e.target.checked)} />
            Acceptă certificat nevalidat (doar dacă serverul de mail are certificat self-signed)
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={busy !== null} className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
          {busy === "save" ? "Se salvează…" : "Salvează"}
        </button>
        <input className={cn(inputCls, "w-56")} type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="trimite test la (opțional)" />
        <button onClick={test} disabled={busy !== null || !hasPassword} title={hasPassword ? "" : "Salvează mai întâi parola"} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/70 rounded-lg disabled:opacity-50">
          <Send size={12} /> {busy === "test" ? "Se testează…" : "Testează conexiunea"}
        </button>
        {msg && <span className={cn("text-xs", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</span>}
      </div>
      {status.error && status.ok === false && <p className="text-[11px] text-destructive break-words">{status.error}</p>}
      <p className="text-[10px] text-muted-foreground">Testul folosește setările salvate. Pentru ca mesajele să nu ajungă în spam, domeniul adresei From trebuie să aibă SPF și DKIM pentru serverul SMTP ales.</p>
    </details>
  )
}
